const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Devices and their readings.
 *
 * There is no hardware yet, so every device registered today is a
 * simulated one. This path is written as production code anyway:
 * the simulator posts to the same endpoint, through the same
 * validation, into the same table a probe will write to. When real
 * hardware arrives, only the thing doing the posting changes.
 *
 * The flag that matters is `is_simulated`. It travels from the
 * device row onto every observation as `source='simulated'`, so a
 * demo reading can never be mistaken for a measurement taken in a
 * real field — not by the reasoning engine, not by the evidence
 * panel, and not by a farmer looking at their dashboard.
 */

/**
 * Plausible ranges per variable.
 *
 * These reject physically impossible readings, not agronomically
 * interesting ones. A moisture of 3% is a real and alarming value;
 * a moisture of 480% is a broken sensor or a malformed payload.
 * Rejecting the second while admitting the first is the whole job.
 *
 * Deliberately NOT thresholds for advice — those belong to the
 * reasoning engine and are conditioned on crop and soil. Confusing
 * the two would quietly turn a validation rule into agronomy.
 */
const RANGES = {
  moisture_percent: [0, 100],
  soil_temp_c: [-10, 70],
  air_humidity_percent: [0, 100],
  air_temp_c: [-20, 60],
  ndvi_proxy: [-1, 1],
  rainfall_mm: [0, 500],
};

/** Today in UTC, matching how alert_day and observed_at are stored. */
const TODAY = () => new Date().toISOString().slice(0, 10);

const hashKey = (key) => crypto.createHash('sha256').update(String(key)).digest('hex');

/** A key the farmer sees once. Ambiguous characters left out. */
const generateKey = () => {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(32);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `cu_${out}`;
};

const generateDeviceId = (prefix = 'sim') =>
  `${prefix}-${crypto.randomBytes(4).toString('hex')}`;

/**
 * Register a device against a parcel.
 *
 * Returns the raw key exactly once. It is stored only as a hash,
 * so it cannot be recovered or displayed again — losing it means
 * issuing a new one, which is the correct trade for a credential
 * that can write data the engine will act on.
 */
const registerDevice = async ({ farmId, deviceType = 'soil_probe', label, isSimulated = true, createdBy }) => {
  const apiKey = generateKey();
  const deviceId = generateDeviceId(isSimulated ? 'sim' : 'dev');

  const { data, error } = await supabaseAdmin
    .from('iot_devices')
    .insert([{
      device_id: deviceId,
      farm_id: farmId,
      device_type: deviceType,
      label: label || (isSimulated ? 'Simulated probe' : 'Field probe'),
      api_key_hash: hashKey(apiKey),
      is_simulated: isSimulated,
      created_by: createdBy || null,
    }])
    .select('device_id, farm_id, device_type, label, is_simulated, created_at')
    .single();

  if (error) throw new Error(`could not register device: ${error.message}`);

  return { device: data, apiKey };
};

/** Resolve a raw key to its device, or null. */
const authenticate = async (rawKey) => {
  if (!rawKey) return null;

  const { data } = await supabaseAdmin
    .from('iot_devices')
    .select('device_id, farm_id, device_type, is_simulated, is_active')
    .eq('api_key_hash', hashKey(rawKey))
    .eq('is_active', true)
    .maybeSingle();

  return data || null;
};

/**
 * Validate a batch of readings.
 *
 * Returns accepted rows and rejected ones with a reason. Rejections
 * are reported rather than silently dropped, because "the sensor
 * sent nonsense" is itself information the farmer and the Watchdog
 * both need — a feed that is live but implausible looks identical
 * to a healthy feed if you only count rows.
 */
