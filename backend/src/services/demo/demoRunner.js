const devices = require('../deviceService');
const { SCENARIOS, dateForDay } = require('./scenarios');
const { supabaseAdmin } = require('../../config/supabase');

/**
 * A trial data run.
 *
 * Walks a scenario one simulated day at a time, with a real delay
 * between days, so the demo shows data ARRIVING rather than
 * appearing all at once. Each day goes through
 * deviceService.ingestBatch — the same validation, the same
 * storage, the same Watchdog evaluation a physical probe gets.
 *
 * Run progress is held in memory; the readings and alerts it
 * produces are in Postgres, which is the part that has to survive.
 * If the process restarts mid-run the ticks already written stay
 * written, and the run is simply gone — correct, because a demo
 * run is not something worth resuming.
 */

const runs = new Map();

// Clamped server-side. The UI offers a speed control, and a
// control that can ask for a thousand days at four hours each is
// not a control, it is a way to wedge the server.
const MIN_INTERVAL_MS = 200;
const MAX_INTERVAL_MS = 5000;
const MAX_DAYS = 60;
const RUN_TTL_MS = 30 * 60 * 1000;

const clamp = (v, lo, hi, dflt) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, Math.round(n)));
};

/** Forget finished runs so the map cannot grow without bound. */
const sweep = () => {
  const now = Date.now();
  for (const [id, run] of runs) {
    if (!run.running && now - run.finishedAt > RUN_TTL_MS) runs.delete(id);
  }
};

/**
 * The parcel's simulated device, created on first use.
 *
 * One click has to work from cold — asking the farmer to go and
 * make a device first would defeat the point of the button.
 */
const ensureDevice = async (farmId, createdBy) => {
  const { data: existing } = await supabaseAdmin
    .from('iot_devices')
    .select('device_id, farm_id, device_type, is_simulated, is_active')
    .eq('farm_id', farmId)
    .eq('is_simulated', true)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (existing) return { device: existing, created: false };

  const { device } = await devices.registerDevice({
    farmId,
    label: 'Trial probe',
    isSimulated: true,
    createdBy,
  });

  return {
    device: {
      device_id: device.device_id,
      farm_id: device.farm_id,
      device_type: device.device_type,
      is_simulated: true,
      is_active: true,
    },
    created: true,
  };
};

/**
 * Clear previous simulated rows for a parcel.
 *
 * Offered before a re-run, and it is not a convenience: inserts
 * are not upserts, so running a backfill twice doubles the history
 * and flattens the exact trend the scenario exists to produce.
 * Only source='simulated' is touched — Soil Health Cards, weather
 * model rows and anything from real hardware are someone's actual
 * record.
 */
const clearSimulated = async (farmId) => {
  await supabaseAdmin
    .from('farm_observations')
    .delete()
    .eq('farm_id', farmId)
    .eq('source', 'simulated');

  await supabaseAdmin
    .from('alerts')
    .delete()
    .eq('farm_id', farmId)
    .in('kind', ['dry_spell', 'sensor_stuck', 'sensor_offline', 'moisture_critical']);
};

const start = async ({ farmId, scenario, days, intervalMs, reset, createdBy }) => {
  const spec = SCENARIOS[scenario];
  if (!spec) throw new Error(`Unknown scenario: ${scenario}`);

  sweep();

  const totalDays = clamp(days, 1, MAX_DAYS, 14);
  const gap = clamp(intervalMs, MIN_INTERVAL_MS, MAX_INTERVAL_MS, 1200);

  if (reset) await clearSimulated(farmId);

  const { device, created } = await ensureDevice(farmId, createdBy);

  // 'offline' sends a little and then stops: the alert is about
  // silence, so the scenario cannot demonstrate it by sending.
  const daysToSend = spec.stopsEarly ? Math.min(spec.stopsEarly, totalDays) : totalDays;

  const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const run = {
    runId,
    farmId,
    scenario,
    label: spec.label,
    expect: spec.expect,
    deviceId: device.device_id,
    deviceCreated: created,
    totalDays,
    daysToSend,
    intervalMs: gap,
    running: true,
    stopped: false,
    startedAt: Date.now(),
    finishedAt: null,
    ticks: [],
    inserted: 0,
    rejected: 0,
    alertsRaised: [],
    alertsResolved: [],
    urgent: [],
    error: null,
  };
  runs.set(runId, run);

  // Deliberately not awaited: the caller gets the runId at once
  // and polls, which is what makes the arrival visible.
  (async () => {
    try {
      for (let i = 0; i < daysToSend; i += 1) {
        if (run.stopped) break;

        const t = daysToSend === 1 ? 1 : i / (daysToSend - 1);
        const observedAt = dateForDay(totalDays, i);
        const readings = spec.readings(t, i).map((r) => ({ ...r, observed_at: observedAt }));

        const out = await devices.ingestBatch({ device, readings });

        run.inserted += out.inserted;
        run.rejected += out.rejected;
        for (const a of out.alerts.raised) if (!run.alertsRaised.includes(a)) run.alertsRaised.push(a);
        for (const a of out.alerts.resolved) if (!run.alertsResolved.includes(a)) run.alertsResolved.push(a);

        // Urgent alerts are tracked separately because they are the
        // point of the exercise: the system noticing, mid-stream,
        // that this field needs attention today — not a summary
        // produced once the run has finished.
        for (const d of out.alerts.raisedDetail || []) {
          if (d.severity === 'urgent' && !run.urgent.some((u) => u.kind === d.kind)) {
            run.urgent.push({ ...d, day: i + 1, observedAt });
          }
        }

        run.ticks.push({
          day: i + 1,
          observedAt,
          readings: readings.map((r) => ({ variable: r.variable, value: r.value, unit: r.unit })),
          inserted: out.inserted,
          rejected: out.rejected,
          rejections: out.rejections,
          raised: out.alerts.raised,
          resolved: out.alerts.resolved,
          raisedDetail: out.alerts.raisedDetail || [],
          resolvedDetail: out.alerts.resolvedDetail || [],
        });

        if (i < daysToSend - 1 && !run.stopped) {
          await new Promise((r) => setTimeout(r, gap));
        }
      }
    } catch (e) {
      run.error = e.message;
    } finally {
      run.running = false;
      run.finishedAt = Date.now();
    }
  })();

  return run;
};

const status = (runId) => runs.get(runId) || null;

const stop = (runId) => {
  const run = runs.get(runId);
  if (!run) return null;
  run.stopped = true;
  return run;
};

/** Everything a poller needs, without the generator internals. */
const snapshot = (run) => ({
  runId: run.runId,
  scenario: run.scenario,
  label: run.label,
  expect: run.expect,
  deviceId: run.deviceId,
  deviceCreated: run.deviceCreated,
  running: run.running,
  stopped: run.stopped,
  done: !run.running,
  totalDays: run.daysToSend,
  intervalMs: run.intervalMs,
  ticks: run.ticks,
  inserted: run.inserted,
  rejected: run.rejected,
  alertsRaised: run.alertsRaised,
  alertsResolved: run.alertsResolved,
  urgent: run.urgent,
  error: run.error,
});

module.exports = {
  start,
  status,
  stop,
  snapshot,
  clearSimulated,
  ensureDevice,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
  MAX_DAYS,
};
