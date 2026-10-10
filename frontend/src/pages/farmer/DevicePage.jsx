import { useEffect, useRef, useState, useCallback } from 'react';
import farmerService from '../../services/farmerService';
import deviceService from '../../services/deviceService';
import demoService from '../../services/demoService';
import AgentTrace from '../../components/farmer/AgentTrace';
import SocTrialPanel from '../../components/farmer/SocTrialPanel';
import { useToast } from '../../components/common/Toast';

/**
 * Devices and trial data.
 *
 * Three sections in the order the work happens: connect something,
 * send it data, watch what the system does with that data.
 *
 * The third is the point. A screenshot of a dashboard proves
 * nothing; watching a reading arrive, the Watchdog fire on the day
 * it crosses a threshold, and the agents then explain it, shows
 * the loop actually closing. So the run is paced deliberately
 * rather than completed as fast as possible.
 *
 * Everything written here is source='simulated' and labelled as
 * such wherever it appears. A demo that is indistinguishable from
 * real data is not a demo, it is a misleading claim.
 */

const SPEEDS = [
  { label: 'Slow', intervalMs: 2500, hint: 'for narrating to a room' },
  { label: 'Normal', intervalMs: 1200, hint: 'default' },
  { label: 'Fast', intervalMs: 400, hint: 'when you just need the result' },
];

const ALERT_LABEL = {
  dry_spell: 'Field is drying out',
  moisture_critical: 'Soil is very dry',
  sensor_stuck: 'Sensor may be stuck',
  sensor_offline: 'Sensor stopped reporting',
  limiting_factor: 'Limiting factor identified',
  dry_spell_ahead: 'Little rain forecast',
  feed_stale: 'Readings are stale',
  needs_baseline: 'Needs a second soil reading',
  no_soil_data: 'No soil data yet',
  credit_ready: 'Carbon gain measured',
};
const alertName = (k) => ALERT_LABEL[k] || k.replace(/_/g, ' ');

