import { useEffect, useRef, useState } from 'react';
import mlService from '../../services/mlService';

/**
 * Spectral SOC model — trial run.
 *
 * Mirrors the IoT trial above it: pick a size, press Start, watch
 * rows arrive. The difference is that these rows carry a known
 * answer, so this one can show the error on every prediction as it
 * happens.
 *
 * That is deliberate. A model demo that shows only its outputs
 * invites you to trust them; one that shows the residual against
 * truth lets you judge them. The notebook's own confidence score
 * was np.random.normal(0.92, 0.03) — a random number named like a
 * guarantee — and it is not carried here. What is shown instead is
 * measured: predicted against actual, running RMSE, and how far
 * each sample sits outside the model's training range.
 *
 * Units are standardized throughout, never g/kg. The AfSIS target
 * is centred and unit-variance — it goes below zero, and organic
 * carbon cannot — so "g/kg" would be a false claim of laboratory
 * precision.
 */

const SPEEDS = [
  { label: 'Slow', intervalMs: 1400 },
  { label: 'Normal', intervalMs: 700 },
  { label: 'Fast', intervalMs: 200 },
];

/** Predicted vs actual, with the 1:1 line. */
function AgreementPlot({ ticks }) {
  const W = 320;
  const H = 240;
  const PAD = 34;

  if (!ticks.length) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-surface-300 text-xs text-surface-400">
        Predictions will plot here
      </div>
    );
  }

  const vals = ticks.flatMap((t) => [t.predicted, t.actual]);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 1e-6) { lo -= 0.5; hi += 0.5; }
  const pad = (hi - lo) * 0.08;
  lo -= pad; hi += pad;

  const sx = (v) => PAD + ((v - lo) / (hi - lo)) * (W - PAD - 10);
  const sy = (v) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD - 10);

  const ticksAxis = [lo, (lo + hi) / 2, hi];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Predicted versus actual soil organic carbon, standardized units">
      {/* 1:1 line — agreement means points sit on it. A fitted
          trend line would flatter the model; this does not. */}
      <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(hi)}
        stroke="currentColor" className="text-surface-300" strokeDasharray="4 3" />

      <line x1={PAD} y1={H - PAD} x2={W - 6} y2={H - PAD} stroke="currentColor" className="text-surface-300" />
      <line x1={PAD} y1={6} x2={PAD} y2={H - PAD} stroke="currentColor" className="text-surface-300" />

      {ticksAxis.map((v) => (
        <g key={`x${v}`}>
          <text x={sx(v)} y={H - PAD + 12} textAnchor="middle" className="fill-surface-400" fontSize="8">
            {v.toFixed(1)}
          </text>
          <text x={PAD - 5} y={sy(v) + 3} textAnchor="end" className="fill-surface-400" fontSize="8">
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      {ticks.map((t) => (
        <circle
          key={t.index}
          cx={sx(t.actual)}
          cy={sy(t.predicted)}
          r="3.5"
          className={t.extrapolating ? 'fill-amber-500' : 'fill-brand-600'}
          opacity="0.75"
        >
          <title>{`sample ${t.sample}: predicted ${t.predicted}, actual ${t.actual}`}</title>
        </circle>
      ))}

      <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-surface-500" fontSize="9">
        actual (standardized)
      </text>
      <text x={10} y={H / 2} textAnchor="middle" fontSize="9"
        className="fill-surface-500" transform={`rotate(-90 10 ${H / 2})`}>
        predicted
      </text>
    </svg>
  );
}

export default function SocTrialPanel() {
  const [model, setModel] = useState(null);
  const [unavailable, setUnavailable] = useState(null);
  const [rows, setRows] = useState(40);
  const [speed, setSpeed] = useState(1);
  const [run, setRun] = useState(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    mlService.info()
      .then((d) => setModel(d.model))
      .catch((e) => setUnavailable(e.response?.data?.message || 'Model not available'));
  }, []);

  useEffect(() => {
    if (!run?.runId || run.done) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return undefined;
    }
    pollRef.current = setInterval(async () => {
      try { setRun(await mlService.status(run.runId)); } catch { /* expired */ }
    }, 700);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [run?.runId, run?.done]);

  useEffect(() => {
    tableRef.current?.scrollTo({ top: tableRef.current.scrollHeight, behavior: 'smooth' });
  }, [run?.ticks?.length]);

  const start = async () => {
    setStarting(true);
    try {
      setRun(await mlService.start({ rows: Number(rows), intervalMs: SPEEDS[speed].intervalMs }));
    } catch (e) {
      setUnavailable(e.response?.data?.message || 'Could not start the run');
    } finally {
      setStarting(false);
    }
  };

  const stop = async () => {
    try { setRun(await mlService.stop(run.runId)); } catch { /* already done */ }
  };

  // The model has to be exported from the notebook first. Say what
  // to do rather than showing a broken panel.
  if (unavailable && !model) {
    return (
      <section className="rounded-2xl border border-surface-200 bg-white p-4">
        <h2 className="text-base font-semibold text-surface-900">3 · Spectral SOC model</h2>
        <p className="mt-2 text-sm text-surface-600">{unavailable}</p>
        <p className="mt-1 text-xs text-surface-500">
          Run the export cell at <code className="font-mono">backend/models/EXPORT_FROM_NOTEBOOK.py</code>{' '}
          from <code className="font-mono">SOC.ipynb</code>, then reload.
        </p>
      </section>
    );
  }

  const stats = run?.stats;

  return (
    <section className="rounded-2xl border border-surface-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-surface-900">3 · Spectral SOC model</h2>
        {model && (
          <span className="font-mono text-[11px] text-surface-500">
            SVR · {model.features} features · R² {model.metrics.r2_test} · RMSE {model.metrics.rmse_test}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-surface-500">
        Feeds held-out spectral samples through the trained model one at a time. Each carries a
        known value, so the error is shown as it happens.
      </p>

      {/* Provenance, always visible. A prediction without it invites
          being read as a measurement of this plot. */}
      {model?.provenance && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[11px] leading-relaxed text-amber-900">
            <span className="font-semibold">Trained on {model.provenance.region}</span>
            {' '}({model.metrics.n_train} samples). Not calibrated to Indian soils — these
            predictions demonstrate the model, they are not a measurement of your plot.
            Values are <span className="font-semibold">standardized units</span>, not g/kg;
            the original scaling is not published by the dataset.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-surface-700">
          Samples
          <input
            type="number" min="1" max="300" value={rows}
            onChange={(e) => setRows(e.target.value)}
            className="mt-1 block w-20 rounded-lg border border-surface-300 px-2 py-1.5 text-sm"
          />
        </label>

        <div className="text-xs font-medium text-surface-700">
          Speed
          <div className="mt-1 flex rounded-lg border border-surface-300 p-0.5">
            {SPEEDS.map((s, i) => (
              <button key={s.label} type="button" onClick={() => setSpeed(i)}
                className={`rounded-md px-3 py-1 text-xs ${speed === i ? 'bg-brand-600 text-white' : 'text-surface-600'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {run?.running ? (
          <button type="button" onClick={stop}
            className="ml-auto rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700">
            Stop
          </button>
        ) : (
          <button type="button" onClick={start} disabled={starting}
            className="ml-auto rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {starting ? 'Starting…' : 'Run model'}
          </button>
        )}
      </div>

      {run && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* table */}
          <div>
            <div ref={tableRef} className="max-h-72 overflow-y-auto rounded-xl border border-surface-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-100 text-surface-600">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">#</th>
                    <th className="px-2 py-1.5 font-semibold">Sample</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Predicted</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Actual</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Error</th>
                    <th className="px-2 py-1.5 font-semibold">Quality</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {run.ticks.map((t) => (
                    <tr key={t.index} className="border-t border-surface-100">
                      <td className="px-2 py-1 text-surface-400">{t.index}</td>
                      <td className="px-2 py-1 text-surface-600">{t.sample}</td>
                      <td className="px-2 py-1 text-right font-semibold text-surface-900">{t.predicted}</td>
                      <td className="px-2 py-1 text-right text-surface-700">{t.actual}</td>
                      <td className={`px-2 py-1 text-right ${Math.abs(t.error) > 0.5 ? 'text-rose-600' : 'text-surface-600'}`}>
                        {t.error > 0 ? '+' : ''}{t.error}
                      </td>
                      <td className="px-2 py-1">
                        {t.extrapolating ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                            outside training range
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700">
                            {Math.round(t.completeness * 100)}% bands
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!run.ticks.length && (
                    <tr><td colSpan="6" className="px-2 py-3 text-surface-400">Waiting for the first prediction…</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[11px] text-surface-500">
              {run.ticks.length}/{run.totalRows} samples · all values standardized
            </p>
          </div>

          {/* plot + quality */}
          <div className="space-y-3">
            <div className="rounded-xl border border-surface-200 p-2">
              <AgreementPlot ticks={run.ticks} />
              <p className="px-1 text-[10px] text-surface-500">
                Dashed line is perfect agreement. Amber points sit outside the training range.
              </p>
            </div>

            <div className="rounded-xl border border-surface-200 p-3">
              <p className="text-xs font-semibold text-surface-700">Data quality</p>
              <dl className="mt-1.5 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <dt className="text-surface-500">samples</dt><dd className="text-surface-900">{stats?.n ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-surface-500">RMSE</dt>
                  <dd className="font-semibold text-surface-900">{stats?.rmse ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-surface-500">MAE</dt><dd className="text-surface-900">{stats?.mae ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-surface-500">R²</dt>
                  {/* Withheld below five points rather than shown as
                      1.000 off two samples, which would look like
                      proof and be an artefact. */}
                  <dd className="text-surface-900">{stats?.r2 ?? 'needs ≥5'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-surface-500">out of range</dt>
                  <dd className={run.flagged ? 'text-amber-700' : 'text-surface-900'}>{run.flagged}</dd>
                </div>
              </dl>
              {run.done && stats?.rmse !== undefined && model && (
                <p className="mt-2 text-[11px] text-surface-500">
                  Notebook reported RMSE {model.metrics.rmse_test} on the full test set.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
