const { supabaseAdmin } = require('../config/supabase');
const { assess } = require('../reasoning/assess');
const weatherFeed = require('../services/sensing/weatherFeed');
const { inLocalUnits } = require('../services/geometryService');

/**
 * Agent tools.
 *
 * Each agent is a tool-caller, not a reasoner. These functions are
 * the only way an agent can obtain a fact, and every one of them
 * returns data from the database, the deterministic engine, or a
 * named external API.
 *
 * No tool invents a quantity, which is what lets the numeric guard
 * work: if a number is not in here, it is not in the answer.
 */

/** Sensing — readings, trends, and whether the feed is healthy. */
const sensingTool = async (farmId) => {
  const { data: obs } = await supabaseAdmin
    .from('farm_observations')
    .select('variable, value_num, unit, observed_at, source, quality_flag')
    .eq('farm_id', farmId)
    .order('observed_at', { ascending: false })
    .limit(200);

  const latest = {};
  const history = {};
  for (const o of obs || []) {
    if (!latest[o.variable]) latest[o.variable] = o;
    (history[o.variable] ||= []).push(o);
  }

  const newest = Object.values(latest).map((o) => o.observed_at).sort().pop();
  const ageDays = newest ? Math.floor((Date.now() - new Date(newest).getTime()) / 86400000) : null;

  return {
    latest,
    observationCount: (obs || []).length,
    newestObservation: newest || null,
    ageDays,
    // Surfaced deliberately: advice built on a week-old reading
    // should say so rather than presenting it as current.
    stale: ageDays === null || ageDays > 2,
    variablesTracked: Object.keys(latest),
  };
};

/** Weather — forecast at the parcel, straight from Open-Meteo. */
const weatherTool = async (farmId) => {
  const { data: rows } = await supabaseAdmin.rpc('fn_all_parcel_centroids');
  const farm = (rows || []).find((f) => f.farm_id === farmId);
  if (!farm) return { error: 'This plot has no boundary, so there is no location to forecast for.' };

  try {
    const c = await weatherFeed.currentConditions(farm.centroid_lat, farm.centroid_lon);
    return {
      daysSinceRain: c.daysSinceRain,
      rainLast14dMm: c.rain14dMm,
      rainNext7dMm: c.rainNext7dMm,
      maxTempC: c.maxTempC,
      et0Mm: c.et0Mm,
      soilMoisturePercent: c.moisturePercent,
      forecast: c.forecastDaily,
      drySpellAhead: c.rainNext7dMm < 5,
      source: 'Open-Meteo, modelled',
    };
  } catch (e) {
    return { error: `Weather service did not respond: ${e.message}` };
  }
};

/** Agronomy — the deterministic engine. Agents never replace it. */
const agronomyTool = async (farmId) => assess(farmId);

/** Crediting — carbon trajectory and what is still missing. */
const creditingTool = async (farmId) => {
  const { data: samples } = await supabaseAdmin
    .from('soil_samples')
    .select('*')
    .eq('farm_id', farmId)
    .order('sampled_at', { ascending: true });

  const { data: farm } = await supabaseAdmin
    .from('farms')
    .select('name, area_ha, area, bulk_density, bulk_density_source, sampling_depth_cm')
    .eq('farm_id', farmId)
    .maybeSingle();

  const list = samples || [];
  if (list.length === 0) {
    return { sampleCount: 0, status: 'no_samples',
      message: 'No soil readings yet. A Soil Health Card gives the first one.' };
  }
  if (list.length === 1) {
    return {
      sampleCount: 1, status: 'awaiting_baseline',
      baselineSoc: Number(list[0].soc_percent), baselineDate: list[0].sampled_at,
      // The single most important thing a farmer must understand
      // about carbon crediting, stated rather than implied.
      message: 'Carbon credits are paid on change. One reading is a starting point; a second from a later date is what makes a gain measurable.',
    };
  }

  const first = list[0];
  const latest = list[list.length - 1];
  const delta = Number((latest.soc_percent - first.soc_percent).toFixed(4));
  const areaHa = Number(farm?.area_ha || farm?.area || 0);

  return {
    sampleCount: list.length,
    status: delta > 0 ? 'gaining' : 'no_gain_yet',
    baselineSoc: Number(first.soc_percent), baselineDate: first.sampled_at,
    currentSoc: Number(latest.soc_percent), currentDate: latest.sampled_at,
    deltaSoc: delta,
    areaHa,
    creditableTco2e: delta > 0
      ? Number((delta * Number(latest.bulk_density) * Number(latest.depth_cm) * areaHa * 3.67).toFixed(3))
      : 0,
    // Flagged, not buried: these feed the credit arithmetic and
    // are estimates, so an issuance record must not present them
    // as measurements.
    assumptions: {
      bulkDensity: farm?.bulk_density, bulkDensitySource: farm?.bulk_density_source,
      samplingDepthCm: farm?.sampling_depth_cm,
      note: 'Soil weight and depth are estimated from soil type, not measured.',
    },
  };
};

/** Parcel facts. */
const parcelTool = async (farmId) => {
  const { data: farm } = await supabaseAdmin
    .from('farms')
    .select('name, area_ha, area, village, taluka, district, soil_type, texture_class, water_source, crop_type, season, cropping_system, tenure, has_bund, has_trees, tillage, residue_management')
    .eq('farm_id', farmId)
    .maybeSingle();
  if (!farm) return { error: 'Plot not found' };

  const ha = Number(farm.area_ha || farm.area || 0);
  return { ...farm, area: ha ? inLocalUnits(ha) : null };
};

module.exports = { sensingTool, weatherTool, agronomyTool, creditingTool, parcelTool };
