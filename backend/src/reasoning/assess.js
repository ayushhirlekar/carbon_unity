const { supabaseAdmin } = require('../config/supabase');
const { scoreSite, limitingFactor } = require('./suitability');
const { trendsFor } = require('./temporal');
const { filterClaims, siteContext } = require('./contextMatch');
const { rankDrivers } = require('./causal');

/**
 * The reasoning engine.
 *
 * Consumes a site state and the evidence base, returns a typed
 * Assessment. Contains NO model call of any kind, by design: every
 * number a farmer or buyer sees is produced here, deterministically,
 * and can be replayed. The language layer only renders what this
 * produced.
 *
 * The property being defended: deleting the language model entirely
 * would leave every quantity in the system unchanged.
 */

/** Load thresholds, claims, edges and interventions for a zone. */
const loadEvidence = async (zone = 'semi_arid') => {
  const [thresholds, claims, edges, interventions] = await Promise.all([
    supabaseAdmin.from('suitability_thresholds').select('*').eq('zone', zone),
    supabaseAdmin.from('evidence_claims').select('*, evidence_sources(citation, doi, year, study_type, location)'),
    supabaseAdmin.from('causal_relationships').select('*'),
    supabaseAdmin.from('interventions').select('*'),
  ]);

  return {
    thresholds: thresholds.data || [],
    claims: claims.data || [],
    edges: edges.data || [],
    interventions: interventions.data || [],
  };
};

/**
 * Assemble what we know about one parcel.
 *
 * Soil carbon comes from the latest sample; everything else from
 * the dated observation series. Both land in one flat object so
 * the scorer does not care where a value came from.
 */
const loadSiteState = async (farmId) => {
  const { data: farm } = await supabaseAdmin
    .from('farms')
    .select('*')
    .eq('farm_id', farmId)
    .maybeSingle();

  if (!farm) return null;

  const { data: samples } = await supabaseAdmin
    .from('soil_samples')
    .select('*')
    .eq('farm_id', farmId)
    .order('sampled_at', { ascending: true });

  const { data: observations } = await supabaseAdmin
    .from('farm_observations')
    .select('*')
    .eq('farm_id', farmId)
    .order('observed_at', { ascending: true });

  const latest = {};
  for (const o of observations || []) latest[o.variable] = o.value_num;

  const latestSample = (samples || [])[samples.length - 1];

  return {
    farm,
    samples: samples || [],
    observations: observations || [],
    state: {
      ...latest,
      soc_percent: latestSample ? Number(latestSample.soc_percent) : undefined,
      ph: latestSample?.ph !== null && latestSample?.ph !== undefined
        ? Number(latestSample.ph) : latest.ph,
      soil_type: farm.soil_type,
      texture_class: farm.texture_class,
      cropping_system: farm.cropping_system,
      water_source: farm.water_source,
      climate_zone: farm.climate_zone,
      slope: farm.slope,
      annual_rainfall_mm: latest.annual_rainfall_mm,
    },
  };
};

/** Three-stage ordering, driven by the limiting factor. */
const sequence = ({ limiting, ranked, eligible, interventions }) => {
  const byId = Object.fromEntries(interventions.map((i) => [i.intervention_id, i]));

  // Interventions supported by at least one eligible claim.
  const supported = new Map();
  for (const e of eligible) {
    const id = e.claim.intervention;
    if (!id || !byId[id]) continue;
    if (!supported.has(id)) supported.set(id, []);
    supported.get(id).push(e.claimId);
  }

  const stages = [];
  const limitingVar = limiting?.variable;
  const limitingResource =
    limitingVar === 'moisture_percent' || limitingVar === 'annual_rainfall_mm' ? 'water' : null;

  // Stage 1 — relieve the binding constraint.
  for (const [id, claimIds] of supported) {
    const iv = byId[id];
    if (iv.addresses === limitingVar) {
      stages.push({ stage: 1, intervention: id, name: iv.name, names: { mr: iv.name_mr, hi: iv.name_hi },
        addresses: iv.addresses, timeHorizon: iv.time_horizon, costBand: iv.cost_band,
        supportingClaimIds: claimIds, deferred: false,
        rationale: `${limitingVar.replace(/_/g, ' ')} is holding everything else back.` });
    }
  }

  // Interventions addressing the limiting variable may exist with
  // no claim behind them. Include them, flagged, rather than
  // silently dropping the only thing that would help.
  if (stages.length === 0 && limitingVar) {
    for (const iv of interventions) {
      if (iv.addresses === limitingVar) {
        stages.push({ stage: 1, intervention: iv.intervention_id, name: iv.name,
          names: { mr: iv.name_mr, hi: iv.name_hi }, addresses: iv.addresses,
          timeHorizon: iv.time_horizon, costBand: iv.cost_band,
          supportingClaimIds: [], deferred: false, unsupported: true,
          rationale: `${limitingVar.replace(/_/g, ' ')} is the binding constraint.` });
      }
    }
  }

  // Stages 2 and 3 — other drivers, deferring anything that
  // competes with the limiting resource.
  for (const [id, claimIds] of supported) {
    const iv = byId[id];
    if (iv.addresses === limitingVar) continue;

    const competes = limitingResource && iv.competes_for === limitingResource;
    stages.push({
      stage: competes ? 3 : 2,
      intervention: id, name: iv.name, names: { mr: iv.name_mr, hi: iv.name_hi },
      addresses: iv.addresses, timeHorizon: iv.time_horizon, costBand: iv.cost_band,
      supportingClaimIds: claimIds,
      deferred: Boolean(competes),
      // Deferral is NOT rejection, and the difference is reported.
      // An intervention sound in principle but premature here is
      // held with its precondition attached, not dropped.
      revisitWhen: competes
        ? `once ${String(limitingVar).replace(/_/g, ' ')} is no longer limiting`
        : null,
      rationale: competes
        ? `Sound practice, but it needs ${limitingResource} — which is the constraint right now.`
        : 'Addresses a further driver without competing for the limiting resource.',
    });
  }

  return stages.sort((a, b) => a.stage - b.stage);
};

