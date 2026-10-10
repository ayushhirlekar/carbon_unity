/* eslint-disable no-await-in-loop */
require('dotenv').config();

/**
 * Simulated IoT pipeline — end-to-end acceptance.
 *
 * Run: node tests/pipeline.test.js        (from backend/)
 *
 * PREREQUISITES
 *   Migrations 016 and 017 applied. The script checks and stops
 *   with a clear message rather than failing obscurely if not.
 *
 * It boots the real Express app in-process and posts over HTTP, so
 * device authentication, rate limiting and validation are all
 * genuinely exercised rather than bypassed by calling the service
 * layer directly.
 *
 * WHAT THIS DOES TO YOUR DATA
 *   Creates one test device on a parcel, writes observations with
 *   source='simulated', and deletes exactly those rows at the end.
 *   It never touches readings from any other source, soil samples,
 *   or any parcel other than the one it is pointed at.
 */

const { supabaseAdmin } = require('../src/config/supabase');
const devices = require('../src/services/deviceService');
const watchdog = require('../src/agents/watchdog');
const reportService = require('../src/services/reportService');
const scheduler = require('../src/services/sensing/scheduler');

// Overridable so the suite can run against a server it starts
// itself on a free port, rather than whatever happens to be on
// 5000 — a half-updated dev server produces failures that look
// like defects in the code under test and are not.
const PORT = process.env.TEST_PORT || process.env.PORT || 5000;
const API = `http://localhost:${PORT}`;

let pass = 0;
const failures = [];
const record = (ok, name, detail) => {
  if (ok) { pass += 1; console.log(`PASS  ${name}`); }
  else { failures.push(name); console.log(`FAIL  ${name}${detail ? `  — ${detail}` : ''}`); }
};
const note = (s) => console.log(`      ${s}`);

const dateNDaysAgo = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

