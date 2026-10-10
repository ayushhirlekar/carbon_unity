/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * SOC model — kernel correctness and sklearn parity.
 *
 * Run: node tests/socModel.test.js      (from backend/)
 *
 * Two halves, and both matter:
 *
 *  1. MATHS. A hand-worked RBF-SVR with numbers computed on paper.
 *     Runs with no exported model, so the implementation can be
 *     checked before anyone has run the notebook, and a later edit
 *     to the kernel fails here immediately.
 *
 *  2. PARITY. Every held-out row against scikit-learn's own
 *     predictions. This is the condition under which
 *     reimplementing someone else's estimator in another language
 *     is acceptable at all. Without it, services/ml/socModel.js is
 *     an unverified claim.
 */

let pass = 0;
const failures = [];
const record = (ok, name, detail) => {
  if (ok) { pass += 1; console.log(`PASS  ${name}`); }
  else { failures.push(name); console.log(`FAIL  ${name}${detail ? `  — ${detail}` : ''}`); }
};
const close = (a, b, tol) => Math.abs(a - b) <= tol;

// ---------------------------------------------------------------
// 1. Hand-worked kernel
// ---------------------------------------------------------------
// Two features, two support vectors, gamma 0.5,
// dual coefficients [1.5, -0.5], intercept 0.25.
//
//   x = [1, 0]  (identity scaler)
//   sv1 = [0,0] -> ‖x-sv‖² = 1 -> exp(-0.5) = 0.6065306597126334
//   sv2 = [1,1] -> ‖x-sv‖² = 1 -> exp(-0.5) = 0.6065306597126334
//   Σ = (1.5 - 0.5) * 0.6065306597126334 = 0.6065306597126334
//   y = Σ + 0.25 = 0.8565306597126334
const EXP_HALF = Math.exp(-0.5);

const fixture = (scaler) => ({
  schema: 'carbonunity.soc_svr/1',
  kernel: 'rbf',
  gamma: 0.5,
  intercept: 0.25,
  dual_coef: [1.5, -0.5],
  support_vectors: [[0, 0], [1, 1]],
  feature_names: ['a', 'b'],
  scaler,
  train_range: { min: [-5, -5], max: [5, 5] },
  metrics: { r2_test: 0.9, rmse_test: 0.3, units: 'standardized' },
  provenance: { calibrated_for_india: false, region: 'test' },
  exported_at: '2026-01-01T00:00:00Z',
});

const withModel = (blob, fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'socmodel-'));
  const file = path.join(dir, 'model.json');
  fs.writeFileSync(file, JSON.stringify(blob));
  const prev = process.env.SOC_MODEL_PATH;
  process.env.SOC_MODEL_PATH = file;
  delete require.cache[require.resolve('../src/services/ml/socModel')];
  const mod = require('../src/services/ml/socModel');
  try { return fn(mod); } finally {
    if (prev === undefined) delete process.env.SOC_MODEL_PATH; else process.env.SOC_MODEL_PATH = prev;
    fs.rmSync(dir, { recursive: true, force: true });
    delete require.cache[require.resolve('../src/services/ml/socModel')];
  }
};

console.log('--- kernel maths, worked by hand ---');

withModel(fixture({ kind: 'robust', centre: [0, 0], scale: [1, 1] }), (m) => {
  const got = m.predict([1, 0]).soc;
  const want = EXP_HALF + 0.25;
  record(close(got, want, 1e-12), 'identity scaler: y = Σaᵢ·exp(−γd²) + b',
    `got ${got}, want ${want}`);

  // x = sv1 exactly: d²=0 for sv1, d²=2 for sv2.
  const got2 = m.predict([0, 0]).soc;
  const want2 = 1.5 * 1 + -0.5 * Math.exp(-1) + 0.25;
  record(close(got2, want2, 1e-12), 'zero distance gives exp(0) = 1', `got ${got2}, want ${want2}`);
});

// The scaler must run BEFORE the kernel. Centre [1,2] scale [2,4]
// maps [3,6] -> [1,1], which sits exactly on sv2.
withModel(fixture({ kind: 'robust', centre: [1, 2], scale: [2, 4] }), (m) => {
  const got = m.predict([3, 6]).soc;
  const want = 1.5 * Math.exp(-1) + -0.5 * 1 + 0.25;
  record(close(got, want, 1e-12), 'scaler is applied before the kernel', `got ${got}, want ${want}`);
});

