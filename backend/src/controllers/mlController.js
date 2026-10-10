const runner = require('../services/ml/socRunner');
const soc = require('../services/ml/socModel');

/**
 * The spectral model trial run.
 *
 * No parcel ownership check here, unlike the IoT routes: this run
 * touches no parcel and writes nothing to the database. It streams
 * held-out rows from the model's own test split through the model
 * and reports the error. Authentication is still required, because
 * the model file is the project's work.
 *
 * Nothing here writes to soil_samples. The model is trained on
 * sub-Saharan African soils and is not calibrated for Maharashtra,
 * and soil_samples feeds carbon credit calculations — so a
 * prediction from it is something to look at, not something to
 * credit. That boundary is deliberate.
 */

const unavailable = (res, e) =>
  res.status(503).json({
    success: false,
    available: false,
    message: e.message,
  });

/** GET /api/ml/soc/info */
const info = (req, res) => {
  try {
    return res.json({ success: true, available: true, model: soc.modelInfo() });
  } catch (e) {
    return unavailable(res, e);
  }
};

/** POST /api/ml/soc/start */
const start = (req, res) => {
  try {
    const run = runner.start({ rows: req.body?.rows, intervalMs: req.body?.intervalMs });
    return res.status(202).json({ success: true, run: runner.snapshot(run) });
  } catch (e) {
    return unavailable(res, e);
  }
};

/** GET /api/ml/soc/run/:runId */
const status = (req, res) => {
  const run = runner.status(req.params.runId);
  if (!run) return res.status(404).json({ success: false, message: 'No such run — it may have expired' });
  return res.json({ success: true, run: runner.snapshot(run) });
};

/** POST /api/ml/soc/run/:runId/stop */
const stop = (req, res) => {
  const run = runner.stop(req.params.runId);
  if (!run) return res.status(404).json({ success: false, message: 'No such run' });
  return res.json({ success: true, run: runner.snapshot(run) });
};

module.exports = { info, start, status, stop };