const validateReadings = (readings, { farmId, deviceId, source }) => {
  const accepted = [];
  const rejected = [];

  for (const r of Array.isArray(readings) ? readings : []) {
    const variable = String(r.variable || r.metric || '').trim();
    const value = Number(r.value_num ?? r.value);

    if (!variable) { rejected.push({ reading: r, why: 'no variable named' }); continue; }
    if (!RANGES[variable]) { rejected.push({ reading: r, why: `unknown variable ${variable}` }); continue; }
    if (!Number.isFinite(value)) { rejected.push({ reading: r, why: 'value is not a number' }); continue; }

    const [lo, hi] = RANGES[variable];
    if (value < lo || value > hi) {
      rejected.push({ reading: r, why: `${variable} ${value} outside plausible ${lo}..${hi}` });
      continue;
    }

    // observed_at is a date column, matching how the rest of the
    // sensing feed writes. Timestamps finer than a day are not
    // meaningful to a reasoning engine working in days-since-rain.
    const when = r.observed_at || r.ts || new Date().toISOString();
    const observedAt = String(when).slice(0, 10);

    // A reading cannot have been taken tomorrow.
    //
    // This is here because time-compressed simulation is the
    // obvious way to produce one: run a 14-day scenario at 60x and
    // a naive cursor walks straight past today. A future row then
    // poisons everything that reasons from "now" — device age,
    // staleness, days-since-rain — and does it silently, because
    // nothing else in the system thinks to ask. The simulator
    // walks backwards-to-today for the same reason; this is the
    // backstop for anything that forgets to.
    if (observedAt > TODAY()) {
      rejected.push({ reading: r, why: `observed_at ${observedAt} is in the future` });
      continue;
    }

    accepted.push({
      farm_id: farmId,
      device_id: deviceId,
      variable,
      value_num: value,
      unit: r.unit || null,
      observed_at: observedAt,
      source,
      quality_flag: 'ok',
    });
  }

  return { accepted, rejected };
};

/**
 * Write a validated batch and touch the device's heartbeat.
 *
 * Plain insert, not upsert. Several readings on one day are
 * legitimate — a real probe reports many times a day and the trend
 * maths handles repeated dates — so there is no natural key to
 * conflict on.
 *
 * The consequence is that re-running a backfill DOES duplicate
 * history, which would flatten the very trend a scenario is meant
 * to produce. The simulator's --reset clears prior simulated rows
 * for that reason; it is not a convenience.
 */
const storeReadings = async (rows, deviceId) => {
  if (!rows.length) {
    await supabaseAdmin.from('iot_devices')
      .update({ last_seen: new Date().toISOString() }).eq('device_id', deviceId);
    return 0;
  }

  const { error } = await supabaseAdmin.from('farm_observations').insert(rows);
  if (error) throw new Error(`could not store readings: ${error.message}`);

  await supabaseAdmin.from('iot_devices')
    .update({ last_seen: new Date().toISOString() }).eq('device_id', deviceId);

  return rows.length;
};

/**
 * A variable's recent series, with the arithmetic already done.
 *
 * This exists so the agent layer never computes a trend. The model
 * is handed min, max and slope as finished numbers; asking it to
 * infer a direction from a list would reintroduce exactly the
 * failure the numeric guard exists to prevent.
 */
/**
 * Source precedence.
 *
 * `weatherFeed` writes moisture_percent from a gridded model, and a
 * probe writes moisture_percent from the actual soil. Both land in
 * one table against one variable, so "latest" alone is not enough:
 * whichever source happened to report most recently wins, and a
 * modelled estimate from this morning silently outranks a direct
 * measurement from yesterday.
 *
 * That is wrong in a specific, dangerous way. A device in the
 * ground measures THIS field; a model interpolates a grid cell
 * containing it. When a working probe exists, it should be believed
 * over the estimate — otherwise the whole point of installing one
 * is defeated by a feed that runs more often.
 *
 * So callers that care can restrict the sources. They are expected
 * to, not as an optimisation but because mixing a measurement with
 * an estimate and taking the newest is not a defensible rule.
 */
const DEVICE_SOURCES = ['device', 'simulated'];

