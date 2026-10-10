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

/**
 * Model selection.
 *
 * Pinned to a named version so moving to a new model is a decision
 * someone makes, not something that happens to the pilot overnight.
 *
 * The cascade exists because the previous pin, gemini-2.0-flash,
 * was retired by Google and every answer silently became a
 * template for days. Nobody noticed, because the fallback was
 * built to be invisible. Invisible is right when the key is
 * absent and wrong when the configuration is broken, so a retired
 * pin now reports itself in the response reason.
 *
 * Measured against a live key on 2026-10-09: 3.5-flash answered,
 * 3.8-flash and flash-latest were valid but returning 503, and
 * both 2.0-flash and 2.5-flash were gone. Hence this order.
 */
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const MODEL_CHAIN = [MODEL, 'gemini-3.8-flash', 'gemini-flash-latest']
  .filter((m, i, all) => all.indexOf(m) === i);

const hasKey = () => Boolean(process.env.GEMINI_API_KEY);

/**
 * Google reports two failures that mean different things.
 *
 * A 404 is permanent: that model is gone and the pin needs
 * changing. A 503 or 429 is the model being busy and says nothing
 * about our configuration. Both advance to the next candidate, but
 * only the first is a defect worth surfacing to anyone.
 */
const classifyFailure = (err) => {
  const m = String((err && err.message) || '');

  // Quota is checked FIRST and is its own class. It is an account
  // limit, not a property of the model, so advancing to the next
  // candidate cannot help — it just spends two more calls against
  // a limit already reached. Classified as "busy" this turned one
  // question into six API calls on a free tier, which is how the
  // day's allowance disappeared.
  if (/\b429\b|RESOURCE_EXHAUSTED|exceeded your current quota|quota/i.test(m)) return 'quota';

  if (/\b404\b|NOT_FOUND|no longer available/i.test(m)) return 'retired';
  if (/\b503\b|UNAVAILABLE|overloaded|high demand/i.test(m)) return 'busy';
  return 'other';
};

/**
 * Thrown when the day's allowance is gone.
 *
 * A distinct type so the guard can decline to retry: rewording the
 * prompt costs another call against a limit that has already been
 * hit, and the answer would be no better for it.
 */
