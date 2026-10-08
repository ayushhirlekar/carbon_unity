const { StateGraph, Annotation, START, END } = require('@langchain/langgraph');
const tools = require('./tools');
const { narrate, templateFor } = require('./narrator');

/**
 * The agent graph.
 *
 * A supervisor routes a farmer's question to the agents that can
 * answer it, each agent gathers facts through its tools, and a
 * single narrator turns the assembled state into prose behind the
 * numeric guard.
 *
 * Two deliberate properties:
 *
 *  1. Routing is DETERMINISTIC. Intent is classified by keyword
 *     before any model is consulted. A supervisor that asked an
 *     LLM which agents to run would cost an extra round trip per
 *     question and would rate-limit on a free tier long before it
 *     earned its keep.
 *
 *  2. Only the narrator touches a language model, and only after
 *     every number already exists. Deleting the model leaves the
 *     facts in `state` completely unchanged.
 */

const AgentState = Annotation.Root({
  farmId: Annotation,
  question: Annotation,
  language: Annotation,
  intents: Annotation({ reducer: (a, b) => b ?? a, default: () => [] }),
  facts: Annotation({ reducer: (a, b) => ({ ...a, ...b }), default: () => ({}) }),
  agentsUsed: Annotation({ reducer: (a, b) => [...new Set([...(a || []), ...(b || [])])], default: () => [] }),
  answer: Annotation,
  guardStatus: Annotation,
});

/**
 * Intent classification, by keyword.
 *
 * Crude on purpose. Getting this slightly wrong costs one extra
 * tool call; getting it wrong via an LLM costs a round trip and a
 * rate-limit slot.
 */
const INTENT_WORDS = {
  weather: ['rain', 'weather', 'forecast', 'dry', 'irrigate', 'irrigation', 'water', 'पाऊस', 'पानी', 'बारिश'],
  sensing: ['moisture', 'reading', 'sensor', 'data', 'measurement', 'ओलावा', 'नमी'],
  crediting: ['credit', 'carbon', 'earn', 'money', 'payment', 'claim', 'कार्बन', 'पैसा'],
  agronomy: ['why', 'what should', 'advice', 'yield', 'soil', 'improve', 'practice', 'काय', 'क्या', 'सल्ला'],
  parcel: ['area', 'size', 'plot', 'field', 'boundary', 'hectare', 'acre', 'guntha', 'क्षेत्र'],
};

const classify = (question) => {
  const q = (question || '').toLowerCase();
  const hits = Object.entries(INTENT_WORDS)
    .filter(([, words]) => words.some((w) => q.includes(w)))
    .map(([intent]) => intent);

  // A question we cannot place gets the full picture rather than
  // a guess at what was meant.
  return hits.length ? hits : ['agronomy', 'sensing', 'crediting'];
};

// --- nodes -------------------------------------------------------

const supervisor = async (state) => ({ intents: classify(state.question) });

const makeNode = (name, tool, key) => async (state) => {
  if (!state.intents.includes(name)) return {};
  try {
    return { facts: { [key]: await tool(state.farmId) }, agentsUsed: [name] };
  } catch (e) {
    // A failed agent degrades the answer; it does not fail it.
    return { facts: { [key]: { error: e.message } }, agentsUsed: [name] };
  }
};

const sensingAgent   = makeNode('sensing',   tools.sensingTool,   'sensing');
const weatherAgent   = makeNode('weather',   tools.weatherTool,   'weather');
const agronomyAgent  = makeNode('agronomy',  tools.agronomyTool,  'assessment');
const creditingAgent = makeNode('crediting', tools.creditingTool, 'crediting');
const parcelAgent    = makeNode('parcel',    tools.parcelTool,    'parcel');

/**
 * Narration — the only node that may call a model, and it runs
 * after every fact is already fixed.
 */
const narrator = async (state) => {
  const template = templateFor(state.facts, state.question, state.language);
  const result = await narrate({
    facts: state.facts,
    question: state.question,
    language: state.language || 'en',
    template,
  });
  return { answer: result.text, guardStatus: result.mode, agentsUsed: ['narrator'] };
};

// --- graph -------------------------------------------------------

const build = () => {
  const g = new StateGraph(AgentState)
    .addNode('supervisor', supervisor)
    .addNode('sensing', sensingAgent)
    .addNode('weather', weatherAgent)
    .addNode('agronomy', agronomyAgent)
    .addNode('crediting', creditingAgent)
    .addNode('parcel', parcelAgent)
    .addNode('narrator', narrator);

  g.addEdge(START, 'supervisor');

  // Fanned out in parallel from the supervisor. Each node exits
  // immediately when its intent was not selected, so the cost of
  // a wide fan-out is a few no-op function calls rather than
  // five tool round trips.
  for (const n of ['sensing', 'weather', 'agronomy', 'crediting', 'parcel']) {
    g.addEdge('supervisor', n);
    g.addEdge(n, 'narrator');
  }

  g.addEdge('narrator', END);
  return g.compile();
};

let compiled = null;
const getGraph = () => (compiled ||= build());

const ask = async ({ farmId, question, language = 'en' }) => {
  const result = await getGraph().invoke({ farmId, question, language });
  return {
    answer: result.answer,
    guardStatus: result.guardStatus,
    agentsUsed: result.agentsUsed,
    intents: result.intents,
    facts: result.facts,
  };
};

module.exports = { ask, classify, build, getGraph };