const getTrend = async (farmId, variable, hours = 48, { sources = null } = {}) => {
  const sinceDate = new Date(Date.now() - hours * 3600e3).toISOString().slice(0, 10);

  let q = supabaseAdmin
    .from('farm_observations')
    .select('value_num, unit, observed_at, source, device_id, created_at')
    .eq('farm_id', farmId)
    .eq('variable', variable)
    .gte('observed_at', sinceDate);

  if (sources && sources.length) q = q.in('source', sources);

  /**
   * Ordered by observed_at AND created_at.
   *
   * observed_at is a date, and a probe reporting several times a
   * day is normal — so ordering by date alone leaves ties, and
   * which row counts as "latest" falls to whatever order Postgres
   * happens to return. That made the newest value nondeterministic:
   * two readings for today, 10% and 34%, and the field looked
   * either parched or recovered depending on the plan chosen.
   *
   * created_at breaks the tie by when the reading was actually
   * recorded, which is the only defensible answer.
   */
  const { data } = await q
    .order('observed_at', { ascending: true })
    .order('created_at', { ascending: true });

  const points = (data || []).filter((p) => p.value_num !== null);

  if (!points.length) {
    return { variable, hours, points: 0, available: false, sourcesRequested: sources };
  }

  const values = points.map((p) => Number(p.value_num));
  const first = points[0];
  const last = points[points.length - 1];

  // Least squares against days elapsed, so slope is per day
  // regardless of how irregularly the readings arrived.
  const t0 = new Date(first.observed_at).getTime();
  const xs = points.map((p) => (new Date(p.observed_at).getTime() - t0) / 86400000);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slopePerDay = den === 0 ? 0 : num / den;

  // Gaps worth naming: a trend over three readings spanning two
  // weeks is not the same claim as one over fourteen dailies, and
  // the difference should be visible rather than inferred.
  const spanDays = xs[n - 1];
  const gaps = [];
  for (let i = 1; i < n; i += 1) {
    const d = xs[i] - xs[i - 1];
    if (d > 1.5) gaps.push({ afterDate: points[i - 1].observed_at, days: Number(d.toFixed(1)) });
  }

  return {
    variable,
    hours,
    available: true,
    points: n,
    unit: first.unit || null,
    min: Number(Math.min(...values).toFixed(2)),
    max: Number(Math.max(...values).toFixed(2)),
    first: { value: Number(first.value_num), at: first.observed_at },
    latest: { value: Number(last.value_num), at: last.observed_at },
    change: Number((Number(last.value_num) - Number(first.value_num)).toFixed(2)),
    slopePerDay: Number(slopePerDay.toFixed(3)),
    direction: slopePerDay > 0.05 ? 'rising' : slopePerDay < -0.05 ? 'falling' : 'steady',
    spanDays: Number(spanDays.toFixed(1)),
    gaps,
    sources: [...new Set(points.map((p) => p.source))],
    simulated: points.every((p) => p.source === 'simulated'),
  };
};

const STUCK_MIN_READINGS = 12;
const STUCK_VARIATION = 0.1;
const OFFLINE_HOURS = 6;

/**
 * Device health, judged from the data rather than self-reported.
 *
 * A sensor that has failed usually keeps talking. "Offline" is the
 * easy case; the dangerous one is a probe reporting the same value
 * forever, which looks like a stable field and reads as good news.
 */
const getDeviceHealth = async (farmId) => {
  const { data: devices } = await supabaseAdmin
    .from('iot_devices')
    .select('device_id, device_type, label, is_simulated, is_active, last_seen')
    .eq('farm_id', farmId);

  const out = [];

  for (const d of devices || []) {
    const ageHours = d.last_seen
      ? (Date.now() - new Date(d.last_seen).getTime()) / 3600e3
      : null;

    const { data: recent } = await supabaseAdmin
      .from('farm_observations')
      .select('value_num, variable, observed_at')
      .eq('device_id', d.device_id)
      .eq('variable', 'moisture_percent')
      .order('observed_at', { ascending: false })
      .limit(40);

    const values = (recent || []).map((r) => Number(r.value_num)).filter(Number.isFinite);
    const variation = values.length ? Math.max(...values) - Math.min(...values) : null;
    const stuck = values.length >= STUCK_MIN_READINGS && variation < STUCK_VARIATION;

    out.push({
      device_id: d.device_id,
      label: d.label,
      type: d.device_type,
      is_simulated: d.is_simulated,
      is_active: d.is_active,
      last_seen: d.last_seen,
      ageHours: ageHours === null ? null : Number(ageHours.toFixed(1)),
      offline: ageHours === null ? true : ageHours > OFFLINE_HOURS,
      stuck,
      readingsConsidered: values.length,
      variation: variation === null ? null : Number(variation.toFixed(3)),
    });
  }

  return {
    devices: out,
    deviceCount: out.length,
    anyOffline: out.some((d) => d.offline),
    anyStuck: out.some((d) => d.stuck),
    allSimulated: out.length > 0 && out.every((d) => d.is_simulated),
  };
};

