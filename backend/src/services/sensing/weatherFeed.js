const { supabaseAdmin } = require('../../config/supabase');

/**
 * Weather and soil-moisture feed.
 *
 * Open-Meteo is keyless and free, and it serves modelled SOIL
 * MOISTURE as well as weather — so a parcel gets the variable the
 * reasoning engine most needs without anyone buying a probe.
 *
 * These are genuinely real-time observations, not placeholders.
 * They land in farm_observations under source='remote_sensed',
 * the same table a physical probe would write to, so the engine
 * cannot tell the difference and nothing downstream changes when
 * hardware arrives.
 *
 * What this is NOT: a substitute for a probe in the ground.
 * Modelled moisture is a gridded estimate, and the provenance tag
 * says so rather than letting it pass as a field measurement.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

const isoDate = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

const fetchJson = async (url, params) => {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${qs}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
};

/**
 * Current conditions plus a short forecast at one point.
 */
const currentConditions = async (lat, lon) => {
  const data = await fetchJson(FORECAST_URL, {
    latitude: lat,
    longitude: lon,
    hourly: 'soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_temperature_0cm',
    daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration',
    past_days: 14,
    forecast_days: 7,
    timezone: 'auto',
  });

  const hourly = data.hourly || {};
  const daily = data.daily || {};

  // Latest non-null hourly reading, walking back from now.
  const lastOf = (arr) => {
    if (!Array.isArray(arr)) return null;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== null && arr[i] !== undefined) return arr[i];
    }
    return null;
  };

  // Open-Meteo reports volumetric water content as m3/m3, so a
  // reading of 0.11 is 11% — the unit the thresholds expect.
  const vwc = lastOf(hourly.soil_moisture_0_to_7cm);
  const vwcDeep = lastOf(hourly.soil_moisture_7_to_28cm);

  const rain = daily.precipitation_sum || [];
  const dates = daily.time || [];
  const todayIdx = dates.findIndex((d) => d === isoDate(new Date()));
  const cut = todayIdx === -1 ? rain.length : todayIdx + 1;

  const past = rain.slice(0, cut).filter((x) => x !== null);
  const forecast = rain.slice(cut).filter((x) => x !== null);

  // How long since meaningful rain. Anything under 1 mm does not
  // reach the root zone and should not reset the counter.
  let dryDays = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    if (past[i] >= 1) break;
    dryDays++;
  }

  return {
    moisturePercent: vwc === null ? null : Number((vwc * 100).toFixed(2)),
    moistureDeepPercent: vwcDeep === null ? null : Number((vwcDeep * 100).toFixed(2)),
    soilTempC: lastOf(hourly.soil_temperature_0cm),
    rain14dMm: Number(past.reduce((a, b) => a + b, 0).toFixed(1)),
    rainNext7dMm: Number(forecast.reduce((a, b) => a + b, 0).toFixed(1)),
    daysSinceRain: dryDays,
    maxTempC: lastOf(daily.temperature_2m_max),
    minTempC: lastOf(daily.temperature_2m_min),
    et0Mm: lastOf(daily.et0_fao_evapotranspiration),
    forecastDaily: dates.slice(cut).map((d, i) => ({ date: d, rainMm: forecast[i] ?? 0 })),
  };
};

/**
 * Rainfall over the last year — the rainfall band that context
 * matching keys on, derived rather than assumed from the district.
 */
const annualRainfall = async (lat, lon) => {
  const data = await fetchJson(ARCHIVE_URL, {
    latitude: lat,
    longitude: lon,
    start_date: isoDate(daysAgo(366)),
    end_date: isoDate(daysAgo(2)),   // archive lags a day or two
    daily: 'precipitation_sum',
    timezone: 'auto',
  });
  const rain = (data.daily?.precipitation_sum || []).filter((x) => x !== null);
  return rain.length ? Number(rain.reduce((a, b) => a + b, 0).toFixed(1)) : null;
};

/**
 * Write one parcel's observations.
 *
 * Upserted per (farm, variable, day) so running the scheduler
 * twice in a day corrects the reading rather than stacking
 * duplicates that would then look like a trend.
 */
const refreshParcel = async (farm) => {
  if (!farm.centroid_lat || !farm.centroid_lon) {
    return { farmId: farm.farm_id, skipped: 'no geometry' };
  }

  const [now, annual] = await Promise.all([
    currentConditions(farm.centroid_lat, farm.centroid_lon),
    annualRainfall(farm.centroid_lat, farm.centroid_lon).catch(() => null),
  ]);

  const today = isoDate(new Date());
  const rows = [];
  const add = (variable, value, unit) => {
    if (value === null || value === undefined) return;
    rows.push({
      farm_id: farm.farm_id,
      variable,
      value_num: value,
      unit,
      observed_at: today,
      source: 'remote_sensed',
      quality_flag: 'modelled',
    });
  };

  add('moisture_percent', now.moisturePercent, '%');
  add('moisture_deep_percent', now.moistureDeepPercent, '%');
  add('soil_temp_c', now.soilTempC, 'C');
  add('rain_14d_mm', now.rain14dMm, 'mm');
  add('rain_next_7d_mm', now.rainNext7dMm, 'mm');
  add('days_since_rain', now.daysSinceRain, 'days');
  add('max_temp_c', now.maxTempC, 'C');
  add('et0_mm', now.et0Mm, 'mm');
  if (annual !== null) add('annual_rainfall_mm', annual, 'mm');

  if (rows.length === 0) return { farmId: farm.farm_id, written: 0 };

  // Replace today's remote-sensed rows for this parcel, then
  // insert. Cheaper and clearer than an upsert needing a unique
  // constraint we have not defined.
  await supabaseAdmin
    .from('farm_observations')
    .delete()
    .eq('farm_id', farm.farm_id)
    .eq('observed_at', today)
    .eq('source', 'remote_sensed');

  const { error } = await supabaseAdmin.from('farm_observations').insert(rows);
  if (error) throw error;

  return { farmId: farm.farm_id, written: rows.length, conditions: now, annualRainfallMm: annual };
};

/** Every parcel that has geometry. */
const refreshAll = async () => {
  const { data: farms } = await supabaseAdmin.rpc('fn_all_parcel_centroids');
  const results = [];
  for (const farm of farms || []) {
    try {
      results.push(await refreshParcel(farm));
    } catch (e) {
      results.push({ farmId: farm.farm_id, error: e.message });
    }
  }
  return results;
};

module.exports = { currentConditions, annualRainfall, refreshParcel, refreshAll };
