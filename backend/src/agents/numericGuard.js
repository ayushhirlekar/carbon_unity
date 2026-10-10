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

/**
 * Indic digits, folded to ASCII before anything is extracted.
 *
 * This is not a nicety. JavaScript's \d matches ASCII 0-9 only, so
 * a Marathi answer written with Devanagari numerals — which is what
 * the model naturally produces, and what a farmer should read —
 * contained no numbers as far as the guard could see. Every figure
 * in it passed unchecked, including invented ones. Verified: an
 * invented "99%" was blocked while an invented "९९%" was served.
 *
 * So the guarantee at the top of this file held in English and was
 * false in both languages most of these farmers actually read.
 *
 * The fold is applied only to the copy used for CHECKING. The text
 * served to the farmer keeps its native numerals, because rendering
 * १४.५% to a Marathi reader is correct localisation, and the point
 * is to verify that figure, not to anglicise it.
 *
 * Devanagari covers Marathi and Hindi, the two non-English
 * languages this platform ships. Gujarati and Bengali are included
 * because they cost one line each and a wrong guess here fails
 * silently rather than loudly.
 */
const DIGIT_FOLD = (() => {
  const map = new Map();
  const ranges = [
    0x0966, // Devanagari  ० - ९   (Marathi, Hindi)
    0x0AE6, // Gujarati    ૦ - ૯
    0x09E6, // Bengali     ০ - ৯
  ];
  for (const base of ranges) {
    for (let d = 0; d <= 9; d += 1) map.set(String.fromCodePoint(base + d), String(d));
  }
  return map;
})();

const INDIC_DIGIT_RE = new RegExp(`[${[...DIGIT_FOLD.keys()].join('')}]`, 'g');

// Devanagari danda and the Arabic decimal separator do not appear
// in numbers here, so only the digits themselves are folded.
const foldDigits = (s) =>
  String(s).replace(INDIC_DIGIT_RE, (ch) => DIGIT_FOLD.get(ch) || ch);

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
      // Folded because the template is localised prose: a Marathi
      // template legitimately carries १४.५%, and that figure must
      // be recognised as supported rather than treated as absent.
      const folded = foldDigits(node);
      for (const m of folded.match(NUMBER_RE) || []) {
        const n = normaliseNumber(m);
        if (n !== null) numbers.add(n);
      }
      for (const m of folded.match(CLAIM_ID_RE) || []) words.add(m);
      for (const m of node.match(IDENT_RE) || []) words.add(m);
      return;
    }

    if (Array.isArray(node)) {
      // The SIZE of a collection the engine produced is itself a
      // fact the engine produced. "Six studies match" is true and
      // checkable, and without this the model would be rejected
      // for stating it correctly — the template says "six" in
      // words, so the digit is not otherwise in the allowed set.
      // Counts up to ten are already innocuous; this covers the
      // rest as the evidence base grows.
      numbers.add(normaliseNumber(node.length));
      node.forEach(visit);
      return;
    }

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

  // Folding is a per-character 1:1 substitution of BMP code points,
  // so the folded string has the same length and the same indices
  // as the original. That lets the check run on ASCII while the
  // token reported back is the text the model actually wrote —
  // telling it "99 is unsupported" when it wrote ९९ would make the
  // correction prompt describe something absent from its output.
  const folded = foldDigits(text);

  for (const m of folded.matchAll(NUMBER_RE)) {
    const ascii = String(m[0]);
    const raw = text.slice(m.index, m.index + ascii.length);
    if (INNOCUOUS.has(ascii)) continue;
    const n = normaliseNumber(ascii);
    if (n === null) continue;
    if (!allowed.numbers.has(n) &&
        !allowed.numbers.has(Number(n).toFixed(1)) &&
        !allowed.numbers.has(String(Math.round(Number(n))))) {
      offending.push({ kind: 'number', token: raw });
    }
  }

  for (const m of folded.matchAll(CLAIM_ID_RE)) {
    const ascii = String(m[0]);
    if (!allowed.words.has(ascii)) {
      offending.push({ kind: 'claim_id', token: text.slice(m.index, m.index + ascii.length) });
    }
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
      //
      // Quota is flagged separately. "We could not reach a model"
      // and "today's allowance is spent" look identical in a
      // message string and mean different things to whoever is
      // reading the answer, so the distinction travels as data.
      return {
        text: template,
        mode: 'template_fallback',
        reason: `generation failed: ${e.message}`,
        quotaExhausted: Boolean(e && e.quotaExhausted),
      };
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