/** Four components, reported separately and never summed. */
const confidence = ({ scores, missing, eligible, rejected }) => {
  const known = Object.keys(scores).length;
  const data = known + missing.length === 0 ? 0 : known / (known + missing.length);

  const withEffect = eligible.filter((e) => e.hasEffectSize).length;
  const evidence = eligible.length === 0 ? 0 : withEffect / eligible.length;

  const context = eligible.length === 0
    ? 0
    : eligible.reduce((s, e) => s + e.contextScore, 0) / eligible.length;

  // Agreement: do the surviving claims point the same way?
  const dirs = eligible.map((e) => e.claim.direction);
  const agreement = dirs.length === 0
    ? 0
    : Math.max(...['increase', 'decrease', 'no_effect'].map(
        (d) => dirs.filter((x) => x === d).length)) / dirs.length;

  const parts = {
    data: Number(data.toFixed(3)),
    evidence: Number(evidence.toFixed(3)),
    context: Number(context.toFixed(3)),
    agreement: Number(agreement.toFixed(3)),
  };

  // Naming the weakest component matters because the remedies
  // differ: weak data is fixed by measuring, weak evidence by
  // better literature, weak context by neither.
  const limitedBy = Object.entries(parts).sort((a, b) => a[1] - b[1])[0][0];

  return { ...parts, limitedBy, rejectedCount: rejected.length };
};

/**
 * Produce an Assessment for one parcel.
 */
const assess = async (farmId) => {
  const site = await loadSiteState(farmId);
  if (!site) return { status: 'not_found' };

  const zone = site.state.climate_zone || 'semi_arid';
  const evidence = await loadEvidence(zone);

  const { scores, missing, missingCritical } = scoreSite(site.state, evidence.thresholds);

  const base = {
    farmId,
    parcelName: site.farm.name,
    assessedAt: new Date().toISOString(),
    zone,
    siteContext: siteContext(site.state),
    siteState: scores,
    missingVariables: missing,
  };

  // Refusal is a designed output, not an error path. A system that
  // always produces advice regardless of what it knows cannot be
  // told apart, from outside, from one that is guessing.
  if (missingCritical.length > 0) {
    return {
      ...base,
      status: 'insufficient_data',
      missingCritical,
      message: `Cannot assess this plot yet. Still needed: ${missingCritical.join(', ')}.`,
      sequence: [],
      eligibleClaims: [],
      rejectedClaims: [],
      confidence: null,
    };
  }

  const trends = trendsFor(site.observations);
  const limiting = limitingFactor(scores);

  const { ranked, unmeasured, underDetermined } = rankDrivers({
    target: limiting?.variable,
    edges: evidence.edges,
    scores,
    trends,
  });

  // Exact metadata filter, not similarity search. Which claims
  // bear on a variable is a question with a correct answer, and
  // approximate retrieval would introduce both false positives
  // and false negatives into a determination that needs neither.
  const targets = new Set([limiting?.variable, ...ranked.map((r) => r.driver)].filter(Boolean));
  const relevant = evidence.claims.filter((c) => targets.has(c.target_metric));

  const { eligible, rejected } = filterClaims(relevant, site.state);

  return {
    ...base,
    status: 'ok',
    limitingFactor: limiting,
    trends,
    rankedDrivers: ranked,
    unmeasuredDrivers: unmeasured,
    underDetermined,
    eligibleClaims: eligible.map((e) => ({
      claimId: e.claimId,
      statement: e.claim.statement,
      targetMetric: e.claim.target_metric,
      direction: e.claim.direction,
      effectSize: e.claim.effect_size,
      effectUnit: e.claim.effect_unit,
      contextScore: e.contextScore,
      caveat: e.claim.caveat,
      source: e.claim.evidence_sources,
      verified: e.claim.verified,
    })),
    rejectedClaims: rejected,
    sequence: sequence({ limiting, ranked, eligible, interventions: evidence.interventions }),
    confidence: confidence({ scores, missing, eligible, rejected }),
  };
};

module.exports = { assess, loadSiteState, loadEvidence, sequence, confidence };
