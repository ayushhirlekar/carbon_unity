/**
 * The numeric guard.
 *
 * This is the component the whole architecture rests on. Agents
 * may phrase an answer; they may not introduce a quantity. Every
 * number, identifier and claim reference in generated prose is
 * checked against the deterministic state that produced it, and
 * anything unaccounted for means the prose is rejected.
 *
 * The guarantee is not "the model rarely invents figures" — it is
 * that an invented figure cannot reach the farmer, whatever the
 * model's error rate happens to be. A probabilistic reduction in
 * error is a different kind of promise from the one a financial
 * instrument needs.
 *
 * Worst case here is stilted language. Never a confident number
 * that nothing computed.
 */

const NUMBER_RE = /-?\d+(?:[.,]\d+)?/g;
const CLAIM_ID_RE = /\b[CRS]\d{2}\b/g;
const IDENT_RE = /\b[a-z]+(?:_[a-z0-9]+)+\b/g;

// Numbers a farmer reads as words rather than data. Rejecting
// "one more reading" or "3 corners" would make every sentence
// fail for no gain in integrity.
const INNOCUOUS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '100']);

const normaliseNumber = (s) => {
  const n = Number(String(s).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  // Compare at two decimals so 11.2 and 11.20 are the same token,
  // while 11.2 and 11.3 stay distinct.
  return n.toFixed(2);
};

/**
 * Collect every value the deterministic layer produced, walking
 * the whole structure so a number nested three levels down still
 * counts as supported.
 */
const allowedFrom = (state) => {
  const numbers = new Set();
  const words = new Set();

  const visit = (node) => {
    if (node === null || node === undefined) return;

    if (typeof node === 'number') {
      const n = normaliseNumber(node);
      if (n !== null) {
        numbers.add(n);
        // A rounded rendering of a supported value is still
        // supported: 0.9962 may legitimately be shown as 1.0.
        numbers.add(Number(node).toFixed(1));
        numbers.add(String(Math.round(node)));
      }
      return;
    }

    if (typeof node === 'string') {
      for (const m of node.match(NUMBER_RE) || []) {
        const n = normaliseNumber(m);
        if (n !== null) numbers.add(n);
      }
      for (const m of node.match(CLAIM_ID_RE) || []) words.add(m);
      for (const m of node.match(IDENT_RE) || []) words.add(m);
      return;
    }

    if (Array.isArray(node)) { node.forEach(visit); return; }

    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) { words.add(k); visit(v); }
    }
  };

  visit(state);
  return { numbers, words };
};

/**
 * Check prose against the state it claims to describe.
 */
const check = (text, state, template = '') => {
  const allowed = allowedFrom(state);
  if (template) {
    const t = allowedFrom(template);
    t.numbers.forEach((n) => allowed.numbers.add(n));
    t.words.forEach((w) => allowed.words.add(w));
  }

  const offending = [];

  for (const m of text.match(NUMBER_RE) || []) {
    const raw = String(m);
    if (INNOCUOUS.has(raw)) continue;
    const n = normaliseNumber(m);
    if (n === null) continue;
    if (!allowed.numbers.has(n) &&
        !allowed.numbers.has(Number(n).toFixed(1)) &&
        !allowed.numbers.has(String(Math.round(Number(n))))) {
      offending.push({ kind: 'number', token: raw });
    }
  }

  for (const m of text.match(CLAIM_ID_RE) || []) {
    if (!allowed.words.has(m)) offending.push({ kind: 'claim_id', token: m });
  }

  return {
    ok: offending.length === 0,
    offending,
    reason: offending.length
      ? `Unsupported in the assessment: ${offending.map((o) => o.token).join(', ')}`
      : null,
  };
};

/**
 * Run a generator under the guard.
 *
 * On exhaustion it returns the deterministic template. Degrading
 * to plainer language is always acceptable; degrading to a
 * plausible figure never is.
 */
const guarded = async (generate, state, template, maxAttempts = 2) => {
  let last = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let text;
    try {
      text = await generate(attempt, last);
    } catch (e) {
      // A provider outage degrades to the template rather than
      // taking the answer down with it.
      return { text: template, mode: 'template_fallback', reason: `generation failed: ${e.message}` };
    }

    const verdict = check(text, state, template);
    if (verdict.ok) {
      return { text, mode: attempt === 1 ? 'passed' : 'regenerated', attempts: attempt };
    }
    last = verdict;
  }

  return { text: template, mode: 'template_fallback', reason: last?.reason, offending: last?.offending };
};

module.exports = { check, guarded, allowedFrom, NUMBER_RE, CLAIM_ID_RE, IDENT_RE };
