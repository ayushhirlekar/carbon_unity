/**
 * Causal path search and driver ranking.
 *
 * From an under-performing variable, search backwards through a
 * weighted directed graph to find what might be causing it.
 */

// Longer chains accumulate weight products so small they cannot be
// told apart from noise, and the mechanisms they describe are
// rarely actionable on a smallholding anyway.
const MAX_DEPTH = 3;

// Two drivers within this margin are not distinguishable by the
// data we hold. Picking one anyway would be inventing certainty.
const UNDER_DETERMINED_MARGIN = 0.1;

/** edges keyed by their destination, so we can walk backwards. */
const indexByTarget = (edges) => {
  const idx = {};
  for (const e of edges || []) (idx[e.to_var] ||= []).push(e);
  return idx;
};

/**
 * Every path reaching `target`, up to MAX_DEPTH. Support is the
 * product of edge weights — a long weak chain scores below a
 * short strong one, which is the behaviour we want.
 */
const pathsTo = (target, byTarget, depth = MAX_DEPTH, seen = new Set()) => {
  if (depth === 0) return [];
  const out = [];

  for (const edge of byTarget[target] || []) {
    if (seen.has(edge.from_var)) continue;          // no cycles
    const nextSeen = new Set(seen).add(edge.from_var);
    const weight = Number(edge.weight);

    out.push({
      driver: edge.from_var,
      support: weight,
      path: [edge.rel_id],
      direction: edge.direction,
    });

    for (const deeper of pathsTo(edge.from_var, byTarget, depth - 1, nextSeen)) {
      out.push({
        driver: deeper.driver,
        support: weight * deeper.support,
        path: [edge.rel_id, ...deeper.path],
        direction: deeper.direction,
      });
    }
  }

  return out;
};

/** Strongest path per distinct driver. */
const strongestPerDriver = (paths) => {
  const best = {};
  for (const p of paths) {
    if (!best[p.driver] || p.support > best[p.driver].support) best[p.driver] = p;
  }
  return Object.values(best);
};

/**
 * Rank candidate drivers of an under-performing variable.
 *
 *   rank = (1 - suitability) x path_support x tau
 *
 * How far the variable falls short, how well the graph supports
 * its influence, and whether it is getting worse. A variable that
 * is deficient and worsening outranks one that is deficient but
 * recovering — the farmer is already fixing the second.
 */
const rankDrivers = ({ target, edges, scores, trends }) => {
  const byTarget = indexByTarget(edges);
  const candidates = strongestPerDriver(pathsTo(target, byTarget));

  const ranked = candidates
    .map((c) => {
      const scored = scores[c.driver];
      // A driver we have no reading for cannot be ranked. It
      // becomes a measurement request instead of a guess.
      if (!scored) {
        return { driver: c.driver, rank: null, unmeasured: true, pathSupport: c.support, path: c.path };
      }

      const shortfall = 1 - scored.score;
      const trend = trends[c.driver] || { direction: 'unknown', tau: 1.0 };
      const rank = shortfall * c.support * trend.tau;

      return {
        driver: c.driver,
        value: scored.value,
        unit: scored.unit,
        suitability: scored.score,
        shortfall: Number(shortfall.toFixed(4)),
        pathSupport: Number(c.support.toFixed(4)),
        trend: trend.direction,
        tau: trend.tau,
        rank: Number(rank.toFixed(4)),
        path: c.path,
        unmeasured: false,
      };
    })
    .filter((d) => d.rank !== null || d.unmeasured);

  const measured = ranked.filter((d) => !d.unmeasured).sort((a, b) => b.rank - a.rank);
  const unmeasured = ranked.filter((d) => d.unmeasured);

  // Where the top two are too close to separate, say so and name
  // the reading that would settle it, rather than choosing.
  let underDetermined = null;
  if (measured.length >= 2) {
    const [a, b] = measured;
    if (a.rank - b.rank < UNDER_DETERMINED_MARGIN) {
      underDetermined = {
        between: [a.driver, b.driver],
        margin: Number((a.rank - b.rank).toFixed(4)),
        discriminatingMeasurement: b.driver,
        note: 'These two explain the problem about equally well with the data held.',
      };
    }
  }

  return { ranked: measured, unmeasured, underDetermined };
};

module.exports = { rankDrivers, pathsTo, indexByTarget, MAX_DEPTH, UNDER_DETERMINED_MARGIN };
