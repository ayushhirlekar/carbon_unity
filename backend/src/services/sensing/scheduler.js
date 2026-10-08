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

const start = () => {
  if (timer) return;
  // Delayed first run so a failing feed cannot stop the server
  // from coming up.
  setTimeout(() => { runOnce().catch((e) => console.error('sensing run failed:', e.message)); }, 20000);
  timer = setInterval(() => {
    runOnce().catch((e) => console.error('sensing run failed:', e.message));
  }, INTERVAL_MS);
  console.log('Sensing scheduler started (every 6h)');
};

const stop = () => { if (timer) clearInterval(timer); timer = null; };

module.exports = { runOnce, start, stop, INTERVAL_MS };
