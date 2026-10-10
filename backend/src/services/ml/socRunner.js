const soc = require('./socModel');

/**
 * Spectral trial run.
 *
 * Streams held-out samples into the SOC model one at a time, the
 * same shape as the IoT trial run in services/demo/demoRunner.js —
 * same registry, same clamps, same polling contract — so the two
 * read as one system rather than two features that happen to sit
 * on one page.
 *
 * These rows carry a known answer, which the IoT run does not. So
 * this run can show something the other cannot: the error on every
 * prediction, as it happens, against ground truth. That is the
 * honest way to demonstrate a model — not a confidence number, but
 * the residual.
 */

const runs = new Map();

const MIN_INTERVAL_MS = 100;
const MAX_INTERVAL_MS = 4000;
const MAX_ROWS = 300;
const RUN_TTL_MS = 30 * 60 * 1000;

const clamp = (v, lo, hi, dflt) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, Math.round(n)));
};

const sweep = () => {
  const now = Date.now();
  for (const [id, r] of runs) {
    if (!r.running && now - r.finishedAt > RUN_TTL_MS) runs.delete(id);
  }
};

/** Running R² and RMSE, recomputed from everything seen so far. */
const runningStats = (ticks) => {
  const n = ticks.length;
  if (!n) return { n: 0 };

  let se = 0;
  let sumTrue = 0;
  for (const t of ticks) { se += (t.predicted - t.actual) ** 2; sumTrue += t.actual; }
  const meanTrue = sumTrue / n;

  let ssTot = 0;
  for (const t of ticks) ssTot += (t.actual - meanTrue) ** 2;

  return {
    n,
    rmse: Number(Math.sqrt(se / n).toFixed(4)),
    mae: Number((ticks.reduce((s, t) => s + Math.abs(t.predicted - t.actual), 0) / n).toFixed(4)),
    // R² is undefined for one point and meaningless for two or
    // three; reporting 1.000 off a single sample would be the kind
    // of number that looks like proof and is not.
    r2: n >= 5 && ssTot > 0 ? Number((1 - se / ssTot).toFixed(4)) : null,
    units: 'standardized',
  };
};

const start = ({ rows, intervalMs }) => {
  sweep();

  const fixture = soc.demoRows();
  const available = fixture.rows.length;
  const take = clamp(rows, 1, Math.min(MAX_ROWS, available), Math.min(40, available));
  const gap = clamp(intervalMs, MIN_INTERVAL_MS, MAX_INTERVAL_MS, 700);

  const runId = `soc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const info = soc.modelInfo();

  const run = {
    runId,
    running: true,
    stopped: false,
    startedAt: Date.now(),
    finishedAt: null,
    totalRows: take,
    intervalMs: gap,
    ticks: [],
    flagged: 0,
    error: null,
    model: info,
  };
  runs.set(runId, run);

  (async () => {
    try {
      for (let i = 0; i < take; i += 1) {
        if (run.stopped) break;

        const row = fixture.rows[i];
        const t0 = Date.now();
        const out = soc.predict(row.features);
        const range = soc.checkRange(row.features);
        const ms = Date.now() - t0;

        // Completeness measured from the row itself rather than
        // assumed: a real spectrometer drops bands, and a missing
        // band is not a zero reading.
        const present = row.features.filter((v) => v !== null && Number.isFinite(v)).length;
        const completeness = Number((present / row.features.length).toFixed(4));

        if (range.extrapolating) run.flagged += 1;

        run.ticks.push({
          index: i + 1,
          sample: row.sample,
          predicted: Number(out.soc.toFixed(4)),
          actual: Number(row.y_true.toFixed(4)),
          error: Number((out.soc - row.y_true).toFixed(4)),
          absError: Number(Math.abs(out.soc - row.y_true).toFixed(4)),
          completeness,
          outOfRange: range.outOfRange ?? null,
          extrapolating: Boolean(range.extrapolating),
          ms,
        });

        if (i < take - 1 && !run.stopped) await new Promise((r) => setTimeout(r, gap));
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
  const r = runs.get(runId);
  if (!r) return null;
  r.stopped = true;
  return r;
};

const snapshot = (run) => ({
  runId: run.runId,
  running: run.running,
  stopped: run.stopped,
  done: !run.running,
  totalRows: run.totalRows,
  intervalMs: run.intervalMs,
  ticks: run.ticks,
  flagged: run.flagged,
  stats: runningStats(run.ticks),
  model: run.model,
  error: run.error,
});

module.exports = { start, status, stop, snapshot, MIN_INTERVAL_MS, MAX_INTERVAL_MS, MAX_ROWS };
