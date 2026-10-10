import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import farmerService from '../../services/farmerService';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';
import DailyReportCard from '../../components/farmer/DailyReportCard';

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
  </svg>
);

export default function FarmerDashboard() {
  const [me, setMe] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [profile, list] = await Promise.all([
          farmerService.getMe(),
          farmerService.listParcels(),
        ]);
        if (!alive) return;
        setMe(profile);
        setParcels(list);
      } catch (e) {
        if (alive) setError(e.response?.data?.message || 'Could not load your dashboard');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in font-sans">
        <div className="h-8 w-60"><Skeleton className="h-8 w-full" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-72 rounded-3xl"><Skeleton className="h-full w-full rounded-3xl" /></div>
          <div className="h-72 rounded-3xl"><Skeleton className="h-full w-full rounded-3xl" /></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-700 text-sm">
        {error}
      </div>
    );
  }

  const summary = me?.summary;
  const hasParcels = parcels.length > 0;

  // The next genuinely useful action, derived from real state.
  const nextStep = !hasParcels
    ? {
        title: 'Draw your first plot on the map',
        why: 'Mark the farm boundary on the satellite canvas. Your plot area in hectares and guntha is calculated automatically.',
        cta: 'Draw Farm Plot', to: '/farmer/parcels',
      }
    : parcels.some((p) => p.sampleCount === 0)
    ? {
        title: 'Transcribe your Soil Health Card',
        why: 'Copy the organic carbon and pH from your physical card to establish an audited baseline for carbon change.',
        cta: 'Enter Soil Card', to: '/farmer/soil-card',
      }
    : parcels.some((p) => p.sampleCount === 1)
    ? {
        title: 'Second soil sample card required',
        why: 'Carbon credits are awarded on measurable gain between two time periods. Enter your follow-up card to unlock credits.',
        cta: 'Add Second Reading', to: '/farmer/soil-card',
      }
    : !parcels.some((p) => p.project)
    ? {
        title: 'Enroll your plot in a regional pool',
        why: 'Aggregated pools group smallholder plots together to cover verification overhead and maximize your net payout.',
        cta: 'Find Nearby Pool', to: '/farmer/project',
      }
    : null;

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Farmer Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-200">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-brand-700 font-bold block">
            Agricultural Portfolio
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
            {me?.user?.display_name || 'Your Farmland'}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            {summary?.parcelCount || 0} registered plot{summary?.parcelCount === 1 ? '' : 's'}
            {summary?.totalArea?.hectares
              ? ` · ${summary.totalArea.hectares} ha (${summary.totalArea.acres} acres / ${summary.totalArea.guntha || '—'} guntha)`
              : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
        {/* Left Column: Action Card & Parcels */}
        <div className="space-y-6">

          {/* This morning's report. Placed above the hero because
              it is the unprompted one: if the system wrote
              something overnight, that is the first thing the
              farmer should see on opening the app. */}
          {parcels[0]?.farm_id && <DailyReportCard farmId={parcels[0].farm_id} />}

          {/* Hero Action Recommendation Card */}
          {nextStep && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-brand-900 to-surface-950 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  RECOMMENDED NEXT STEP
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {nextStep.title}
                </h2>
                <p className="text-sm text-surface-300 leading-relaxed max-w-xl">
                  {nextStep.why}
                </p>
                <div className="pt-2">
                  <Link to={nextStep.to}>
                    <Button variant="primary" size="md" className="shadow-glow-brand">
                      {nextStep.cta} →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Registered Plots Card */}
          <div className="bg-white rounded-3xl border border-surface-200 shadow-card overflow-hidden">
            <div className="p-5 border-b border-surface-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-surface-900 tracking-tight">Your Farm Parcels</h3>
                <span className="text-xs text-surface-500">Boundaries & soil measurement status</span>
              </div>
              <Link to="/farmer/parcels">
                <Button variant="secondary" size="sm">
                  Manage Boundaries
                </Button>
              </Link>
            </div>

            {!hasParcels ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto mb-3 shadow-subtle">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934a1.12 1.12 0 01-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.688A1.125 1.125 0 003 6.694v13.366c0 .836.88 1.38 1.628 1.006l3.869-1.934a1.12 1.12 0 011.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-surface-800">No plots outlined yet</p>
                <p className="text-xs text-surface-500 mt-1 mb-4">
                  Use the satellite map tool to draw your field boundary.
                </p>
                <Link to="/farmer/parcels">
                  <Button variant="primary" size="sm">
                    Open Map Canvas
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-surface-100">
                {parcels.map((p) => (
                  <div key={p.farmId} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-50 transition-colors">
                    <div>
                      <h4 className="text-sm font-bold text-surface-900 truncate">{p.name}</h4>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {p.area ? `${p.area.hectares} ha · ${p.area.guntha || '—'} guntha` : 'Area pending'}
                        {p.village ? ` · ${p.village}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {p.sampleCount === 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          No Soil Card
                        </span>
                      ) : p.sampleCount === 1 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                          Awaiting Baseline
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-800 border border-brand-200">
                          {p.latestSoc}% Carbon
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Aside: Farmer Code & Pool Status */}
        <div className="space-y-5">
          {/* Farmer Code Card */}
          <div className="bg-white rounded-3xl border border-surface-200 p-5 shadow-card space-y-3">
            <span className="text-[10px] font-mono uppercase font-bold text-surface-400 tracking-wider block">
              Permanent Farmer ID
            </span>
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200 font-mono">
              <span className="text-base font-extrabold text-brand-900 tracking-widest">
                {me?.user?.farmer_code || '—'}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(me?.user?.farmer_code)}
                className="p-1.5 rounded-lg hover:bg-white text-surface-500 hover:text-surface-900 transition-colors"
                title="Copy farmer code"
              >
                <CopyIcon />
              </button>
            </div>
            {copied && (
              <span className="text-[11px] font-bold text-emerald-600 block text-center">
                ✓ Copied to clipboard!
              </span>
            )}
            <p className="text-xs text-surface-500 leading-relaxed">
              Share this code with your village aggregator or project host to join a carbon pool.
            </p>
          </div>

          {/* Group Project Status */}
          <div className="bg-white rounded-3xl border border-surface-200 p-5 shadow-card space-y-2">
            <span className="text-[10px] font-mono uppercase font-bold text-surface-400 tracking-wider block">
              Carbon Project Pool
            </span>
            {summary?.projectsJoined ? (
              <div className="text-sm font-bold text-surface-900">
                Enrolled in {summary.projectsJoined} Regional Pool{summary.projectsJoined === 1 ? '' : 's'}
              </div>
            ) : (
              <div>
                <p className="text-xs text-surface-600 mb-3">
                  Not currently enrolled in an active aggregated pool.
                </p>
                <Link to="/farmer/project">
                  <Button variant="secondary" size="sm" className="w-full">
                    Find Carbon Pools
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Pending Baseline Alert */}
          {summary?.parcelsAwaitingBaseline > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <span className="font-bold block">Notice: 2nd Soil Sample Needed</span>
              <p className="leading-relaxed">
                {summary.parcelsAwaitingBaseline} plot requires a second date reading to measure carbon delta and mint credits.
              </p>
              <Link to="/farmer/soil-card" className="font-bold underline block text-amber-950">
                Add Second Card →
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
