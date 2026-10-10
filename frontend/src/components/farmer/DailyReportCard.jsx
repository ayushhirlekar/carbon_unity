import { useEffect, useState, useCallback } from 'react';
import reportService from '../../services/reportService';

/**
 * This morning's report.
 *
 * The one piece of the dashboard that was written without being
 * asked for, so it carries two obligations the rest of the UI does
 * not:
 *
 *  - It must say WHEN it was written. Advice from four days ago
 *    presented as today's reading is worse than no advice.
 *  - It must say when its prose came from a template rather than
 *    from the model, because the two read differently and the
 *    farmer should not have to wonder why today's sounds stilted.
 */

const GUARD_NOTE = {
  passed: null,
  regenerated: 'Reworded once to remove a figure that was not in your data.',
  template_fallback: 'Plain wording — written from your readings directly, without the assistant.',
};

export default function DailyReportCard({ farmId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!farmId) return;
    try {
      setReport(await reportService.latest(farmId));
      setError(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load your report');
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      // force, because this button exists for someone who wants
      // today's report rebuilt against the readings that have just
      // arrived — returning the cached one would look broken.
      const res = await reportService.generate(farmId, true);
      setReport(res.report);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not write the report');
    } finally {
      setGenerating(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const isToday = report?.report_date === today;
  const simulated = report?.evidence?.simulated;
  const note = report ? GUARD_NOTE[report.guard_status] : null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-surface-200 bg-white p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-surface-200" />
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-surface-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-surface-900">
          {isToday ? 'This morning' : 'Your last report'}
        </h2>
        <div className="flex items-center gap-2">
          {report && !isToday && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              {report.report_date}
            </span>
          )}
          {simulated && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
              Test data
            </span>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}

      {report ? (
        <>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-surface-800">
            {report.summary}
          </p>

          {Array.isArray(report.actions) && report.actions.length > 0 && (
            <ol className="mt-4 space-y-2">
              {report.actions.map((a) => (
                <li key={`${a.stage}-${a.action}`} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-800">
                    {a.stage}
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium text-surface-900">{a.action}</span>
                    {a.why && <span className="text-surface-600"> — {a.why}</span>}
                    {/* Deferral shown rather than omitted: "not yet,
                        and here is what it is waiting on" reads as
                        considered. Silence reads as arbitrary. */}
                    {a.waiting_on && (
                      <span className="mt-0.5 block text-xs text-amber-700">
                        Waiting on {String(a.waiting_on).replace(/_/g, ' ')}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {note && <p className="mt-3 text-xs text-surface-500">{note}</p>}
        </>
      ) : (
        <p className="mt-3 text-sm text-surface-600">
          No report yet. One is written each morning at 6am, or you can ask for one now.
        </p>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={generating}
        className="mt-4 rounded-lg border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 disabled:opacity-60"
      >
        {generating ? 'Reading your field…' : report ? 'Write it again now' : 'Write one now'}
      </button>
    </section>
  );
}
