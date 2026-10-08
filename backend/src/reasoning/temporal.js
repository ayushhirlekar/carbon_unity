/**
 * Trends over the dated observation series.
 *
 * Level alone does not discriminate between competing
 * explanations of why a field underperforms; trajectory does. A
 * variable that is both deficient AND worsening is a better
 * explanation of present underperformance than one that is
 * deficient but recovering — and only a dated series can tell
 * those apart.
 */

// Applied to a driver's rank. A declining variable is weighted up,
// an improving one down, because the farmer is already fixing it.
const TAU = { declining: 1.25, stable: 0.85, improving: 0.6, unknown: 1.0 };

// Below this relative change per observation we call it stable
// rather than reading noise as a trend.
const NOISE_BAND = 0.05;

/**
 * Least-squares slope over (index, value). Index rather than real
 * time because observation spacing is irregular and we only need
 * the direction, not a rate.
 */
const slopeOf = (values) => {
  const n = values.length;
  if (n < 2) return null;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? null : num / den;
};

/**
 * Classify a series. Needs at least three readings: two points
 * are a line through noise, not a trend.
 */
const trendOf = (series) => {
  const values = (series || [])
    .map((o) => Number(o.value_num))
    .filter(Number.isFinite);

  if (values.length < 3) {
    return { direction: 'unknown', tau: TAU.unknown, points: values.length };
  }

  const slope = slopeOf(values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (slope === null || mean === 0) {
    return { direction: 'unknown', tau: TAU.unknown, points: values.length };
  }

  const relative = slope / Math.abs(mean);
  const direction =
    relative < -NOISE_BAND ? 'declining' :
    relative > NOISE_BAND ? 'improving' : 'stable';

  return {
    direction,
    tau: TAU[direction],
    slope: Number(slope.toFixed(5)),
    relativePerReading: Number(relative.toFixed(4)),
    points: values.length,
  };
};

/**
 * Group a flat observation list into one series per variable,
 * oldest first.
 */
const seriesByVariable = (observations) => {
  const out = {};
  for (const o of observations || []) {
    (out[o.variable] ||= []).push(o);
  }
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => new Date(a.observed_at) - new Date(b.observed_at));
  }
  return out;
};

const trendsFor = (observations) => {
  const series = seriesByVariable(observations);
  const trends = {};
  for (const [variable, rows] of Object.entries(series)) {
    trends[variable] = trendOf(rows);
  }
  return trends;
};

/**
 * Co-decline: two variables connected in the causal graph falling
 * together strengthens the hypothesis that the upstream one is
 * driving the downstream one.
 *
 * This is correlational and the system must not present it
 * otherwise. It nudges a ranking; it does not establish cause.
 */
const coDeclines = (trends, fromVar, toVar) =>
  trends[fromVar]?.direction === 'declining' &&
  trends[toVar]?.direction === 'declining';

module.exports = { trendOf, trendsFor, seriesByVariable, coDeclines, TAU };