// sklearn leaves a zero-variance feature alone instead of dividing
// by zero; dividing here would produce Infinity and a NaN answer.
withModel(fixture({ kind: 'robust', centre: [0, 0], scale: [0, 1] }), (m) => {
  const out = m.predict([5, 0]);
  record(Number.isFinite(out.soc), 'a zero-spread feature does not divide by zero',
    `got ${out.soc}`);
});

console.log('\n--- the contract the UI depends on ---');

withModel(fixture({ kind: 'robust', centre: [0, 0], scale: [1, 1] }), (m) => {
  const out = m.predict([1, 0]);
  record(out.units === 'standardized', 'predictions are labelled standardized, never g/kg');
  record(!('confidence' in out) && !('confidence_score' in out),
    'no confidence figure is attached to a prediction');
  record(m.modelInfo().confidenceAvailable === false,
    'modelInfo states that confidence is unavailable');
  record(m.modelInfo().provenance.calibrated_for_india === false,
    'provenance records that it is not calibrated for India');

  let threw = null;
  try { m.predict([1]); } catch (e) { threw = e.message; }
  record(Boolean(threw && /Expected 2 features/.test(threw)),
    'a wrong-length feature vector is refused, not padded', threw || 'did not throw');

  const r = m.checkRange([99, 0]);
  record(r.checked && r.outOfRange === 1,
    'out-of-training-range features are counted', JSON.stringify(r));
});

// An inconsistent export must fail at load, not produce quiet
// nonsense for every prediction afterwards.
withModel({ ...fixture({ kind: 'robust', centre: [0, 0], scale: [1, 1] }), dual_coef: [1.5] }, (m) => {
  let threw = null;
  try { m.predict([1, 0]); } catch (e) { threw = e.message; }
  record(Boolean(threw && /inconsistent/i.test(threw)),
    'a malformed export is rejected at load', threw || 'did not throw');
});

// ---------------------------------------------------------------
// 2. Parity with scikit-learn
// ---------------------------------------------------------------
console.log('\n--- parity with scikit-learn on every held-out row ---');

const PARITY = process.env.SOC_PARITY_PATH
  || path.join(__dirname, '..', 'models', 'soc_parity.json');

if (!fs.existsSync(PARITY)) {
  console.log('SKIP  no soc_parity.json yet — run the export cell in SOC.ipynb');
  console.log('      (backend/models/EXPORT_FROM_NOTEBOOK.py)');
  console.log('      The kernel maths above is checked regardless.');
} else {
  delete require.cache[require.resolve('../src/services/ml/socModel')];
  const soc = require('../src/services/ml/socModel');
  const fx = JSON.parse(fs.readFileSync(PARITY, 'utf8'));

  let worst = 0;
  let worstRow = -1;
  let se = 0;
  for (let i = 0; i < fx.rows.length; i += 1) {
    const mine = soc.predict(fx.rows[i]).soc;
    const theirs = fx.sklearn_predictions[i];
    const d = Math.abs(mine - theirs);
    if (d > worst) { worst = d; worstRow = i; }
    const err = mine - fx.y_true[i];
    se += err * err;
  }

  record(worst < 1e-6, `JS matches sklearn on all ${fx.rows.length} rows`,
    `worst difference ${worst.toExponential(3)} at row ${worstRow}`);

  // The end-to-end proof that the exported model IS the trained
  // model: recomputing RMSE here should land on the notebook's.
  const rmse = Math.sqrt(se / fx.rows.length);
  const expected = soc.modelInfo().metrics.rmse_test;
  record(close(rmse, expected, 5e-3),
    'recomputed RMSE matches the exported metric',
    `recomputed ${rmse.toFixed(4)}, exported ${expected} (standardized units)`);

  console.log(`      worst |JS − sklearn| = ${worst.toExponential(3)}`);
  console.log(`      RMSE ${rmse.toFixed(4)} standardized units`);
}

const total = pass + failures.length;
console.log(`\n${pass}/${total} pass`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
