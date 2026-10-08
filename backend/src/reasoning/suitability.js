/**
 * Suitability scoring.
 *
 * Each observed variable is scored to [0,1] against stored
 * thresholds, where 0 is fully limiting and 1 is not constraining
 * at all. Thresholds are conditioned on agro-ecological zone, so
 * the same moisture reading scores differently in semi-arid and
 * sub-humid country — which is the point. A number is not a
 * diagnosis until you know where it was taken.
 */

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * Score one variable.
 *
 * Returns null rather than a number when the value is unknown.
 * A missing reading is NOT a zero: zero means "fully limiting",
 * which is a claim about the field, and we have no basis for it.
 */
const scoreVariable = (value, threshold) => {
  if (value === null || value === undefined || threshold == null) return null;
  const v = Number(value);
  if (!Number.isFinite(v)) return null;

  switch (threshold.kind) {
    case 'ramp': {
      const lo = Number(threshold.lo);
      const hi = Number(threshold.hi);
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo) return null;
      return clamp01((v - lo) / (hi - lo));
    }

    case 'band': {
      // An interior optimum — pH is the clear case. Distance from
      // the centre in either direction reduces suitability.
      const c = Number(threshold.centre);
      const w = Number(threshold.half_width);
      if (!Number.isFinite(c) || !Number.isFinite(w) || w === 0) return null;
      return clamp01(1 - Math.abs(v - c) / w);
    }

    case 'enum': {
      const map = threshold.enum_scores || {};
      const s = map[String(value)];
      return s === undefined ? null : clamp01(Number(s));
    }

    default:
      return null;
  }
};

/**
 * Score every variable we have both a reading and a threshold for.
 *
 * Variables with a threshold but no reading come back in
 * `missing`, and if they are marked critical the caller refuses
 * rather than guessing.
 */
const scoreSite = (siteState, thresholds) => {
  const scores = {};
  const missing = [];
  const missingCritical = [];

  for (const t of thresholds) {
    const raw = siteState[t.variable];
    const s = scoreVariable(raw, t);

    if (s === null) {
      missing.push(t.variable);
      if (t.critical) missingCritical.push(t.variable);
      continue;
    }

    scores[t.variable] = {
      variable: t.variable,
      value: Number(raw),
      unit: t.unit,
      score: Number(s.toFixed(4)),
      critical: t.critical,
      basis: t.basis,
    };
  }

  return { scores, missing, missingCritical };
};

/**
 * The limiting factor — von Liebig's law of the minimum.
 *
 * This is not a ranking convenience. Where one factor binds, the
 * marginal return to improving any other is small until the
 * binding one is relieved. That is why the limiting factor
 * governs the ORDER of recommendations and not merely their
 * priority, and why the UI shows one action rather than a list.
 */
const limitingFactor = (scores) => {
  const entries = Object.values(scores);
  if (entries.length === 0) return null;
  return entries.reduce((lowest, e) => (e.score < lowest.score ? e : lowest));
};

module.exports = { scoreVariable, scoreSite, limitingFactor, clamp01 };