class QuotaExhaustedError extends Error {
  constructor(detail) {
    super(detail || 'Gemini quota exhausted');
    this.name = 'QuotaExhaustedError';
    this.quotaExhausted = true;
  }
}

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
  const a = facts.assessment;
  const w = facts.weather;
  const s = facts.sensing;
  const c = facts.crediting;
  const p = facts.parcel;

  const parts = [];

  /**
   * The deterministic answer.
   *
   * This is not an error path. It is what a farmer reads whenever
   * the model is unreachable, out of quota, or caught inventing a
   * figure — which on a free tier is often — so it has to read
   * like something a person wrote.
   *
   * The previous version emitted one sentence per available fact,
   * in the order the facts happened to be assembled, which
   * produced lines like "6 study or studies match this plot's
   * conditions." Correct, and obviously machine output.
   *
   * Two rules here: lead with the ACTION rather than the
   * diagnosis, because that is what the farmer came for; and spell
   * small counts as words, because digits in prose are what make
   * it read like a status line. Every figure is still exactly what
   * the engine produced — the wording changes, never the number.
   */

  const COUNT_WORD = ['no', 'one', 'two', 'three', 'four', 'five',
    'six', 'seven', 'eight', 'nine', 'ten'];
  const count = (n) => (n <= 10 ? COUNT_WORD[n] : String(n));
  const plural = (n, one, many) => `${count(n)} ${n === 1 ? one : many}`;

  // --- not enough to say anything -------------------------------
  if (a && a.status === 'insufficient_data') {
    const missing = (a.missingCritical || []).map((m) => m.replace(/_/g, ' '));
    parts.push(
      missing.length
        ? `There is not enough information about this plot yet to advise you. ` +
          `What is missing is ${missing.join(' and ')} — once that is recorded, ` +
          `this becomes a proper answer.`
        : 'There is not enough information about this plot yet to advise you.'
    );
  }

  // --- the main advisory ----------------------------------------
  if (a && a.status === 'ok') {
    const lf = a.limitingFactor;
    const first = (a.sequence || []).find((x) => x.stage === 1);

    // Action first.
    if (first && lf) {
      parts.push(
        `Start with ${first.name.toLowerCase()}. ` +
        `What is holding this plot back most is ${lf.variable.replace(/_/g, ' ')}, ` +
        `at ${lf.value}${lf.unit || ''}, and nothing else you do will show its full ` +
        `effect until that improves.`
      );
      // The engine's rationale for stage 1 is often just "X is the
      // binding constraint", which the sentence above has already
      // said at more length. Repeating it reads like a machine
      // padding its answer, so it is only added when it carries
      // something the lead did not.
      const lfWords = lf.variable.replace(/_/g, ' ');
      const restatesLead = first.rationale
        && first.rationale.toLowerCase().includes(lfWords)
        && first.rationale.length < 70;
      if (first.rationale && !restatesLead) parts.push(first.rationale);
    } else if (first) {
      parts.push(`Start with ${first.name.toLowerCase()}.${first.rationale ? ` ${first.rationale}` : ''}`);
    } else if (lf) {
      parts.push(
        `What is holding this plot back most is ${lf.variable.replace(/_/g, ' ')}, ` +
        `at ${lf.value}${lf.unit || ''}.`
      );
    }

    // What is waiting, and on what. A deferral that is stated
    // reads as considered; one that is silently omitted reads as
    // arbitrary.
    const deferred = (a.sequence || []).filter((x) => x.deferred);
    if (deferred.length === 1) {
      parts.push(`${deferred[0].name} is worth doing later — ${deferred[0].revisitWhen}.`);
    } else if (deferred.length > 1) {
      parts.push(
        `${deferred.map((d) => d.name).join(' and ')} are worth doing later, ` +
        `once ${deferred[0].revisitWhen}.`
      );
    }

    // Evidence, including what was refused.
    const eligible = (a.eligibleClaims || []).length;
    const rejected = (a.rejectedClaims || []).length;
    if (eligible && rejected) {
      parts.push(
        `This rests on ${plural(eligible, 'study', 'studies')} measured in conditions like ` +
        `yours; ${plural(rejected, 'other was', 'others were')} set aside because they were ` +
        `measured somewhere too different to rely on here.`
      );
    } else if (eligible) {
      parts.push(`This rests on ${plural(eligible, 'study', 'studies')} measured in conditions like yours.`);
    } else if (rejected) {
      parts.push(
        `No study in the evidence base matches this plot's conditions closely enough to ` +
        `rely on — ${plural(rejected, 'one was', 'were')} set aside as measured somewhere too different.`
      );
    }

    if (a.confidence?.limitedBy) {
      parts.push(`The weakest part of this answer is the ${a.confidence.limitedBy}.`);
    }
  }

  // --- water ------------------------------------------------------
  if (w && !w.error) {
    const rain = w.rainNext7dMm;
    const since = w.daysSinceRain;
    if (since !== undefined && rain !== undefined) {
      parts.push(
        `It has been ${plural(since, 'day', 'days')} since the last rain, and ${rain} mm is ` +
        `forecast for the coming week` +
        (w.drySpellAhead ? ', which will not be enough — plan to water the crop.' : '.')
      );
    }
  }

  // --- how current this is ----------------------------------------
  if (s && s.stale) {
    parts.push('These readings are more than two days old, so they may not reflect the field today.');
  }

  // --- carbon -------------------------------------------------------
  if (c) {
    if (c.status === 'no_samples' || c.status === 'awaiting_baseline') {
      if (c.message) parts.push(c.message);
    } else if (c.status === 'gaining') {
      parts.push(
        `Your soil carbon has risen from ${c.baselineSoc}% to ${c.currentSoc}%, which is about ` +
        `${c.creditableTco2e} tCO2e across ${c.areaHa} ha.`
      );
    } else if (c.baselineDate && c.currentDate) {
      parts.push(`No increase in soil carbon has been measured between ${c.baselineDate} and ${c.currentDate}.`);
    }
  }

  // --- the plot itself, only when nothing else was said -------------
  // Area is context, not an answer. It leads only when there is
  // nothing else, which is also the case where the farmer most
  // needs to be told what to do about it.
  if (!parts.length && p && !p.error && p.area) {
    parts.push(
      `This is ${p.name}, ${p.area.hectares} ha (${p.area.acres} acre, ${p.area.guntha} guntha). ` +
      `There are no field readings for it yet, so there is nothing to judge its condition on. ` +
      `Adding a Soil Health Card, or connecting a sensor, is what turns this into advice.`
    );
  }

  return parts.join(' ') || 'There is not enough information about this plot yet.';
};

const SYSTEM = `You are a trusted agricultural advisor helping a smallholder farmer in India.
You have been given a structured assessment of their specific field — soil readings, weather, and scientific evidence — and must answer their question based only on this data.

ABSOLUTE RULE: You may not introduce any number, measurement, date, percentage or
study identifier that is not already present in the DATA block given to you. Do not
estimate, do not round to a different value, do not add typical or average figures.
If a number is not in the data, it must not appear in your answer.

TONE RULES:
- Write in plain, warm language — as a trusted neighbour who knows farming would speak.
- Short, clear sentences. No jargon: say "soil carbon" not SOC, "moisture" not VWC, "crop vigour" not NDVI.
- Be specific and actionable. If a limiting factor is identified, say what to do about it first, and why.
- If data is missing, honestly say what is unknown and what the farmer should measure next.
- Do not greet, do not sign off, do not offer to help further.
- 3 to 6 sentences. Lead with the most important insight, then support it.`;

// Set when a candidate in the chain turns out to be retired, so the
// caller can report a dead pin instead of swallowing it. Module
// scope rather than threaded through the guard: the guard's job is
// numbers, and giving it a second concern to carry would be the
// wrong place to put this.
let lastModelNotice = null;

/**
 * Added for the unprompted morning report.
 *
 * A report is not a reply: nobody asked anything, so there is no
 * question to answer and the shape has to carry its own order —
 * what changed, what it means, what to do. Same guard, same data,
 * different job.
 */
