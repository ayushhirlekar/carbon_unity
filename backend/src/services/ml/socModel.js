const fs = require('fs');
const path = require('path');

/**
 * Soil organic carbon from spectral features.
 *
 * The model is a scikit-learn SVR trained in SOC.ipynb and exported
 * as JSON. Inference is reimplemented here rather than served from
 * a Python process, because an RBF-kernel SVR prediction is a sum
 * over support vectors and adding a second runtime to deploy would
 * cost more than the thirty lines it saves:
 *
 *   y = Σ aᵢ · exp(−γ‖x − svᵢ‖²) + b
 *
 * That rewrite is only trustworthy because tests/socModel.test.js
 * checks it against sklearn's own predictions on every held-out
 * row. If that test is deleted, this file becomes an unverified
 * claim about someone else's maths.
 *
 * UNITS. The AfSIS target is standardized, not g/kg — it ranges
 * below zero, and organic carbon cannot. Everything here reports
 * `units: 'standardized'` and nothing converts, because the
 * competition does not publish the original scaling.
 *
 * CONFIDENCE. None is returned. The notebook's production class
 * produced one with np.random.normal(0.92, 0.03); that is a random
 * number wearing the name of a confidence interval, and on a
 * carbon-credit prediction it is the most dangerous line in the
 * file. A real one needs a conformal or quantile method.
 */

const MODEL_DIR = path.join(__dirname, '..', '..', '..', 'models');
const MODEL_FILE = process.env.SOC_MODEL_PATH || path.join(MODEL_DIR, 'soc_svr_v1.json');
const DEMO_FILE = process.env.SOC_DEMO_PATH || path.join(MODEL_DIR, 'soc_demo_rows.json');

let cache = null;

const isLoaded = () => fs.existsSync(MODEL_FILE);

/**
 * Read the export once.
 *
 * Deliberately not loaded at require() time: the file is produced
 * by running a notebook, so a checkout without it must still boot
 * the server — the feature is simply unavailable and says so.
 */
const load = () => {
  if (cache) return cache;

  if (!isLoaded()) {
    throw new Error(
      'SOC model not exported. Run the export cell in SOC.ipynb ' +
      '(backend/models/EXPORT_FROM_NOTEBOOK.py) to produce soc_svr_v1.json.'
    );
  }

  const m = JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));

  if (m.kernel !== 'rbf') throw new Error(`Only the RBF kernel is implemented; got ${m.kernel}`);
  if (!Array.isArray(m.support_vectors) || !m.support_vectors.length) {
    throw new Error('Export contains no support vectors');
  }
  if (m.dual_coef.length !== m.support_vectors.length) {
    throw new Error(
      `Export is inconsistent: ${m.dual_coef.length} coefficients for ` +
      `${m.support_vectors.length} support vectors`
    );
  }

  const nFeat = m.support_vectors[0].length;
  if (m.feature_names.length !== nFeat) {
    throw new Error(`Export is inconsistent: ${m.feature_names.length} names for ${nFeat} features`);
  }
  if (m.scaler.centre.length !== nFeat || m.scaler.scale.length !== nFeat) {
    throw new Error('Scaler parameters do not match the feature count');
  }

  cache = {
    ...m,
    nFeatures: nFeat,
    // Flattened for the inner loop: a 900×364 array of arrays is
    // noticeably slower to walk than one contiguous Float64Array,
    // and this runs once per streamed row.
    sv: Float64Array.from(m.support_vectors.flat()),
    coef: Float64Array.from(m.dual_coef),
    centre: Float64Array.from(m.scaler.centre),
    scale: Float64Array.from(m.scaler.scale),
    nSv: m.support_vectors.length,
  };

  return cache;
};

/** Apply the fitted scaler. Order matters: scale, then kernel. */
const scaleFeatures = (x, m) => {
  const out = new Float64Array(m.nFeatures);
  for (let i = 0; i < m.nFeatures; i += 1) {
    // sklearn leaves a zero-spread feature untouched rather than
    // dividing by zero, and so must this.
    const s = m.scale[i] === 0 ? 1 : m.scale[i];
    out[i] = (x[i] - m.centre[i]) / s;
  }
  return out;
};

/**
 * Predict one sample from UNSCALED features, in the exported order.
 */
const predict = (features) => {
  const m = load();

  if (!Array.isArray(features) && !ArrayBuffer.isView(features)) {
    throw new Error('features must be an array');
  }
  if (features.length !== m.nFeatures) {
    throw new Error(`Expected ${m.nFeatures} features, got ${features.length}`);
  }

  const x = scaleFeatures(features, m);

  let sum = 0;
  for (let k = 0; k < m.nSv; k += 1) {
    const base = k * m.nFeatures;
    let d2 = 0;
    for (let i = 0; i < m.nFeatures; i += 1) {
      const diff = x[i] - m.sv[base + i];
      d2 += diff * diff;
    }
    sum += m.coef[k] * Math.exp(-m.gamma * d2);
  }

  return {
    soc: sum + m.intercept,
    units: 'standardized',
    // Named rather than omitted, so a caller cannot quietly treat
    // this as g/kg.
    unitsNote: 'AfSIS target is centred and unit-variance; original g/kg scaling is unpublished',
  };
};

/**
 * Is this sample inside the range the model was trained on?
 *
 * Not a confidence score — a range check. It is the honest way to
 * show the Africa/India gap once real Indian spectra arrive: a
 * sample outside everything the model has seen should be flagged
 * rather than answered with the same assurance as one inside.
 */
const checkRange = (features) => {
  const m = load();
  const lo = m.train_range?.min;
  const hi = m.train_range?.max;
  if (!lo || !hi) return { checked: false };

  const outside = [];
  for (let i = 0; i < m.nFeatures; i += 1) {
    if (features[i] < lo[i] || features[i] > hi[i]) outside.push(m.feature_names[i]);
  }

  return {
    checked: true,
    outOfRange: outside.length,
    total: m.nFeatures,
    fraction: Number((outside.length / m.nFeatures).toFixed(4)),
    // A handful of bands outside range is ordinary; a large share
    // means the model is extrapolating and the number should not
    // be read as a measurement.
    extrapolating: outside.length / m.nFeatures > 0.1,
    examples: outside.slice(0, 5),
  };
};

/** Everything the UI needs to describe the model honestly. */
const modelInfo = () => {
  const m = load();
  return {
    kernel: m.kernel,
    features: m.nFeatures,
    supportVectors: m.nSv,
    metrics: m.metrics,
    provenance: m.provenance,
    exportedAt: m.exported_at,
    confidenceAvailable: false,
  };
};

/** The held-out rows the trial run streams. */
const demoRows = () => {
  if (!fs.existsSync(DEMO_FILE)) {
    throw new Error('No demo rows exported. Run the export cell in SOC.ipynb.');
  }
  return JSON.parse(fs.readFileSync(DEMO_FILE, 'utf8'));
};

module.exports = {
  isLoaded,
  load,
  predict,
  checkRange,
  modelInfo,
  demoRows,
  MODEL_FILE,
  DEMO_FILE,
};
