# ============================================================
# EXPORT FOR THE CARBONUNITY BACKEND  -  Google Colab version
# ============================================================
# Paste as the LAST cell of SOC.ipynb and run it after Phase 4,
# in the same runtime.
#
# Produces one zip and downloads it. Unzip into
#     D:\carbon_unity(anti)\backend\models\
# giving you:
#     soc_svr_v1.json      the model, scaler and provenance
#     soc_demo_rows.json   held-out rows the trial run streams
#     soc_parity.json      every test row + sklearn's own answers
#
# Then, in backend/:   npm run test:soc
# That checks the Node reimplementation against scikit-learn on
# every held-out row. Until it passes, the Node inference is an
# unverified claim about your model.
#
# UNITS: the AfSIS target is standardized (SOC runs -0.858 to
# 7.620, sd 1.142). It goes below zero, and organic carbon cannot,
# so it is NOT g/kg and nothing here labels it that way.
# ============================================================

import json, os, zipfile, datetime, numpy as np

# ---- find what we need, wherever it lives ----------------------------
# The trainer keeps its own copies of the splits, so a missing
# top-level name is not fatal. Only `trainer` and `scaler` must
# genuinely be present.
#
# Colab clears state on reconnect, so the usual reason this cell
# fails is that nothing has been run yet in this session. Say so
# plainly instead of raising a NameError three lines later.
if 'trainer' not in globals():
    raise SystemExit(
        "No `trainer` in this runtime - the notebook has not been run in this session. "
        "Colab clears everything on reconnect. Do: Runtime -> Run all, wait for Phase 4 "
        "to finish, then run this cell again. "
        "(Re-upload kaggle.json first; Colab does not keep that either.)"
    )

if 'scaler' not in globals():
    raise SystemExit(
        "Found `trainer` but no `scaler`. The scaler is fitted in Phase 2, in the cell "
        "'Fix the string data issue before scaling' - re-run that, then this one."
    )


def _grab(name):
    """Prefer the top-level name; fall back to the trainer's copy."""
    if name in globals():
        return globals()[name]
    if hasattr(trainer, name):
        return getattr(trainer, name)
    raise SystemExit(
        "Could not find `" + name + "` at top level or on `trainer`. "
        "Re-run the notebook from Phase 1 through Phase 4."
    )


X_train = _grab('X_train')
X_test = _grab('X_test')
X_test_scaled = _grab('X_test_scaled')
y_train = _grab('y_train')
y_test = _grab('y_test')
print('Found trainer, scaler and all four splits.')

OUT = '/content/carbonunity_models'
os.makedirs(OUT, exist_ok=True)

# ---- the chosen model -------------------------------------------------
best_name = 'Support_Vector_Regression'
if best_name not in trainer.results:
    raise SystemExit(
        "No '" + best_name + "' in trainer.results. Available: "
        + ', '.join(trainer.results.keys())
    )

res = trainer.results[best_name]
svr = res['fitted_model']

if svr.kernel != 'rbf':
    raise SystemExit(
        "Export assumes an RBF kernel; this model uses '" + str(svr.kernel) + "'. "
        "The Node side implements RBF only."
    )

gamma = float(getattr(svr, '_gamma', None) or svr.gamma)

# ---- feature order ----------------------------------------------------
# Must match what the scaler and model were fitted on, or every
# prediction is quietly wrong rather than loudly broken.
if 'feature_names' in globals():
    feat_names = [str(c) for c in feature_names]
else:
    feat_names = [str(c) for c in X_train.columns]

n_feat = len(feat_names)
if svr.support_vectors_.shape[1] != n_feat:
    raise SystemExit(
        "Feature mismatch: model expects " + str(svr.support_vectors_.shape[1])
        + ", feature_names has " + str(n_feat) + "."
    )

# ---- scaler -----------------------------------------------------------
if hasattr(scaler, 'center_'):
    scaler_kind, centre, spread = 'robust', scaler.center_, scaler.scale_
elif hasattr(scaler, 'mean_'):
    scaler_kind, centre, spread = 'standard', scaler.mean_, scaler.scale_
else:
    raise SystemExit('Unrecognised scaler; expected RobustScaler or StandardScaler.')

centre = np.asarray(centre, dtype=float)
spread = np.asarray(spread, dtype=float)

# ---- sklearn's own answers, as the parity fixture ---------------------
X_test_scaled_arr = np.asarray(X_test_scaled, dtype=float)
X_test_raw = np.asarray(X_test, dtype=float)
y_test_arr = np.asarray(y_test, dtype=float).ravel()
sk_pred = svr.predict(X_test_scaled_arr)

rmse = float(np.sqrt(np.mean((sk_pred - y_test_arr) ** 2)))
ss_res = float(np.sum((y_test_arr - sk_pred) ** 2))
ss_tot = float(np.sum((y_test_arr - y_test_arr.mean()) ** 2))
r2 = 1.0 - ss_res / ss_tot
print('Recomputed on export:  R2 = %.4f   RMSE = %.4f  (standardized units)' % (r2, rmse))

