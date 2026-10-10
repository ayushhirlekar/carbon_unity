import { useEffect, useState, useCallback } from 'react';
import deviceService from '../../services/deviceService';

/**
 * Connect a sensor to a parcel.
 *
 * Two things this screen has to get right, both of them about
 * honesty rather than layout:
 *
 * 1. The key is shown ONCE. It is stored only as a hash, so it
 *    cannot be fetched again. The UI has to make that obvious
 *    before the farmer navigates away, not explain it afterwards.
 *
 * 2. A simulated device must be visibly simulated. These readings
 *    flow into the same advice as real ones, and a farmer looking
 *    at their dashboard is entitled to know whether the numbers
 *    came from their soil or from a test script.
 */
export default function DevicesPanel({ farmId, onChange }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [issued, setIssued] = useState(null);   // shown once, then gone
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!farmId) return;
    try {
      setHealth(await deviceService.list(farmId));
      setError(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load devices');
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => { load(); }, [load]);

  // Devices change state on their own — a probe goes quiet, a
  // sweep marks it offline — so this refreshes without being
  // asked. Polling rather than a realtime subscription: see
  // services/deviceService.js for why.
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await deviceService.create(farmId, { label: label.trim() || undefined });
      setIssued({ key: res.api_key, device: res.device });
      setLabel('');
      await load();
      onChange?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not create the device');
    } finally {
      setCreating(false);
    }
  };

  const deactivate = async (deviceId) => {
    try {
      await deviceService.deactivate(deviceId);
      await load();
      onChange?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not deactivate');
    }
  };

  if (loading) {
    return <div className="text-sm text-surface-500">Loading devices…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-surface-900">Sensors</h3>
        {health?.deviceCount > 0 && (
          <span className="text-xs text-surface-500">
            {health.deviceCount} connected
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      {/* The key, shown exactly once. Deliberately hard to miss. */}
      {issued && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Copy this key now — it cannot be shown again
          </p>
          <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-surface-900">
            {issued.key}
          </code>
          <p className="mt-2 text-xs text-amber-800">
            Device <span className="font-mono">{issued.device.device_id}</span>. It is stored only
            as a fingerprint, so nobody — including us — can recover the key later.
          </p>
          <button
            type="button"
            onClick={() => setIssued(null)}
            className="mt-3 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            I have saved it
          </button>
        </div>
      )}

      {/* Existing devices */}
      {health?.devices?.length ? (
        <ul className="space-y-2">
          {health.devices.map((d) => (
            <li
              key={d.device_id}
              className="rounded-xl border border-surface-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-surface-900">
                      {d.label || d.device_id}
                    </span>
                    {d.is_simulated && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                        Test device
                      </span>
                    )}
                    {!d.is_active && (
                      <span className="rounded-full bg-surface-200 px-2 py-0.5 text-[11px] text-surface-600">
                        Disconnected
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-surface-500">
                    {d.last_seen
                      ? `Last reading ${d.ageHours < 1 ? 'just now' : `${d.ageHours}h ago`}`
                      : 'Has never reported'}
                  </p>

                  {/* Health states are stated plainly, because the
                      consequence is that advice may be wrong. */}
                  {d.is_active && d.offline && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Not reporting — advice for this plot is using older readings
                    </p>
                  )}
                  {d.is_active && d.stuck && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Reporting the same value {d.readingsConsidered} times — the probe may have failed
                    </p>
                  )}
                </div>

                {d.is_active && (
                  <button
                    type="button"
                    onClick={() => deactivate(d.device_id)}
                    className="shrink-0 text-xs text-surface-500 underline hover:text-rose-700"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-surface-500">
          No sensors on this plot yet. Your readings come from weather models until one is connected.
        </p>
      )}

      {/* Add */}
      <div className="rounded-xl border border-dashed border-surface-300 p-3">
        <label htmlFor="device-label" className="text-xs font-medium text-surface-700">
          Connect a sensor
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="device-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name it, e.g. North corner probe"
            className="min-w-0 flex-1 rounded-lg border border-surface-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Get a key'}
          </button>
        </div>
        <p className="mt-2 text-xs text-surface-500">
          Creates a test device you can feed with the simulator. Readings from it are labelled as
          test data everywhere they appear.
        </p>
      </div>
    </div>
  );
}
