const { supabaseAdmin } = require('../config/supabase');
const graph = require('../agents/graph');
const devices = require('./deviceService');

/**
 * The morning report.
 *
 * The second thing in this system that speaks without being asked,
 * after the Watchdog — and the two are deliberately different. An
 * alert is an interruption about one condition that needs acting
 * on. A report is a daily account of the field, read when the
 * farmer chooses to look.
 *
 * It is STORED rather than generated on read. A report is a record
 * of what the farmer was told on a given morning; regenerating it
 * later from newer data would silently rewrite that, and advice
 * someone has already acted on is exactly the thing that must stay
 * fixed. The unique index on (farm_id, report_date) enforces one
 * per day.
 */

/**
 * Pull the figures out of assembled agent state.
 *
 * This is what the evidence panel renders and what the numeric
 * guard checked the prose against, so it is the audit trail: every
 * number in the report should be findable here, and anything not
 * here should not be in the report.
 */
const buildEvidence = (facts) => {
  const ev = {};

  const sensing = facts.sensing || {};
  if (sensing.latest) {
    ev.readings = Object.entries(sensing.latest).map(([variable, o]) => ({
      variable,
      value: o.value_num ?? o.value ?? null,
      unit: o.unit || null,
      observed_at: o.observed_at || o.at || null,
      source: o.source || null,
      simulated: o.source === 'simulated',
    }));
  }

  if (sensing.trend) {
    ev.trends = Object.entries(sensing.trend).map(([variable, t]) => ({
      variable,
      change: t.change,
      direction: t.direction,
      slope_per_day: t.slopePerDay,
      span_days: t.spanDays,
      readings: t.points,
      gaps: t.gaps,
    }));
  }

  const weather = facts.weather;
  if (weather && !weather.error) {
    ev.weather = {
      rain_next_7d_mm: weather.rainNext7dMm ?? null,
      days_since_rain: weather.daysSinceRain ?? null,
      temp_c: weather.temperatureC ?? null,
    };
  }

  const a = facts.assessment;
  if (a && a.status === 'ok') {
    ev.assessment = {
      limiting_factor: a.limitingFactor?.variable || null,
      limiting_value: a.limitingFactor?.value ?? null,
      limiting_score: a.limitingFactor?.score ?? null,
      confidence: a.confidence || null,
      claims_matched: (a.claims || []).map((c) => c.claim_id),
      claims_rejected: (a.rejected || []).map((c) => ({ id: c.claim_id, why: c.reason })),
    };
  } else if (a) {
    ev.assessment = { status: a.status, missing: a.missing || null };
  }

  const c = facts.crediting;
  if (c && !c.error) {
    ev.crediting = {
      status: c.status,
      baseline_soc: c.baselineSoc ?? null,
      current_soc: c.currentSoc ?? null,
      creditable_tco2e: c.creditableTco2e ?? null,
    };
  }

  if (facts.devices) {
    ev.devices = {
      count: facts.devices.deviceCount,
      any_offline: facts.devices.anyOffline,
      any_stuck: facts.devices.anyStuck,
      all_simulated: facts.devices.allSimulated,
    };
  }

  /**
   * Did ANY simulated reading contribute to this report?
   *
   * Deliberately not "is the newest reading simulated". A report
   * built from a real weather estimate for moisture and a test
   * probe for soil temperature is still partly test data, and a
   * farmer deciding whether to act on it is entitled to know that
   * — a flag that goes false the moment one real reading arrives
   * would be worse than none, because it would read as assurance.
   */
  ev.simulated = Boolean(
    (ev.readings || []).some((r) => r.simulated) ||
    (ev.trends || []).length && Object.values(facts.sensing?.trend || {}).some((t) => t.simulated) ||
    facts.devices?.allSimulated
  );

  // Every source that fed this report, so provenance is legible
  // without having to infer it from a boolean.
  ev.sources = [...new Set((ev.readings || []).map((r) => r.source).filter(Boolean))];

  return ev;
};

