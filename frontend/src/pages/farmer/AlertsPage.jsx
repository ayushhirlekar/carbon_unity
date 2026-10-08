import { useEffect, useState } from 'react';
import alertService from '../../services/alertService';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';

const TONE = {
  urgent: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-800',
    badge: 'bg-rose-100 text-rose-800',
    label: 'Act immediately',
  },
  advice: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Recommended Action',
  },
  info: {
    bg: 'bg-white',
    border: 'border-surface-200',
    text: 'text-surface-900',
    badge: 'bg-brand-50 text-brand-800',
    label: 'Advisory Notice',
  },
};

export default function AlertsPage() {
  const toast = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setAlerts((await alertService.list()).alerts);
    } catch {
      toast.error('Could not load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const checkNow = async () => {
    setBusy(true);
    try {
      const r = await alertService.run();
      toast.success(r.raised > 0 ? `${r.raised} new field alerts detected` : 'No urgent issues found');
      await load();
    } catch {
      toast.error('Weather check failed');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (id) => {
    await alertService.markRead(id);
    setAlerts((a) => a.map((x) => (x.alert_id === id ? { ...x, read_at: new Date().toISOString() } : x)));
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in font-sans">
        <div className="h-8 w-60"><Skeleton className="h-8 w-full" /></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32"><Skeleton className="h-full w-full rounded-2xl" /></div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Field Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
            Field Notifications & Alerts
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            Automated weather risk and soil condition alerts generated from Sentinel-2 & meteorological APIs
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={checkNow}
          disabled={busy}
          loading={busy}
        >
          Check Field Now
        </Button>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-surface-200 p-12 text-center shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-subtle">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-surface-900">All clear across your parcels</h2>
          <p className="text-xs text-surface-500 mt-1">
            Weather and soil conditions are optimal. You will be alerted immediately if heat stress or drought is forecasted.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => {
            const tone = TONE[a.severity] || TONE.info;
            return (
              <div
                key={a.alert_id}
                className={`rounded-2xl border p-5 shadow-card transition-all ${tone.bg} ${tone.border} ${
                  a.read_at ? 'opacity-60 bg-surface-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tone.badge}`}>
                        {tone.label}
                      </span>
                      {a.parcelName && (
                        <span className="text-xs font-semibold text-surface-500">
                          Plot: {a.parcelName}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-surface-900 tracking-tight">
                      {a.title}
                    </h3>
                    <p className="text-xs text-surface-600 leading-relaxed max-w-xl">
                      {a.body}
                    </p>
                    <span className="text-[10px] text-surface-400 block pt-1">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>

                  {!a.read_at && (
                    <button
                      onClick={() => dismiss(a.alert_id)}
                      className="text-xs font-semibold text-surface-400 hover:text-surface-700 px-2 py-1 rounded-lg hover:bg-black/5 shrink-0 transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
