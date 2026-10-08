/**
 * Context matching — whether a claim transfers to this plot.
 *
 * This is the step the whole system turns on. A sequestration
 * rate measured on an irrigated clay at 1,100 mm of rainfall is
 * not evidence for a rainfed sandy loam at 450 mm. Advice that
 * carries the headline number across while dropping the
 * conditions is not merely imprecise — it can be inverted, and
 * recommending a water-demanding practice on a water-limited
 * field makes the farmer worse off in the season while promising
 * a carbon gain that will not arrive.
 */

// A mismatch on any of these removes the claim outright.
//
// Hard exclusion, not a discount, because the mechanism behind
// such a claim frequently does not operate outside the conditions
// that produced it. A scaled-down version of its effect size is
// not a conservative estimate — it is a fabricated one.
const CRITICAL_DIMENSIONS = ['rainfall_band', 'soil_texture', 'cropping_system'];

const SOFT_DIMENSIONS = ['zone', 'management'];

// A dimension the claim does not report is unknown, not satisfied.
// Scoring it at the midpoint means silence neither rewards nor
// penalises a claim.
const UNKNOWN_SCORE = 0.5;

/** Rainfall in mm to the band used by the evidence base. */
const rainfallBand = (mm) => {
  const v = Number(mm);
  if (!Number.isFinite(v)) return null;
  if (v < 750) return 'semi_arid';
  if (v < 1200) return 'sub_humid';
  return 'humid';
};

/** Local soil names to the texture classes claims are tagged with. */
const TEXTURE_OF_SOIL = {
  black: 'clay', clay: 'clay',
  red: 'sandy_loam', gravelly: 'sandy_loam',
  sandy: 'sandy', loam: 'loam',
};

/** Build the comparable shape of a site from its raw state. */
const siteContext = (siteState) => ({
  rainfall_band: siteState.rainfall_band || rainfallBand(siteState.annual_rainfall_mm),
  soil_texture: siteState.texture_class || TEXTURE_OF_SOIL[siteState.soil_type] || null,
  cropping_system: siteState.cropping_system || null,
  zone: siteState.zone || siteState.climate_zone || null,
  management: siteState.water_source === 'rainfed' ? 'rainfed' : 'irrigated',
});

/**
 * Match one claim against one site.
 *
 * Returns either an eligible claim with a soft score, or a
 * rejection carrying a reason written for a person to read —
 * because the rejected set is surfaced to farmer and buyer, and
 * an unexplained exclusion is no better than a silent one.
 */
const matchClaim = (claim, context) => {
  for (const dim of CRITICAL_DIMENSIONS) {
    const claimValue = claim[dim];
    const siteValue = context[dim];

    // A claim that does not state a critical condition is treated
    // as general rather than excluded. It simply earns no credit
    // for matching one either.
    if (!claimValue) continue;
    if (!siteValue) continue;

    if (String(claimValue) !== String(siteValue)) {
      return {
        eligible: false,
        claimId: claim.claim_id,
        dimension: dim,
        reason: reasonFor(dim, claimValue, siteValue),
      };
    }
  }

  let total = 0;
  const breakdown = {};
  for (const dim of [...CRITICAL_DIMENSIONS, ...SOFT_DIMENSIONS]) {
    const claimValue = claim[dim];
    const siteValue = context[dim];
    let s;
    if (!claimValue || !siteValue) s = UNKNOWN_SCORE;
    else s = String(claimValue) === String(siteValue) ? 1 : 0;
    breakdown[dim] = s;
    total += s;
  }

  const score = total / (CRITICAL_DIMENSIONS.length + SOFT_DIMENSIONS.length);

  return {
    eligible: true,
    claimId: claim.claim_id,
    contextScore: Number(score.toFixed(3)),
    breakdown,
    hasEffectSize: claim.effect_size !== null && claim.effect_size !== undefined,
  };
};

const LABEL = {
  rainfall_band: 'rainfall',
  soil_texture: 'soil type',
  cropping_system: 'cropping system',
};

const PRETTY = {
  semi_arid: 'semi-arid', sub_humid: 'sub-humid', humid: 'humid',
  mediterranean: 'Mediterranean',
  clay: 'clay', sandy: 'sandy', sandy_loam: 'sandy loam', loam: 'loam',
};

const show = (v) => PRETTY[v] || String(v).replace(/_/g, ' ');

const reasonFor = (dim, claimValue, siteValue) =>
  `Measured on ${show(claimValue)} ${LABEL[dim]}; this plot is ${show(siteValue)}.`;

/**
 * Partition a claim set for one site.
 */
const filterClaims = (claims, siteState) => {
  const context = siteContext(siteState);
  const eligible = [];
  const rejected = [];

  for (const claim of claims || []) {
    const result = matchClaim(claim, context);
    if (result.eligible) {
      eligible.push({ ...result, claim });
    } else {
      rejected.push({ ...result, statement: claim.statement });
    }
  }

  eligible.sort((a, b) => b.contextScore - a.contextScore);
  return { context, eligible, rejected };
};

module.exports = {
  CRITICAL_DIMENSIONS,
  SOFT_DIMENSIONS,
  UNKNOWN_SCORE,
  rainfallBand,
  siteContext,
  matchClaim,
  filterClaims,
};