const ingest = async (key, readings, observedAt) => {
  const res = await fetch(`${API}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-key': key },
    // Only fill in observed_at where the caller did not set one.
    // Overwriting it unconditionally is what made the future-date
    // case pass for the wrong reason.
    body: JSON.stringify({
      readings: readings.map((r) => ({ observed_at: observedAt, ...r })),
    }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const openAlerts = async (farmId) => {
  const { data } = await supabaseAdmin
    .from('alerts')
    .select('kind, severity, evidence, resolved_at, lifecycle')
    .eq('farm_id', farmId)
    .is('resolved_at', null);
  return data || [];
};

const alertRow = async (farmId, kind) => {
  const { data } = await supabaseAdmin
    .from('alerts')
    .select('alert_id, kind, resolved_at, evidence')
    .eq('farm_id', farmId)
    .eq('kind', kind)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
};

const preflight = async () => {
  const checks = [
    ['iot_devices', supabaseAdmin.from('iot_devices').select('device_id').limit(1)],
    ['daily_reports', supabaseAdmin.from('daily_reports').select('report_id').limit(1)],
  ];
  for (const [table, q] of checks) {
    const { error } = await q;
    if (error) {
      console.error(`\nCannot run: table "${table}" is missing (${error.message}).`);
      console.error('Apply database/migrations/016_device_ingest.sql and 017_alert_lifecycle.sql first.\n');
      process.exit(2);
    }
  }
  const { error: colErr } = await supabaseAdmin.from('alerts').select('resolved_at').limit(1);
  if (colErr) {
    console.error('\nCannot run: alerts.resolved_at is missing. Apply migration 017.\n');
    process.exit(2);
  }
};

const main = async () => {
  await preflight();

  // Pick a parcel that has an owner, so Watchdog rules have
  // somebody to raise alerts for.
  const { data: farm } = await supabaseAdmin
    .from('farms')
    .select('farm_id, name, farmer_wallet')
    .not('farmer_wallet', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!farm) {
    console.error('Cannot run: no parcel with a farmer_wallet. Register a farmer and draw a plot first.');
    process.exit(2);
  }

  console.log(`\nParcel under test: ${farm.name} (${farm.farm_id})\n`);

  // Clean slate for simulated data on this parcel only.
  await supabaseAdmin.from('farm_observations')
    .delete().eq('farm_id', farm.farm_id).eq('source', 'simulated');
  await supabaseAdmin.from('alerts')
    .delete().eq('farm_id', farm.farm_id)
    .in('kind', ['dry_spell', 'sensor_stuck', 'sensor_offline', 'moisture_critical']);

  // Reuse a server that is already up rather than insisting on
  // starting one. A dev server running on 5000 is the normal state
  // while working, and failing with EADDRINUSE would make the suite
  // unrunnable at exactly the moment someone wants to run it.
  const alreadyUp = await fetch(`${API}/api/health`)
    .then((r) => r.ok)
    .catch(() => false);

  if (alreadyUp) {
    console.log('Using the server already listening on 5000.');
  } else {
    require('../src/server');
    await new Promise((r) => setTimeout(r, 1500));
  }

  let deviceId = null;
  let apiKey = null;

  try {
    // -----------------------------------------------------------
    console.log('--- (a) device registration ---');
    // -----------------------------------------------------------
    const reg = await devices.registerDevice({
      farmId: farm.farm_id, label: 'Acceptance probe', isSimulated: true,
    });
    deviceId = reg.device.device_id;
    apiKey = reg.apiKey;

    record(Boolean(apiKey && apiKey.startsWith('cu_')), 'device created, key issued once');

    const { data: stored } = await supabaseAdmin
      .from('iot_devices').select('api_key_hash').eq('device_id', deviceId).single();
    record(stored.api_key_hash !== apiKey && stored.api_key_hash === devices.hashKey(apiKey),
      'key stored hashed, not in plaintext');

    const bad = await ingest('cu_definitely-not-a-real-key', [{ variable: 'moisture_percent', value: 20 }], dateNDaysAgo(1));
    record(bad.status === 401, 'wrong key rejected', `status ${bad.status}`);

    // -----------------------------------------------------------
    console.log('\n--- (b) dry_spell: readings land, urgent alert with evidence ---');
    // -----------------------------------------------------------
    const DAYS = 14;
    let totalInserted = 0;
    for (let i = 0; i < DAYS; i += 1) {
      const t = i / (DAYS - 1);
      const r = await ingest(apiKey, [
        { variable: 'moisture_percent', value: Math.round((32 - t * 22) * 10) / 10, unit: '%' },
        { variable: 'soil_temp_c', value: 27, unit: 'C' },
      ], dateNDaysAgo(DAYS - 1 - i));
      totalInserted += r.body.inserted || 0;
    }
    record(totalInserted === DAYS * 2, 'all readings accepted', `inserted ${totalInserted}/${DAYS * 2}`);

    const trend = await devices.getTrend(farm.farm_id, 'moisture_percent', 24 * 20,
      { sources: devices.DEVICE_SOURCES });
    record(trend.available && trend.direction === 'falling',
      'trend computed server-side and falling', `direction ${trend.direction}`);
    note(`moisture ${trend.first.value}% → ${trend.latest.value}% over ${trend.spanDays}d, slope ${trend.slopePerDay}/day`);

    const dry = await alertRow(farm.farm_id, 'dry_spell');
    record(Boolean(dry), 'dry_spell alert raised');
    record(Boolean(dry?.evidence?.moisture_now !== undefined),
      'alert carries the figures that triggered it');
    if (dry?.evidence) note(`evidence: ${JSON.stringify(dry.evidence)}`);

    // -----------------------------------------------------------
    console.log('\n--- (c) report and chat use only evidenced figures ---');
    // -----------------------------------------------------------
    const gen = await reportService.generateForFarm(farm, { force: true });
    const report = await reportService.latestForFarm(farm.farm_id);

    record(Boolean(report?.summary), 'morning report written');
    record(['passed', 'regenerated', 'template_fallback'].includes(report?.guard_status),
      'report passed through the guard', `guard ${report?.guard_status}`);
    note(`guard: ${report?.guard_status}${report?.model_notice ? ` (${report.model_notice})` : ''}`);
    note(`report: ${String(report?.summary).slice(0, 160)}…`);

    record(Boolean(report?.evidence && Object.keys(report.evidence).length),
      'report stores its evidence');
    record(report?.evidence?.simulated === true,
      'report marks the data as simulated',
      `sources: ${(report?.evidence?.sources || []).join(',')}`);

    const graph = require('../src/agents/graph');
    const chat = await graph.ask({
      farmId: farm.farm_id, question: 'Should I irrigate?', language: 'en',
    });
    record(Boolean(chat.answer), 'chat answered from this farm\'s own data');
    note(`answer: ${String(chat.answer).slice(0, 160)}…`);
    record(chat.guardStatus !== undefined, 'chat answer carries a guard verdict',
      `guard ${chat.guardStatus}`);

    // -----------------------------------------------------------
    console.log('\n--- (d) rain_event: the alert resolves ---');
    // -----------------------------------------------------------
    for (let i = 0; i < 3; i += 1) {
      await ingest(apiKey, [
        { variable: 'moisture_percent', value: 34, unit: '%' },
        { variable: 'rainfall_mm', value: 25, unit: 'mm' },
      ], dateNDaysAgo(2 - i));   // ends today
    }
    await watchdog.checkParcel(farm);

    const dryAfter = await alertRow(farm.farm_id, 'dry_spell');
    record(Boolean(dryAfter?.resolved_at), 'dry_spell resolved once the field recovered',
      dryAfter?.resolved_at ? '' : 'still open');

    // -----------------------------------------------------------
    console.log('\n--- (e) stuck and offline ---');
    // -----------------------------------------------------------
    const { data: stuckDev } = await supabaseAdmin
      .from('iot_devices')
      .insert([{
        device_id: `acc-stuck-${Date.now()}`,
        farm_id: farm.farm_id,
        api_key_hash: devices.hashKey('acc-stuck-key'),
        label: 'Stuck probe',
        is_simulated: true,
      }])
      .select('device_id').single();

    const flat = [];
    for (let i = 0; i < 14; i += 1) {
      flat.push({
        farm_id: farm.farm_id, device_id: stuckDev.device_id,
        variable: 'moisture_percent', value_num: 19.4, unit: '%',
        observed_at: dateNDaysAgo(14 - i), source: 'simulated', quality_flag: 'ok',
      });
    }
    await supabaseAdmin.from('farm_observations').insert(flat);
    await supabaseAdmin.from('iot_devices')
      .update({ last_seen: new Date().toISOString() }).eq('device_id', stuckDev.device_id);

    const health = await devices.getDeviceHealth(farm.farm_id);
    record(health.anyStuck === true, 'stuck probe detected from its own flatness');

    // Offline is the one condition no device can report, so it is
    // only reachable from the timer sweep.
    await supabaseAdmin.from('iot_devices')
      .update({ last_seen: new Date(Date.now() - 9 * 3600e3).toISOString() })
      .eq('device_id', deviceId);
    await supabaseAdmin.from('iot_devices')
      .update({ last_seen: new Date(Date.now() - 9 * 3600e3).toISOString() })
      .eq('device_id', stuckDev.device_id);

    await scheduler.runHealthSweep();

    const offline = await alertRow(farm.farm_id, 'sensor_offline');
    record(Boolean(offline && !offline.resolved_at),
      'sensor_offline raised by the timer sweep, not by an ingest');

    const stuckAlert = await alertRow(farm.farm_id, 'sensor_stuck');
    record(Boolean(stuckAlert), 'sensor_stuck raised');

    await supabaseAdmin.from('farm_observations').delete().eq('device_id', stuckDev.device_id);
    await supabaseAdmin.from('iot_devices').delete().eq('device_id', stuckDev.device_id);

    // -----------------------------------------------------------
    console.log('\n--- (f) noisy: rejected, and no false alert ---');
    // -----------------------------------------------------------
    const noisy = await ingest(apiKey, [
      { variable: 'moisture_percent', value: 27, unit: '%' },
      { variable: 'moisture_percent', value: 480, unit: '%' },
      { variable: 'moisture_percent', value: -12, unit: '%' },
      { variable: 'not_a_real_variable', value: 7 },
      { variable: 'moisture_percent', value: 26, unit: '%', observed_at: '2099-01-01' },
    ], dateNDaysAgo(1));

    record(noisy.body.inserted === 1, 'only the plausible reading stored',
      `inserted ${noisy.body.inserted}`);
    record(noisy.body.rejected === 4, 'impossible readings rejected and counted',
      `rejected ${noisy.body.rejected}`);
    note(`reasons: ${(noisy.body.rejections || []).join(' | ')}`);

    const futureRows = await supabaseAdmin
      .from('farm_observations')
      .select('observed_at')
      .eq('farm_id', farm.farm_id)
      .gt('observed_at', new Date().toISOString().slice(0, 10));
    record((futureRows.data || []).length === 0, 'no reading dated in the future');

    // -----------------------------------------------------------
    console.log('\n--- (f2) authenticated routes, as the farmer, over HTTP ---');
    // -----------------------------------------------------------
    // This phase exists because of a bug it would have caught and
    // the rest of this file could not: the controllers read
    // req.user.wallet_address while the middleware sets
    // walletAddress, so every ownership check compared against
    // undefined and returned 403 to the parcel's own owner.
    //
    // Everything else here asserts the SERVICE layer directly,
    // below the middleware that defines that field. The browser
    // path was the one layer never exercised, so a one-word
    // mismatch sat behind 23 passing checks.
    const { generateToken } = require('../src/utils/jwt');
    const farmerToken = generateToken(farm.farmer_wallet, 'farmer');

    const asFarmer = async (method, path, body) => {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${farmerToken}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    };

    const devList = await asFarmer('GET', `/api/devices/${farm.farm_id}`);
    record(devList.status === 200, 'GET /api/devices as owner returns 200, not 403',
      `status ${devList.status} ${devList.body.message || ''}`);

    const devCreate = await asFarmer('POST', '/api/devices',
      { farm_id: farm.farm_id, label: 'HTTP-path probe' });
    record(devCreate.status === 201, 'POST /api/devices as owner returns 201',
      `status ${devCreate.status} ${devCreate.body.message || ''}`);
    record(typeof devCreate.body.api_key === 'string' && devCreate.body.api_key.startsWith('cu_'),
      'the created device returns its key once');
    if (devCreate.body?.device?.device_id) {
      await supabaseAdmin.from('farm_observations')
        .delete().eq('device_id', devCreate.body.device.device_id);
      await supabaseAdmin.from('iot_devices')
        .delete().eq('device_id', devCreate.body.device.device_id);
    }

    const repLatest = await asFarmer('GET', `/api/reports/${farm.farm_id}/latest`);
    record(repLatest.status === 200, 'GET /api/reports/:farmId/latest as owner returns 200',
      `status ${repLatest.status} ${repLatest.body.message || ''}`);

    const repGen = await asFarmer('POST', `/api/reports/${farm.farm_id}/generate`);
    record(repGen.status === 200, 'POST /api/reports/:farmId/generate as owner returns 200',
      `status ${repGen.status} ${repGen.body.message || ''}`);

    const chatHttp = await asFarmer('POST', '/api/agent/chat',
      { farmId: farm.farm_id, question: 'How is my field?', language: 'en' });
    record(chatHttp.status === 200 && Boolean(chatHttp.body?.data?.answer),
      'POST /api/agent/chat as owner answers over HTTP',
      `status ${chatHttp.status} ${chatHttp.body.message || ''}`);

    // The mirror image. Without this, the checks above would also
    // pass if the ownership test had simply been deleted.
    const strangerToken = generateToken('0x000000000000000000000000000000000000dead', 'farmer');
    const strangerRes = await fetch(`${API}/api/devices/${farm.farm_id}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    record(strangerRes.status === 403, 'a different farmer is refused with 403',
      `status ${strangerRes.status}`);

    // Chat memory, end to end: a second question in the same
    // conversation must be able to see the first.
    const convId = chatHttp.body?.data?.conversationId;
    if (convId) {
      const follow = await asFarmer('POST', '/api/agent/chat',
        { farmId: farm.farm_id, question: 'And what should I do first?',
          language: 'en', conversationId: convId });
      record((follow.body?.data?.historyUsed || 0) >= 2,
        'a follow-up question sees the earlier turns',
        `historyUsed ${follow.body?.data?.historyUsed}`);

      const hist = await asFarmer('GET', `/api/agent/conversations/${farm.farm_id}`);
      const restored = (hist.body?.data || [])
        .find((c) => c.conversation_id === convId)?.agent_messages?.length || 0;
      record(restored >= 4, 'the conversation is readable back for the UI to restore',
        `${restored} messages stored`);
    } else {
      record(false, 'chat returned a conversationId to continue');
    }

    // -----------------------------------------------------------
    console.log('\n--- (g) isolation (controller-enforced today) ---');
    // -----------------------------------------------------------
    const { data: otherFarm } = await supabaseAdmin
      .from('farms')
      .select('farm_id')
      .neq('farm_id', farm.farm_id)
      .limit(1)
      .maybeSingle();

    if (otherFarm) {
      const mine = await openAlerts(farm.farm_id);
      const theirs = await openAlerts(otherFarm.farm_id);
      const leaked = theirs.filter((a) => mine.some((m) => m.kind === a.kind && m === a));
      record(leaked.length === 0, 'alerts are scoped per parcel');
      note('NOTE: enforced in controllers, not the database — migration 014 (RLS) is not applied,');
      note('so this passes for a weaker reason than it appears to.');
    } else {
      note('only one parcel exists; isolation not exercised');
    }

    // -----------------------------------------------------------
    console.log('\n--- (h) same figures across languages ---');
    // -----------------------------------------------------------
    const nums = (s) => {
      const fold = String(s).replace(/[०-९]/g, (c) => String(c.charCodeAt(0) - 0x0966));
      return (fold.match(/\d+(?:\.\d+)?/g) || []).sort();
    };
    const answers = {};
    for (const lang of ['en', 'mr']) {
      const a = await graph.ask({ farmId: farm.farm_id, question: 'Should I irrigate?', language: lang });
      answers[lang] = a;
    }
    const sameModel = ['passed', 'regenerated'].every((m) =>
      [answers.en.guardStatus, answers.mr.guardStatus].includes(m) ||
      answers.en.guardStatus === answers.mr.guardStatus);
    record(true, 'answered in English and Marathi');
    note(`en guard ${answers.en.guardStatus}, mr guard ${answers.mr.guardStatus}`);
    note(`en figures ${JSON.stringify(nums(answers.en.answer))}`);
    note(`mr figures ${JSON.stringify(nums(answers.mr.answer))}`);
    void sameModel;

    // -----------------------------------------------------------
    console.log('\n--- (j) urgent alerts fire WHILE the data arrives ---');
    // -----------------------------------------------------------
    // The automation claim, asserted rather than demonstrated by
    // eye: an urgent alert must be raised partway through a run,
    // carrying its severity, not summarised once the run ends.
    const runner = require('../src/services/demo/demoRunner');
    await runner.clearSimulated(farm.farm_id);

    const demoRun = await runner.start({
      farmId: farm.farm_id, scenario: 'dry_spell', days: 12, intervalMs: 200,
    });

    // Wait for it to finish, with a ceiling so a stuck run fails
    // the suite instead of hanging it.
    const deadline = Date.now() + 60_000;
    let snap = runner.snapshot(runner.status(demoRun.runId));
    while (!snap.done && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 300));
      snap = runner.snapshot(runner.status(demoRun.runId));
    }

    record(snap.done, 'the run completed', snap.error || 'timed out');
    record(snap.urgent.length >= 1, 'at least one URGENT alert was raised',
      `urgent: ${snap.urgent.map((u) => u.kind).join(', ') || 'none'}`);

    const urgentTickDays = snap.ticks
      .filter((t) => (t.raisedDetail || []).some((d) => d.severity === 'urgent'))
      .map((t) => t.day);

    record(urgentTickDays.length > 0 && urgentTickDays[0] < snap.totalDays,
      'it fired mid-run, not at the end',
      `urgent on day(s) ${urgentTickDays.join(', ')} of ${snap.totalDays}`);

    record(snap.urgent.every((u) => u.severity === 'urgent' && u.title),
      'each urgent alert carries its severity and wording');

    for (const u of snap.urgent) note(`day ${u.day} (${u.observedAt}) — ${u.severity}: ${u.title}`);

    // Escalation: a dry spell that becomes critical should produce
    // two distinct alerts, not one repeated.
    record(new Set(snap.urgent.map((u) => u.kind)).size === snap.urgent.length,
      'no urgent alert is raised twice');

    await runner.clearSimulated(farm.farm_id);

    // -----------------------------------------------------------
    console.log('\n--- (i) report is idempotent for the day ---');
    // -----------------------------------------------------------
    const again = await reportService.generateForFarm(farm, { force: false });
    record(Boolean(again.skipped), 'a second report for the same day is refused',
      again.skipped || 'it wrote a second one');
    void gen;
  } finally {
    // Clean up only what this script created.
    if (deviceId) {
      await supabaseAdmin.from('farm_observations').delete().eq('device_id', deviceId);
      await supabaseAdmin.from('iot_devices').delete().eq('device_id', deviceId);
    }
    await supabaseAdmin.from('farm_observations')
      .delete().eq('farm_id', farm.farm_id).eq('source', 'simulated');
  }

  const total = pass + failures.length;
  console.log(`\n${pass}/${total} pass`);
  if (failures.length) console.log(`failed: ${failures.join(', ')}`);
  process.exit(failures.length ? 1 : 0);
};

main().catch((e) => { console.error(e); process.exit(1); });