/**
 * Which sources should be believed for this parcel right now.
 *
 * A probe is preferred over the model only while it is actually
 * working. An offline or stuck device must NOT win precedence — it
 * would pin every rule to a week-old number precisely when the
 * field is changing, and do it because a sensor exists rather than
 * because it is reporting. The offline and stuck alerts cover the
 * sensor; this covers the data.
 *
 * Returns null to mean "no preference, use everything".
 */
const preferredSources = (health) => {
  const trustworthy = (health?.devices || [])
    .filter((d) => d.is_active && !d.offline && !d.stuck);
  return trustworthy.length ? DEVICE_SOURCES : null;
};

/** Most recent value per variable, with provenance attached. */
const getLatestReadings = async (farmId) => {
  const { data } = await supabaseAdmin
    .from('farm_observations')
    .select('variable, value_num, unit, observed_at, source, device_id, created_at')
    .eq('farm_id', farmId)
    // created_at breaks same-day ties, for the reason given in
    // getTrend: without it the "latest" reading is arbitrary
    // whenever a device reports more than once in a day.
    .order('observed_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300);

  const latest = {};
  for (const o of data || []) {
    if (!latest[o.variable]) {
      latest[o.variable] = {
        value: o.value_num === null ? null : Number(o.value_num),
        unit: o.unit,
        at: o.observed_at,
        source: o.source,
        device_id: o.device_id,
        simulated: o.source === 'simulated',
      };
    }
  }

  return {
    latest,
    variables: Object.keys(latest),
    anySimulated: Object.values(latest).some((v) => v.simulated),
  };
};

/**
 * One batch of readings, all the way through.
 *
 * validate → store → evaluate the Watchdog. Extracted so the HTTP
 * endpoint and the in-app demo run the IDENTICAL sequence. A demo
 * that wrote rows directly would be faster and would prove
 * nothing: the rejections, the alert firing and the alert clearing
 * are the parts worth showing, and they all live here.
 *
 * Watchdog failure never fails the batch — the readings are
 * already durably written at that point, and losing data because
 * a rule threw is strictly worse than a missing alert.
 */
const ingestBatch = async ({ device, readings }) => {
  const source = device.is_simulated ? 'simulated' : 'device';

  const { accepted, rejected } = validateReadings(readings, {
    farmId: device.farm_id,
    deviceId: device.device_id,
    source,
  });

  const stored = await storeReadings(accepted, device.device_id);

  let alerts = { raised: [], resolved: [], raisedDetail: [], resolvedDetail: [] };
  if (stored > 0) {
    try {
      // Required lazily: the Watchdog imports this module, and at
      // module load time that circle is not yet resolved.
      const watchdog = require('../agents/watchdog');
      const { supabaseAdmin: db } = require('../config/supabase');

      const { data: farm } = await db
        .from('farms')
        .select('farm_id, name, farmer_wallet')
        .eq('farm_id', device.farm_id)
        .single();

      if (farm?.farmer_wallet) {
        const out = await watchdog.checkParcel(farm);
        alerts = {
          raised: out.raised || [],
          resolved: out.resolved || [],
          raisedDetail: out.raisedDetail || [],
          resolvedDetail: out.resolvedDetail || [],
        };
      }
    } catch (e) {
      alerts = { raised: [], resolved: [], error: e.message };
    }
  }

  return {
    source,
    inserted: stored,
    rejected: rejected.length,
    rejections: rejected.map((r) => r.why),
    accepted,
    alerts,
  };
};

module.exports = {
  RANGES,
  DEVICE_SOURCES,
  preferredSources,
  ingestBatch,
  STUCK_MIN_READINGS,
  STUCK_VARIATION,
  OFFLINE_HOURS,
  TODAY,
  hashKey,
  generateKey,
  registerDevice,
  authenticate,
  validateReadings,
  storeReadings,
  getTrend,
  getDeviceHealth,
  getLatestReadings,
};