/** The staged plan, as data rather than prose. */
const buildActions = (facts) => {
  const a = facts.assessment;
  if (!a || a.status !== 'ok') return [];

  return (a.sequence || []).map((s) => ({
    stage: s.stage,
    action: s.name,
    why: s.rationale || null,
    waiting_on: s.blockedBy || null,
  }));
};

const languageFor = async (farm) => {
  if (!farm.farmer_wallet) return 'en';
  const { data } = await supabaseAdmin
    .from('users')
    .select('preferred_language')
    .eq('wallet_address', farm.farmer_wallet)
    .maybeSingle();
  return data?.preferred_language || 'en';
};

/**
 * Generate and store one farm's report for today.
 *
 * `force` replaces today's row. Without it a second call is a
 * no-op, which is what makes the 06:00 job safe to re-run after a
 * restart without producing two different accounts of one morning.
 */
const generateForFarm = async (farm, { force = false } = {}) => {
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabaseAdmin
    .from('daily_reports')
    .select('report_id')
    .eq('farm_id', farm.farm_id)
    .eq('report_date', today)
    .maybeSingle();

  if (existing && !force) {
    return { farmId: farm.farm_id, skipped: 'already reported today', reportId: existing.report_id };
  }

  const language = await languageFor(farm);

  // Device state is fetched alongside the graph rather than through
  // it, because an offline sensor must appear in the report even
  // when it is the reason the rest of the data is thin.
  const [result, health] = await Promise.all([
    graph.dailyReport({ farmId: farm.farm_id, language }),
    devices.getDeviceHealth(farm.farm_id).catch(() => null),
  ]);

  const facts = { ...(result.facts || {}) };
  if (health) facts.devices = health;

  const row = {
    farm_id: farm.farm_id,
    report_date: today,
    summary: result.answer || 'No report could be produced for this field today.',
    actions: buildActions(facts),
    evidence: buildEvidence(facts),
    language,
    // Recorded so a run of template fallbacks is visible as a
    // signal rather than something discovered by noticing that the
    // reports have been reading oddly for a fortnight.
    guard_status: result.guardStatus || null,
    model_notice: result.modelNotice || null,
  };

  if (existing) {
    const { error } = await supabaseAdmin
      .from('daily_reports')
      .update(row)
      .eq('report_id', existing.report_id);
    if (error) throw new Error(error.message);
    return { farmId: farm.farm_id, reportId: existing.report_id, regenerated: true, guard: row.guard_status };
  }

  const { data, error } = await supabaseAdmin
    .from('daily_reports')
    .insert([row])
    .select('report_id')
    .single();

  if (error) throw new Error(error.message);
  return { farmId: farm.farm_id, reportId: data.report_id, guard: row.guard_status };
};

/** Every parcel with an owner to read it. */
const generateAll = async ({ force = false } = {}) => {
  const { data: farms } = await supabaseAdmin
    .from('farms')
    .select('farm_id, name, farmer_wallet')
    .not('farmer_wallet', 'is', null);

  const results = [];
  for (const farm of farms || []) {
    try {
      results.push(await generateForFarm(farm, { force }));
    } catch (e) {
      // One farm's failure must not deny every other farmer their
      // report, so the loop is sequential and errors are collected.
      results.push({ farmId: farm.farm_id, error: e.message });
    }
  }
  return results;
};

const latestForFarm = async (farmId) => {
  const { data } = await supabaseAdmin
    .from('daily_reports')
    .select('*')
    .eq('farm_id', farmId)
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
};

const historyForFarm = async (farmId, limit = 14) => {
  const { data } = await supabaseAdmin
    .from('daily_reports')
    .select('report_id, report_date, summary, guard_status, language')
    .eq('farm_id', farmId)
    .order('report_date', { ascending: false })
    .limit(limit);
  return data || [];
};

module.exports = {
  generateForFarm,
  generateAll,
  latestForFarm,
  historyForFarm,
  buildEvidence,
  buildActions,
};
