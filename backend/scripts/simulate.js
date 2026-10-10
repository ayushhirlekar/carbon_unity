#!/usr/bin/env node
/* eslint-disable no-await-in-loop */
require('dotenv').config();

/**
 * Device simulator.
 *
 * Pretends to be a soil probe. It posts to the real /api/ingest
 * with a real device key, through the real validation, into the
 * real table — so nothing downstream can tell it apart from
 * hardware, which is the point. When a probe arrives, this script
 * is the only thing that gets deleted.
 *
 * ---------------------------------------------------------------
 * ON TIME COMPRESSION
 * ---------------------------------------------------------------
 * The obvious way to demo a two-week dry spell in a minute is to
 * run a clock fast. That breaks this system quietly:
 *
 *   - observed_at is a DATE, so "advance 60 simulated minutes" is
 *     not a distinct reading at all.
 *   - a cursor running faster than wall-clock walks past today and
 *     writes readings dated in the future, which poisons every
 *     rule that reasons from now() — device age, staleness,
 *     days-since-rain — and does it silently.
 *
 * So the cursor here walks a day at a time and ALWAYS BACKWARDS TO
 * TODAY: it starts `--days` ago and advances toward today, never
 * beyond. A fourteen-day scenario still plays out in however long
 * fourteen ticks take, every timestamp stays in the past, and
 * now()-based rules keep telling the truth. --interval controls
 * how fast the ticks come; that is the only knob that touches
 * speed, and it cannot produce an impossible reading.
 *
 * Once the cursor reaches today it keeps reporting today, which is
 * what a real probe does.
 */

const API = process.env.SIM_API || 'http://localhost:5000';

// ---------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------
// Imported, not defined here. The in-app "Send trial data" button
// runs these same definitions through the same ingest path, and
// two copies of "what a dry spell looks like" would drift within a
// week — at which point the button and this script would be
// demonstrating different systems while appearing to demonstrate
// one.
const { SCENARIOS: SPECS, dateForDay } = require('../src/services/demo/scenarios');

const SCENARIOS = Object.fromEntries(
  Object.entries(SPECS).map(([name, spec]) => [name, spec.readings])
);


// ---------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------
const parseArgs = (argv) => {
  const [, , scenario, ...rest] = argv;
  const opts = { scenario, days: 14, interval: 400, reset: false };

  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i];
    if (a === '--farm') opts.farm = rest[++i];
    else if (a === '--key') opts.key = rest[++i];
    else if (a === '--days' || a === '--backfill') opts.days = Number(rest[++i]);
    else if (a === '--interval') opts.interval = Number(rest[++i]);
    else if (a === '--reset') opts.reset = true;
    else if (a === '--api') opts.api = rest[++i];
  }
  return opts;
};

const usage = () => {
  console.log(`
Device simulator — posts to the real ingest endpoint.

  node scripts/simulate.js <scenario> --key <device-key> [options]

Scenarios
  normal       healthy field                 → no alerts
  dry_spell    steady decline                → dry_spell (urgent)
  rain_event   dry, then rain                → alert raised then resolved
  stuck        probe reporting one value     → sensor_stuck
  offline      sends a little, then stops    → sensor_offline (timer sweep)
  noisy        valid + impossible readings   → rejections, no false alert

Options
  --key <k>        device key from POST /api/devices  (required)
  --days <n>       days of history to walk through    (default 14)
  --interval <ms>  delay between simulated days       (default 400)
  --reset          delete this farm's prior simulated rows first
  --farm <uuid>    only needed with --reset
  --api <url>      default ${API}

Notes
  The cursor walks from <days> ago toward today and never past it,
  so no reading is ever dated in the future. --interval is the only
  speed control; there is no simulated clock to run fast.

  'offline' needs the 15-minute health sweep, or:
    node -e "require('./src/services/sensing/scheduler').runHealthSweep().then(console.log)"
`);
};

// ---------------------------------------------------------------
// Running
// ---------------------------------------------------------------
const post = async (api, key, readings, observedAt) => {
  const res = await fetch(`${api}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-key': key },
    body: JSON.stringify({
      readings: readings.map((r) => ({ ...r, observed_at: observedAt })),
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status}: ${body.message || 'ingest failed'}`);
  return body;
};

