const runner = require('../services/demo/demoRunner');
const { catalogue } = require('../services/demo/scenarios');
const { supabaseAdmin } = require('../config/supabase');
const graph = require('../agents/graph');

/**
 * Trial data runs, driven from the app.
 *
 * Everything here writes source='simulated' through the same
 * ingest path a real probe uses. Ownership is checked on every
 * route: a run writes observations that feed the advice for a
 * parcel, so being able to start one on someone else's land would
 * be a way to shape what they are told to do.
 */

const ownsFarm = async (farmId, user) => {
  const { data: farm } = await supabaseAdmin
    .from('farms')
    .select('farm_id, name, farmer_wallet')
    .eq('farm_id', farmId)
    .maybeSingle();

  if (!farm) return { ok: false, status: 404, message: 'Parcel not found' };
  if (farm.farmer_wallet !== user?.walletAddress && user?.role !== 'admin') {
    return { ok: false, status: 403, message: 'That parcel is not yours' };
  }
  return { ok: true, farm };
};

/** GET /api/demo/scenarios */
const scenarios = (req, res) =>
  res.json({
    success: true,
    scenarios: catalogue(),
    limits: {
      maxDays: runner.MAX_DAYS,
      minIntervalMs: runner.MIN_INTERVAL_MS,
      maxIntervalMs: runner.MAX_INTERVAL_MS,
    },
  });

/** POST /api/demo/:farmId/start */
const start = async (req, res) => {
  try {
    const owned = await ownsFarm(req.params.farmId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ success: false, message: owned.message });

    const { scenario, days, intervalMs, reset } = req.body || {};
    if (!scenario) return res.status(400).json({ success: false, message: 'Pick a scenario' });

    const run = await runner.start({
      farmId: req.params.farmId,
      scenario,
      days,
      intervalMs,
      reset: reset === true,
      createdBy: req.user?.walletAddress,
    });

    // Returns immediately with the id. The run continues in the
    // background and the client polls it — that delay is the
    // demo, not an inconvenience to be engineered away.
    return res.status(202).json({ success: true, run: runner.snapshot(run) });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

/** GET /api/demo/:farmId/run/:runId */
const status = async (req, res) => {
  try {
    const owned = await ownsFarm(req.params.farmId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ success: false, message: owned.message });

    const run = runner.status(req.params.runId);
    if (!run) return res.status(404).json({ success: false, message: 'No such run — it may have expired' });
    if (run.farmId !== req.params.farmId) {
      return res.status(403).json({ success: false, message: 'That run is not for this parcel' });
    }

    return res.json({ success: true, run: runner.snapshot(run) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/** POST /api/demo/:farmId/run/:runId/stop */
const stop = async (req, res) => {
  try {
    const owned = await ownsFarm(req.params.farmId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ success: false, message: owned.message });

    const run = runner.stop(req.params.runId);
    if (!run) return res.status(404).json({ success: false, message: 'No such run' });

    return res.json({ success: true, run: runner.snapshot(run) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/** POST /api/demo/:farmId/clear — remove this parcel's simulated rows. */
const clear = async (req, res) => {
  try {
    const owned = await ownsFarm(req.params.farmId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ success: false, message: owned.message });

    await runner.clearSimulated(req.params.farmId);
    return res.json({ success: true, message: 'Simulated readings and device alerts cleared' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/demo/:farmId/interpret
 *
 * Runs the agent graph over whatever the run just produced, so the
 * loop closes on one screen: data arrives, alerts fire, and the
 * agents are asked what it means.
 */
const interpret = async (req, res) => {
  try {
    const owned = await ownsFarm(req.params.farmId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ success: false, message: owned.message });

    const question = req.body?.question || 'What is happening in my field and what should I do?';
    const result = await graph.ask({
      farmId: req.params.farmId,
      question,
      language: req.body?.language || 'en',
    });

    return res.json({
      success: true,
      question,
      answer: result.answer,
      guardStatus: result.guardStatus,
      agentsUsed: result.agentsUsed,
      facts: result.facts,
      modelNotice: result.modelNotice || null,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { scenarios, start, status, stop, clear, interpret };
