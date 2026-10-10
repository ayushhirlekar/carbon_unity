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

  // 'daily_report' when the Watchdog's morning job drove this
  // rather than a farmer asking something.
  intent: Annotation,

  /**
   * Prior turns of this conversation.
   *
   * This is the system's memory across sessions, and it is read
   * from `agent_messages` — which the agent controller already
   * writes — rather than from a LangGraph checkpointer.
   *
   * A checkpointer serialises graph EXECUTION so a run can be
   * resumed mid-flight, which is what human-in-the-loop interrupts
   * need and this graph does not have: it fans out once and
   * finishes. Conversational continuity is a different problem,
   * solved by putting earlier turns in state. Using the existing
   * tables also means no second source of truth, no direct
   * Postgres connection string to protect, and no coupling to a
   * checkpointer interface across LangGraph versions.
   *
   * History is context for WORDING only. The guard still builds
   * its allowed set from `facts` alone, so a figure quoted from
   * last week cannot reappear as though it were current — which
   * is the correct behaviour, not a limitation.
   */
  history: Annotation({ reducer: (a, b) => b ?? a, default: () => [] }),
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

// Everything, for the unprompted morning report. Nobody asked a
// question, so there is no intent to infer and no basis for
// narrowing: the report covers the field.
const ALL_INTENTS = ['sensing', 'weather', 'agronomy', 'crediting', 'parcel'];

/**
 * Words that mean "tell me what to do" or "why is this happening".
 * Either needs the reasoning engine, not just a data lookup.
 */
const ADVISORY_WORDS = [
  'why', 'what should', 'should i', 'how do i', 'how can i', 'advice', 'improve',
  'increase', 'better', 'fix', 'problem', 'doing', 'state of', 'health',
  'काय', 'कसे', 'क्या', 'कैसे', 'सल्ला',
];

const classify = (question, intent) => {
  if (intent === 'daily_report') return ALL_INTENTS;

  const q = (question || '').toLowerCase();
  const hits = new Set(
    Object.entries(INTENT_WORDS)
      .filter(([, words]) => words.some((w) => q.includes(w)))
      .map(([name]) => name)
  );

  /**
   * Sensing always runs.
   *
   * Keyword matching picks ONE topic well and starves everything
   * else: "How is my field doing?" matched 'field' in the parcel
   * list and routed to the parcel agent alone, so the narrator was
   * handed an area in hectares and no readings — and correctly
   * reported that it could not see how the field was performing,
   * while the sidebar displayed a moisture value it had never been
   * given.
   *
   * Almost no question about a field can be answered without its
   * current readings, and a non-selected agent costs one no-op
   * function call. So this is not a guess at intent; it is the
   * floor below which an answer is not worth producing.
   */
  hits.add('sensing');

  // "What should I do", "why is X happening" — these need the
  // engine's ordering, not a value read off the latest row.
  if (ADVISORY_WORDS.some((w) => q.includes(w))) hits.add('agronomy');

  // Asking about water without the forecast gives advice that
  // ignores the rain arriving tomorrow.
  if (hits.has('weather')) hits.add('agronomy');

  // A question we cannot place at all gets the full picture rather
  // than a guess at what was meant.
  if (hits.size === 1) return ['agronomy', 'sensing', 'crediting'];

  return [...hits];
};

// --- nodes -------------------------------------------------------

const supervisor = async (state) => ({ intents: classify(state.question, state.intent) });

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
    history: state.history,
    intent: state.intent,
  });
  return {
    answer: result.text,
    guardStatus: result.mode,
    agentsUsed: ['narrator'],
    modelNotice: result.modelNotice || null,
  };
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

const ask = async ({ farmId, question, language = 'en', history = [], intent = null }) => {
  const result = await getGraph().invoke({ farmId, question, language, history, intent });
  return {
    answer: result.answer,
    guardStatus: result.guardStatus,
    agentsUsed: result.agentsUsed,
    intents: result.intents,
    facts: result.facts,
    modelNotice: result.modelNotice || null,
  };
};

/**
 * Answer-shaped state for the morning report.
 *
 * No question, every agent, and a prompt that asks for a brief
 * rather than a reply. Goes through the same graph and the same
 * guard as a farmer's question, because a report nobody asked for
 * should be held to the standard of one that was.
 */
const dailyReport = async ({ farmId, language = 'en' }) =>
  ask({
    farmId,
    question: null,
    language,
    intent: 'daily_report',
  });

module.exports = { ask, dailyReport, classify, build, getGraph, ALL_INTENTS };