const resetFarm = async (farmId) => {
  const { supabaseAdmin } = require('../src/config/supabase');

  // Only simulated rows. Real readings, Soil Health Card samples
  // and remote-sensed weather are someone's actual record and are
  // not this script's to delete.
  const { error } = await supabaseAdmin
    .from('farm_observations')
    .delete()
    .eq('farm_id', farmId)
    .eq('source', 'simulated');

  if (error) throw new Error(`reset failed: ${error.message}`);

  await supabaseAdmin
    .from('alerts')
    .delete()
    .eq('farm_id', farmId)
    .in('kind', ['dry_spell', 'sensor_stuck', 'sensor_offline', 'moisture_critical']);

  console.log('Cleared prior simulated readings and device alerts for this parcel.');
};

// Delegates to the shared cursor so the "never past today" rule
// has exactly one implementation.
const dateNDaysAgo = (n) => dateForDay(n + 1, 0);

const main = async () => {
  const opts = parseArgs(process.argv);
  const api = opts.api || API;

  if (!opts.scenario || !SCENARIOS[opts.scenario]) {
    if (opts.scenario) console.error(`Unknown scenario: ${opts.scenario}\n`);
    usage();
    process.exit(opts.scenario ? 1 : 0);
  }
  if (!opts.key) { console.error('--key is required.\n'); usage(); process.exit(1); }

  if (opts.reset) {
    if (!opts.farm) { console.error('--reset needs --farm <uuid>'); process.exit(1); }
    await resetFarm(opts.farm);
  }

  const scenario = SCENARIOS[opts.scenario];
  const totalDays = Math.max(1, opts.days);

  // 'offline' deliberately stops early: the alert is about silence,
  // so the scenario cannot demonstrate it by sending something.
  const daysToSend = SPECS[opts.scenario].stopsEarly
    ? Math.min(SPECS[opts.scenario].stopsEarly, totalDays)
    : totalDays;

  console.log(`\nScenario : ${opts.scenario}`);
  console.log(`Walking  : ${dateNDaysAgo(totalDays)} → ${dateNDaysAgo(totalDays - daysToSend + 1)}`
    + (daysToSend < totalDays ? '  (stops early, by design)' : ''));
  console.log(`Interval : ${opts.interval}ms per simulated day\n`);

  let inserted = 0;
  let rejected = 0;
  const alertsSeen = new Set();
  const resolvedSeen = new Set();

  for (let i = 0; i < daysToSend; i += 1) {
    const t = daysToSend === 1 ? 1 : i / (daysToSend - 1);
    const observedAt = dateNDaysAgo(totalDays - i);
    const readings = scenario(t, i);

    try {
      const r = await post(api, opts.key, readings, observedAt);
      inserted += r.inserted;
      rejected += r.rejected;
      (r.alerts || []).forEach((a) => alertsSeen.add(a));
      (r.resolved || []).forEach((a) => resolvedSeen.add(a));

      const moisture = readings.find((x) => x.variable === 'moisture_percent');
      const flags = [
        r.alerts?.length ? `ALERT ${r.alerts.join(',')}` : '',
        r.resolved?.length ? `RESOLVED ${r.resolved.join(',')}` : '',
        r.rejected ? `${r.rejected} rejected` : '',
      ].filter(Boolean).join('  ');

      console.log(
        `${observedAt}  moisture ${String(moisture?.value ?? '-').padStart(5)}%  ` +
        `+${r.inserted}  ${flags}`
      );
    } catch (e) {
      console.error(`${observedAt}  FAILED: ${e.message}`);
    }

    if (i < daysToSend - 1) await new Promise((r) => setTimeout(r, opts.interval));
  }

  console.log(`\nInserted ${inserted}, rejected ${rejected}`);
  console.log(`Alerts raised  : ${[...alertsSeen].join(', ') || 'none'}`);
  console.log(`Alerts resolved: ${[...resolvedSeen].join(', ') || 'none'}`);

  if (opts.scenario === 'offline') {
    console.log('\nThis device has now gone quiet. Run the health sweep to see the alert:');
    console.log("  node -e \"require('./src/services/sensing/scheduler').runHealthSweep().then(r=>console.log(JSON.stringify(r,null,1)))\"");
  }
};

main().catch((e) => { console.error(e.message); process.exit(1); });
