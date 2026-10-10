const { supabaseAdmin } = require('../../config/supabase');
const weatherFeed = require('./weatherFeed');
const watchdog = require('../../agents/watchdog');

/**
 * Feed scheduler.
 *
 * Runs in-process on a timer rather than as a cron service,
 * because one Node runtime is the whole deployment and a second
 * one would add an operational surface for no benefit at pilot
 * scale.
 *
 * Every run is logged, so "no new data" can be told apart from
 * "the feed broke". A stale dashboard otherwise looks identical
 * to a quiet one.
 */

const INTERVAL_MS = 6 * 60 * 60 * 1000;   // four times a day
let timer = null;

const runOnce = async (feed = 'open-meteo') => {
  const { data: run } = await supabaseAdmin
    .from('sensing_runs')
    .insert([{ feed }])
    .select()
    .single();

  let results = [];
  let errors = 0;
  try {
    results = await weatherFeed.refreshAll();
    errors = results.filter((r) => r.error).length;
  } catch (e) {
    errors = 1;
    results = [{ error: e.message }];
  }

  const written = results.reduce((s, r) => s + (r.written || 0), 0);

  // Watchdog runs after the feed, so its rules see today's
  // readings rather than yesterday's.
  try { await watchdog.runAll(); }
  catch (e) { console.error('watchdog failed:', e.message); }

  if (run) {
    await supabaseAdmin
      .from('sensing_runs')
      .update({
        finished_at: new Date().toISOString(),
        parcels_seen: results.length,
        rows_written: written,
        errors,
        detail: results,
      })
      .eq('run_id', run.run_id);
  }

  return { parcels: results.length, written, errors, results };
};

/**
 * Device health sweep.
 *
 * Separate from the feed and far more frequent, because an OFFLINE
 * DEVICE CANNOT ANNOUNCE ITSELF. Every other rule in this system
 * is evaluated when a reading arrives; silence is the one condition
 * that produces no event to react to, so the only way to notice it
 * is to look on a timer.
 *
 * Fifteen minutes is chosen against the six-hour offline threshold:
 * frequent enough that the alert is timely, rare enough that it
 * costs nothing. Running it hourly would mean a sensor could be
 * down for seven hours before anyone was told.
 */
const HEALTH_INTERVAL_MS = 15 * 60 * 1000;
let healthTimer = null;

const runHealthSweep = async () => {
  const { data: farms } = await supabaseAdmin
    .from('farms')
    .select('farm_id, name, farmer_wallet')
    .not('farmer_wallet', 'is', null);

  const results = [];
  for (const farm of farms || []) {
    try {
      results.push(await watchdog.checkParcel(farm));
    } catch (e) {
      results.push({ farmId: farm.farm_id, error: e.message });
    }
  }
  return results;
};

/**
 * The morning report job.
 *
 * node-cron rather than setInterval, because "06:00 Asia/Kolkata"
 * is not expressible as an interval: a 24-hour timer is anchored to
 * whenever the process last started, so it drifts and every deploy
 * moves the farmer's report to a different time of day. A farmer
 * who learns to check their phone after morning chores should find
 * it there, not at whatever hour the server was last restarted.
 */
const REPORT_CRON = process.env.REPORT_CRON || '0 6 * * *';
const REPORT_TZ = process.env.REPORT_TZ || 'Asia/Kolkata';
let reportJob = null;

const runReports = async () => {
  const reportService = require('../reportService');
  const results = await reportService.generateAll();
  const made = results.filter((r) => r.reportId && !r.skipped).length;
  const failed = results.filter((r) => r.error).length;
  console.log(`Daily reports: ${made} written, ${failed} failed, ${results.length} parcels`);
  return results;
};

const start = () => {
  if (timer) return;
  // Delayed first run so a failing feed cannot stop the server
  // from coming up.
  setTimeout(() => { runOnce().catch((e) => console.error('sensing run failed:', e.message)); }, 20000);
  timer = setInterval(() => {
    runOnce().catch((e) => console.error('sensing run failed:', e.message));
  }, INTERVAL_MS);

  healthTimer = setInterval(() => {
    runHealthSweep().catch((e) => console.error('health sweep failed:', e.message));
  }, HEALTH_INTERVAL_MS);

  try {
    const cron = require('node-cron');
    reportJob = cron.schedule(
      REPORT_CRON,
      () => { runReports().catch((e) => console.error('daily reports failed:', e.message)); },
      { timezone: REPORT_TZ }
    );
    console.log(`Sensing scheduler started (feed 6h, health 15m, reports ${REPORT_CRON} ${REPORT_TZ})`);
  } catch (e) {
    // The server must still come up without the report job. Said
    // out loud rather than swallowed: silently losing the morning
    // report is the failure mode this whole feature exists to
    // avoid being invisible.
    console.error(`Daily report job NOT scheduled: ${e.message}`);
    console.log('Sensing scheduler started (feed 6h, health 15m, NO daily reports)');
  }
};

const stop = () => {
  if (timer) clearInterval(timer);
  if (healthTimer) clearInterval(healthTimer);
  if (reportJob) reportJob.stop();
  timer = null;
  healthTimer = null;
  reportJob = null;
};

module.exports = {
  runOnce,
  runHealthSweep,
  runReports,
  start,
  stop,
  INTERVAL_MS,
  HEALTH_INTERVAL_MS,
  REPORT_CRON,
  REPORT_TZ,
};