cv = res.get('cv_r2_mean')
cv = round(float(cv), 4) if cv is not None and np.isfinite(cv) else None

model_blob = {
    'schema': 'carbonunity.soc_svr/1',
    'kernel': 'rbf',
    'gamma': gamma,
    'intercept': float(np.asarray(svr.intercept_).ravel()[0]),
    'dual_coef': np.asarray(svr.dual_coef_, dtype=float).ravel().tolist(),
    'support_vectors': np.asarray(svr.support_vectors_, dtype=float).tolist(),
    'feature_names': feat_names,
    'scaler': {'kind': scaler_kind, 'centre': centre.tolist(), 'scale': spread.tolist()},
    # Envelope of the training data, so a sample outside anything
    # the model has seen is flagged rather than answered with the
    # same assurance as one inside.
    'train_range': {
        'min': np.asarray(X_train, dtype=float).min(axis=0).tolist(),
        'max': np.asarray(X_train, dtype=float).max(axis=0).tolist(),
    },
    'metrics': {
        'r2_test': round(r2, 4),
        'rmse_test': round(rmse, 4),
        'cv_r2_mean': cv,
        'n_train': int(len(X_train)),
        'n_test': int(len(X_test)),
        'units': 'standardized',
    },
    'provenance': {
        'dataset': 'Africa Soil Property Prediction Challenge (AfSIS), Kaggle',
        'region': 'sub-Saharan Africa',
        'target_units': ('standardized (centred, unit-variance); the original g/kg '
                         'scaling is not published by the competition'),
        'target_range_train': [float(np.min(y_train)), float(np.max(y_train))],
        'calibrated_for_india': False,
        'caveat': ('Trained on sub-Saharan African soils. Not calibrated to Indian soils - '
                   'a prediction for a Maharashtra parcel demonstrates the model, it is not '
                   'a measurement of that soil.'),
        'confidence_available': False,
        'confidence_note': ("No per-prediction confidence is exported. The notebook's "
                            'ProductionSOCModel produced one with np.random.normal, which is '
                            'a random number, not a confidence interval. A real one needs a '
                            'conformal or quantile method.'),
    },
    'exported_at': datetime.datetime.utcnow().isoformat() + 'Z',
}

with open(OUT + '/soc_svr_v1.json', 'w') as f:
    json.dump(model_blob, f)

# ---- parity fixture: unscaled rows + sklearn's predictions ------------
with open(OUT + '/soc_parity.json', 'w') as f:
    json.dump({
        'schema': 'carbonunity.soc_parity/1',
        'feature_names': feat_names,
        'rows': X_test_raw.tolist(),
        'sklearn_predictions': sk_pred.tolist(),
        'y_true': y_test_arr.tolist(),
    }, f)

# ---- rows the trial run streams ---------------------------------------
# Spread across the SOC range rather than the first N, so the
# scatter shows the model across its whole working range instead of
# clustering wherever the split happened to start. Shuffled after,
# because arriving in sorted order would draw a suspiciously tidy
# line.
N_DEMO = 60
order = np.argsort(y_test_arr)
pick = order[np.linspace(0, len(order) - 1, min(N_DEMO, len(order))).astype(int)]
pick = np.random.default_rng(7).permutation(pick)

with open(OUT + '/soc_demo_rows.json', 'w') as f:
    json.dump({
        'schema': 'carbonunity.soc_demo/1',
        'feature_names': feat_names,
        'units': 'standardized',
        'rows': [
            {'sample': int(i),
             'features': X_test_raw[i].tolist(),
             'y_true': float(y_test_arr[i])}
            for i in pick
        ],
    }, f)

# ---- one zip, because three separate Colab downloads is three
# ---- chances for one to fail quietly ----------------------------------
ZIP = '/content/carbonunity_soc_export.zip'
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name in ['soc_svr_v1.json', 'soc_parity.json', 'soc_demo_rows.json']:
        p = OUT + '/' + name
        z.write(p, name)
        print('  %-22s %6.2f MB' % (name, os.path.getsize(p) / 1e6))

print('\nzip: %.2f MB' % (os.path.getsize(ZIP) / 1e6))

from google.colab import files
files.download(ZIP)

print(
    "\nDownloaded carbonunity_soc_export.zip.\n"
    "\nNext:\n"
    "  1. Unzip the three .json files into\n"
    "         D:\\carbon_unity(anti)\\backend\\models\\\n"
    "  2. cd backend\n"
    "  3. npm run test:soc\n"
    "\nStep 3 checks this model against scikit-learn's own predictions on all "
    + str(len(y_test_arr)) + " held-out rows.\n"
)