export default function DevicePage() {
  const toast = useToast();

  const [parcels, setParcels] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [loading, setLoading] = useState(true);

  const [health, setHealth] = useState(null);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState(null);

  const [scenarios, setScenarios] = useState([]);
  const [scenario, setScenario] = useState('dry_spell');
  const [days, setDays] = useState(14);
  const [speed, setSpeed] = useState(1);
  const [reset, setReset] = useState(true);

  const [run, setRun] = useState(null);
  const [starting, setStarting] = useState(false);
  const [reading, setReading] = useState(null);
  const [interpreting, setInterpreting] = useState(false);

  const pollRef = useRef(null);
  const feedRef = useRef(null);
  // Urgent alerts already announced, so a 1s poll does not raise
  // the same one twelve times.
  const announcedRef = useRef(new Set());

  // --- load -------------------------------------------------------
  useEffect(() => {
    farmerService.listParcels()
      .then((list) => {
        setParcels(list);
        if (list.length) setFarmId(list[0].farmId);
      })
      .catch(() => toast.error('Could not load your plots'))
      .finally(() => setLoading(false));
    demoService.scenarios().then((d) => setScenarios(d.scenarios)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHealth = useCallback(async () => {
    if (!farmId) return;
    try { setHealth(await deviceService.list(farmId)); } catch { /* shown as empty */ }
  }, [farmId]);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  // --- polling ----------------------------------------------------
  // Stopped as soon as the run finishes: a timer left running
  // against a finished run is a request every second forever.
  useEffect(() => {
    if (!run?.runId || run.done) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return undefined;
    }
    pollRef.current = setInterval(async () => {
      try {
        const s = await demoService.status(farmId, run.runId);
        setRun(s);

        // The automation, made audible. An urgent alert raised
        // halfway through a run is the whole point of monitoring,
        // and a line scrolling past in a list is easy to miss
        // while narrating.
        for (const u of s.urgent || []) {
          if (!announcedRef.current.has(u.kind)) {
            announcedRef.current.add(u.kind);
            toast.error(`Urgent — ${u.title}`);
          }
        }

        if (s.done) { loadHealth(); }
      } catch { /* the run expires after a while; the view keeps what it has */ }
    }, 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [run?.runId, run?.done, farmId, loadHealth]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [run?.ticks?.length]);

  // --- actions ----------------------------------------------------
  const createDevice = async () => {
    setCreating(true);
    try {
      const res = await deviceService.create(farmId, { label: label.trim() || undefined });
      setIssued({ key: res.api_key, device: res.device });
      setLabel('');
      await loadHealth();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not create the device');
    } finally {
      setCreating(false);
    }
  };

  const startRun = async () => {
    setStarting(true);
    setReading(null);
    announcedRef.current = new Set();
    try {
      const r = await demoService.start(farmId, {
        scenario, days: Number(days), intervalMs: SPEEDS[speed].intervalMs, reset,
      });
      setRun(r);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start the run');
    } finally {
      setStarting(false);
    }
  };

  const stopRun = async () => {
    try { setRun(await demoService.stop(farmId, run.runId)); } catch { /* it may have just ended */ }
  };

  const interpret = async () => {
    setInterpreting(true);
    try {
      setReading(await demoService.interpret(farmId));
    } catch (e) {
      toast.error(e.response?.data?.message || 'The assistant could not reply');
    } finally {
      setInterpreting(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-surface-500">Loading…</div>;

  if (!parcels.length) {
    return (
      <div className="p-6">
        <p className="text-sm text-surface-600">
          Draw a plot first — a sensor is attached to a piece of land, so there is nothing to
          connect one to yet.
        </p>
      </div>
    );
  }

  const chosen = scenarios.find((s) => s.name === scenario);
  const pct = run?.totalDays ? Math.round((run.ticks.length / run.totalDays) * 100) : 0;

  return (
    <div className="space-y-5 font-sans animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-brand-700">Field hardware</p>
          <h1 className="text-2xl font-black tracking-tight text-surface-900">Sensors</h1>
          <p className="mt-0.5 text-sm text-surface-500">
            Connect a probe, or send trial data to see the whole system react.
          </p>
        </div>
        <select
          value={farmId}
          onChange={(e) => { setFarmId(e.target.value); setRun(null); setReading(null); }}
          className="rounded-xl border border-surface-200 bg-white px-3 py-2 text-xs font-bold text-surface-800"
        >
          {parcels.map((p) => <option key={p.farmId} value={p.farmId}>{p.name}</option>)}
        </select>
      </div>

      {/* ---------- 1. connect ---------- */}
      <section className="rounded-2xl border border-surface-200 bg-white p-4">
        <h2 className="text-base font-semibold text-surface-900">1 · Connect a device</h2>
        <p className="mt-0.5 text-xs text-surface-500">
          Each device gets its own key and is tied to one plot.
        </p>

        {issued && (
          <div className="mt-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">
              Copy this key now — it cannot be shown again
            </p>
            <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 font-mono text-xs">
              {issued.key}
            </code>
            <p className="mt-2 text-xs text-amber-800">
              Stored only as a fingerprint, so nobody — including us — can recover it. Point real
              hardware at <code className="font-mono">POST /api/ingest</code> with the header{' '}
              <code className="font-mono">x-device-key</code>.
            </p>
            <button
              type="button"
              onClick={() => setIssued(null)}
              className="mt-2 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-medium text-white"
            >
              I have saved it
            </button>
          </div>
        )}

        {health?.devices?.length > 0 && (
          <ul className="mt-3 space-y-2">
            {health.devices.map((d) => (
              <li key={d.device_id} className="flex items-start justify-between gap-3 rounded-xl border border-surface-200 p-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-surface-900">{d.label || d.device_id}</span>
                    {d.is_simulated && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800">Test device</span>
                    )}
                    {!d.is_active && (
                      <span className="rounded-full bg-surface-200 px-2 py-0.5 text-[10px] text-surface-600">Disconnected</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-surface-500">
                    {d.last_seen ? `Last reading ${d.ageHours < 1 ? 'just now' : `${d.ageHours}h ago`}` : 'Never reported'}
                  </p>
                  {d.is_active && d.offline && (
                    <p className="text-xs font-medium text-amber-700">Not reporting — advice is using older readings</p>
                  )}
                  {d.is_active && d.stuck && (
                    <p className="text-xs font-medium text-amber-700">Same value {d.readingsConsidered} times — may have failed</p>
                  )}
                </div>
                {d.is_active && (
                  <button
                    type="button"
                    onClick={async () => { await deviceService.deactivate(d.device_id); loadHealth(); }}
                    className="shrink-0 text-xs text-surface-500 underline hover:text-rose-700"
                  >
                    Disconnect
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name it, e.g. North corner probe"
            className="min-w-0 flex-1 rounded-lg border border-surface-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={createDevice}
            disabled={creating}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Get a key'}
          </button>
        </div>
      </section>

      {/* ---------- 2. trial data ---------- */}
      <section className="rounded-2xl border border-surface-200 bg-white p-4">
        <h2 className="text-base font-semibold text-surface-900">2 · Send trial data</h2>
        <p className="mt-0.5 text-xs text-surface-500">
          Writes readings through the same path a real probe uses — same checks, same alerts.
          Every row is marked as test data.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {scenarios.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setScenario(s.name)}
              className={`rounded-xl border p-3 text-left transition ${
                scenario === s.name
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                  : 'border-surface-200 hover:border-surface-300'
              }`}
            >
              <span className="block text-sm font-semibold text-surface-900">{s.label}</span>
              <span className="mt-0.5 block text-xs text-surface-500">{s.expect}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-surface-700">
            Days
            <input
              type="number" min="1" max="60" value={days}
              onChange={(e) => setDays(e.target.value)}
              className="mt-1 block w-20 rounded-lg border border-surface-300 px-2 py-1.5 text-sm"
            />
          </label>

          <div className="text-xs font-medium text-surface-700">
            Speed
            <div className="mt-1 flex rounded-lg border border-surface-300 p-0.5">
              {SPEEDS.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSpeed(i)}
                  title={s.hint}
                  className={`rounded-md px-3 py-1 text-xs ${
                    speed === i ? 'bg-brand-600 text-white' : 'text-surface-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-surface-700">
            <input type="checkbox" checked={reset} onChange={(e) => setReset(e.target.checked)} />
            Clear previous test data first
          </label>

          {run?.running ? (
            <button
              type="button" onClick={stopRun}
              className="ml-auto rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700"
            >
              Stop
            </button>
          ) : (
            <button
              type="button" onClick={startRun} disabled={starting}
              className="ml-auto rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {starting ? 'Starting…' : 'Start'}
            </button>
          )}
        </div>

        {/* Repeating a run without clearing doubles the history and
            flattens the trend the scenario exists to create. */}
        {!reset && (
          <p className="mt-2 text-xs text-amber-700">
            Readings add up rather than replace, so re-running without clearing will flatten the
            trend and the alert may not fire.
          </p>
        )}
        {chosen && <p className="mt-2 text-xs text-surface-500">Expected: {chosen.expect}</p>}
      </section>

      {/* ---------- 3. the spectral model ----------
           Sits between the IoT run and its live view because it is
           a second, independent trial: sensor data in one, spectral
           data in the other, the same Start-and-watch shape. */}
      <SocTrialPanel />

      {/* ---------- 4. live ---------- */}
      {run && (
        <section className="rounded-2xl border border-surface-200 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-surface-900">
              4 · {run.running ? 'Data arriving' : 'What happened'}
            </h2>
            <span className="font-mono text-xs text-surface-500">
              {run.ticks.length}/{run.totalDays} days · {run.inserted} stored
              {run.rejected > 0 && ` · ${run.rejected} rejected`}
            </span>
          </div>

          {run.urgent?.length > 0 && (
            <div className="mt-3 rounded-xl border-2 border-rose-300 bg-rose-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-800">
                {run.urgent.length === 1 ? 'Urgent — needs attention' : `${run.urgent.length} urgent alerts`}
              </p>
              <ul className="mt-1.5 space-y-1">
                {run.urgent.map((u) => (
                  <li key={u.kind} className="text-sm text-rose-900">
                    <span className="font-semibold">{u.title}</span>
                    <span className="text-rose-700"> — raised on day {u.day} ({u.observedAt})</span>
                    {u.body && <span className="mt-0.5 block text-xs text-rose-800">{u.body}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-rose-700">
                Raised automatically while the readings arrived — no one asked for this check.
              </p>
            </div>
          )}

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-200">
            <div
              className="h-full bg-brand-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div ref={feedRef} className="mt-3 max-h-72 overflow-y-auto rounded-xl bg-surface-50 p-2">
            {run.ticks.map((t) => {
              const m = t.readings.find((r) => r.variable === 'moisture_percent');
              return (
                <div key={t.day} className="border-b border-surface-200/60 py-1.5 last:border-0">
                  <div className="flex items-baseline gap-3 font-mono text-xs">
                    <span className="text-surface-400">{t.observedAt}</span>
                    {m && <span className="font-semibold text-surface-900">moisture {m.value}%</span>}
                    <span className="text-emerald-700">+{t.inserted}</span>
                    {t.rejected > 0 && <span className="text-rose-600">−{t.rejected}</span>}
                  </div>
                  {t.rejections?.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-rose-600">{t.rejections.join(' · ')}</p>
                  )}
                  {(t.raisedDetail?.length ? t.raisedDetail : t.raised.map((k) => ({ kind: k }))).map((d) => (
                    <p
                      key={d.kind}
                      className={`mt-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                        d.severity === 'urgent'
                          ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                          : 'text-amber-800'
                      }`}
                    >
                      {d.severity === 'urgent' ? '● URGENT — ' : '▲ '}
                      {d.title || alertName(d.kind)}
                    </p>
                  ))}
                  {t.resolved.map((k) => (
                    <p key={k} className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                      ▼ Alert cleared — {alertName(k)}
                    </p>
                  ))}
                </div>
              );
            })}
            {!run.ticks.length && <p className="p-2 text-xs text-surface-500">Waiting for the first reading…</p>}
          </div>

          {run.done && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {run.alertsRaised.map((k) => {
                  const urgent = run.urgent?.some((u) => u.kind === k);
                  return (
                    <span
                      key={k}
                      className={`rounded-full px-2.5 py-1 font-medium ${
                        urgent ? 'bg-rose-100 text-rose-900 ring-1 ring-rose-300' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {urgent && '● '}{alertName(k)}
                    </span>
                  );
                })}
                {run.alertsResolved.map((k) => (
                  <span key={`r-${k}`} className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800">
                    {alertName(k)} cleared
                  </span>
                ))}
                {!run.alertsRaised.length && !run.alertsResolved.length && (
                  <span className="text-surface-500">No alerts — nothing crossed a threshold.</span>
                )}
              </div>

              <button
                type="button"
                onClick={interpret}
                disabled={interpreting}
                className="mt-3 rounded-lg bg-surface-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {interpreting ? 'Agents working…' : 'What the agents make of this'}
              </button>

              {reading && (
                <div className="mt-3 rounded-xl border border-surface-200 bg-surface-50 p-3">
                  <p className="text-sm leading-relaxed text-surface-800">{reading.answer}</p>
                  <AgentTrace
                    agentsUsed={reading.agentsUsed}
                    facts={reading.facts}
                    guardStatus={reading.guardStatus}
                    modelNotice={reading.modelNotice}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
