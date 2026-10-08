const { guarded } = require('./numericGuard');

/**
 * Narration.
 *
 * The only place a language model is reachable, and it runs after
 * every fact is already fixed. Its job is wording, not content.
 *
 * If GEMINI_API_KEY is absent the system does not break — it
 * serves the deterministic template instead. That is not a
 * degraded mode bolted on for safety; it is the same text the
 * guard falls back to when the model misbehaves, which means the
 * fallback path is exercised constantly rather than only in an
 * emergency.
 */

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const hasKey = () => Boolean(process.env.GEMINI_API_KEY);

const LANG_NAME = { en: 'English', mr: 'Marathi', hi: 'Hindi' };

const pct = (v) => (v === null || v === undefined ? null : `${v}%`);

/**
 * The deterministic answer.
 *
 * Written to be genuinely usable on its own, because it is what a
 * farmer sees whenever the model is unavailable or the guard
 * rejects its output. A template that reads like an error message
 * would make every fallback feel like a failure.
 */
const templateFor = (facts, question, language = 'en') => {
  const lines = [];
  const a = facts.assessment;
  const w = facts.weather;
  const s = facts.sensing;
  const c = facts.crediting;
  const p = facts.parcel;

  if (p && !p.error && p.area) {
    lines.push(`${p.name}: ${p.area.hectares} ha (${p.area.acres} acre, ${p.area.guntha} guntha).`);
  }

  if (a && a.status === 'insufficient_data') {
    lines.push(`Not enough information to advise on this plot yet. Still needed: ${(a.missingCritical || []).join(', ')}.`);
  } else if (a && a.status === 'ok') {
    if (a.limitingFactor) {
      lines.push(`The limiting factor is ${a.limitingFactor.variable.replace(/_/g, ' ')} at ${a.limitingFactor.value}${a.limitingFactor.unit || ''}.`);
    }
    const first = (a.sequence || []).find((x) => x.stage === 1);
    if (first) lines.push(`Do first: ${first.name}. ${first.rationale}`);

    const deferred = (a.sequence || []).filter((x) => x.deferred);
    for (const d of deferred) {
      lines.push(`${d.name} is held back for now — ${d.revisitWhen}.`);
    }

    if ((a.eligibleClaims || []).length) {
      lines.push(`${a.eligibleClaims.length} study or studies match this plot's conditions.`);
    }
    if ((a.rejectedClaims || []).length) {
      // Surfaced, not hidden. A filter nobody can see is
      // indistinguishable from no filter at all.
      lines.push(`${a.rejectedClaims.length} were set aside because they were measured under different conditions.`);
    }
    if (a.confidence) {
      lines.push(`Confidence is limited mainly by ${a.confidence.limitedBy}.`);
    }
  }

  if (w && !w.error) {
    lines.push(`Rain: ${w.daysSinceRain} days since the last, ${w.rainNext7dMm} mm expected in the next week.`);
    if (w.drySpellAhead) lines.push('Little rain is forecast — plan water accordingly.');
  }

  if (s && s.stale) {
    lines.push('Field readings are more than two days old, so this may not reflect today.');
  }

  if (c) {
    if (c.status === 'no_samples' || c.status === 'awaiting_baseline') {
      lines.push(c.message);
    } else if (c.status === 'gaining') {
      lines.push(`Carbon has risen from ${c.baselineSoc}% to ${c.currentSoc}%, about ${c.creditableTco2e} tCO2e on ${c.areaHa} ha.`);
    } else {
      lines.push(`No carbon increase measured yet between ${c.baselineDate} and ${c.currentDate}.`);
    }
  }

  return lines.join(' ') || 'There is not enough information about this plot yet.';
};

const SYSTEM = `You rewrite an agricultural assessment for a smallholder farmer in India.

ABSOLUTE RULE: you may not introduce any number, measurement, date, percentage or
study identifier that is not already present in the data given to you. Do not
estimate, do not round to a different value, do not add typical or average figures.
If a number is not in the data, it must not appear in your answer.

Write plainly, as you would speak to someone with limited schooling. Short
sentences. No jargon: say "greenness" not NDVI, "soil carbon" not SOC. Do not
greet, do not sign off, do not offer to help further. Two to four sentences.`;

const callModel = async ({ facts, question, language, attempt, lastFailure }) => {
  const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

  const model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: MODEL,
    temperature: attempt === 1 ? 0.3 : 0,   // retry colder
    maxRetries: 1,
  });

  const correction = lastFailure
    ? `\n\nYour previous attempt was rejected for using values not present in the data: ${lastFailure.offending.map((o) => o.token).join(', ')}. Use only what is given.`
    : '';

  const res = await model.invoke([
    { role: 'system', content: SYSTEM + correction },
    {
      role: 'user',
      content:
        `Language: ${LANG_NAME[language] || 'English'}\n` +
        `Farmer asked: ${question || 'How is my field?'}\n\n` +
        `DATA (the only source of facts you may use):\n${JSON.stringify(facts, null, 1)}`,
    },
  ]);

  return typeof res.content === 'string'
    ? res.content
    : (res.content || []).map((c) => c.text || '').join(' ');
};

const narrate = async ({ facts, question, language, template }) => {
  if (!hasKey()) {
    return { text: template, mode: 'template_fallback', reason: 'GEMINI_API_KEY not set' };
  }

  return guarded(
    (attempt, lastFailure) => callModel({ facts, question, language, attempt, lastFailure }),
    facts,
    template,
    2
  );
};

module.exports = { narrate, templateFor, hasKey, MODEL };