const REPORT_SYSTEM = `You are writing a short morning field report for a smallholder farmer in India.
Nobody asked a question. You are telling them what their own field looks like today.

ABSOLUTE RULE: You may not introduce any number, measurement, date, percentage or
study identifier that is not already present in the DATA block given to you. Do not
estimate, do not round to a different value, do not add typical or average figures.
If a number is not in the data, it must not appear in your report.

SHAPE:
- Open with what matters most today, not a greeting and not a summary of everything.
- Say what changed since the last readings, if the data shows a change.
- Name the one thing to do first, and why it is first.
- If a sensor is offline or stuck, say so plainly — advice built on stale readings
  must be flagged as such.
- If the data is simulated, say that the readings are from a test device.
- 4 to 7 sentences. Plain words: "soil carbon" not SOC, "moisture" not VWC.
- No greeting, no sign-off, no offer to help further.`;

const historyBlock = (history) => {
  if (!Array.isArray(history) || !history.length) return '';

  // Last few turns only. This is here so a follow-up like "and
  // what about the other plot?" has something to refer back to,
  // not so the model can mine old figures — the guard still admits
  // only what is in the current DATA block.
  const recent = history.slice(-6)
    .map((m) => `${m.role === 'user' ? 'Farmer' : 'You'}: ${String(m.content || '').slice(0, 400)}`)
    .join('\n');

  return `\n\nEARLIER IN THIS CONVERSATION (for context and wording only — ` +
         `do not reuse any figure from here unless it also appears in DATA):\n${recent}`;
};

const callModel = async ({ facts, question, language, attempt, lastFailure, history, intent }) => {
  const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

  const systemPrompt = intent === 'daily_report' ? REPORT_SYSTEM : SYSTEM;

  const correction = lastFailure
    ? `\n\nYour previous attempt was rejected for using values not present in the data: ${lastFailure.offending.map((o) => o.token).join(', ')}. Use only what is given.`
    : '';

  const messages = [
    { role: 'system', content: systemPrompt + correction },
    {
      role: 'user',
      content:
        `Language: ${LANG_NAME[language] || 'English'}\n` +
        (intent === 'daily_report'
          ? 'Write the morning report for this field.\n'
          : `Farmer asked: ${question || 'How is my field?'}\n`) +
        historyBlock(history) +
        `\n\nDATA (the only source of facts you may use):\n${JSON.stringify(facts, null, 1)}`,
    },
  ];

  const problems = [];

  for (const candidate of MODEL_CHAIN) {
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: candidate,
      temperature: attempt === 1 ? 0.3 : 0,   // retry colder
      maxRetries: 1,
    });

    try {
      const res = await model.invoke(messages);

      // A retired pin still produced an answer, via a later
      // candidate. Record it anyway — it is a configuration defect
      // that happens to be survivable, and surviving quietly is
      // how it went unnoticed last time.
      if (problems.some((p) => p.cause === 'retired')) {
        lastModelNotice = {
          reason: 'modelRetired',
          detail: `${problems[0].model} is retired; answered with ${candidate}`,
        };
      }

      return typeof res.content === 'string'
        ? res.content
        : (res.content || []).map((c) => c.text || '').join(' ');
    } catch (err) {
      const cause = classifyFailure(err);
      problems.push({ model: candidate, cause });

      // Out of quota: stop here. The limit belongs to the account,
      // so every remaining candidate would fail the same way.
      if (cause === 'quota') {
        lastModelNotice = {
          reason: 'quota_exhausted',
          detail: 'the daily Gemini quota has been reached',
        };
        throw new QuotaExhaustedError(lastModelNotice.detail);
      }

      // Anything that is not the model being gone or busy is a real
      // error — a bad key, a network failure, a malformed request.
      // Trying the next model would only hide it.
      if (cause === 'other') throw err;
    }
  }

  const retired = problems.filter((p) => p.cause === 'retired').map((p) => p.model);
  lastModelNotice = retired.length
    ? { reason: 'modelRetired', detail: `retired: ${retired.join(', ')}; remaining candidates busy` }
    : { reason: 'all_models_busy', detail: MODEL_CHAIN.join(', ') };

  throw new Error(lastModelNotice.detail);
};

const narrate = async ({ facts, question, language, template, history, intent }) => {
  if (!hasKey()) {
    return { text: template, mode: 'template_fallback', reason: 'GEMINI_API_KEY not set' };
  }

  lastModelNotice = null;

  const result = await guarded(
    (attempt, lastFailure) =>
      callModel({ facts, question, language, attempt, lastFailure, history, intent }),
    facts,
    template,
    2
  );

  // The guard decides whether the prose is usable; this only adds
  // what went wrong reaching a model. Attached rather than merged
  // into `reason` so a misconfiguration is never mistaken for the
  // guard having rejected a number.
  if (lastModelNotice) {
    return { ...result, modelNotice: lastModelNotice.reason, modelDetail: lastModelNotice.detail };
  }

  return result;
};

module.exports = { narrate, templateFor, hasKey, MODEL, MODEL_CHAIN, classifyFailure };
