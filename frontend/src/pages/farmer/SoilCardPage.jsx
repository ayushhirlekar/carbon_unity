import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import farmerService from '../../services/farmerService';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';

const NUTRIENTS = [
  { k: 'nitrogen', l: 'Nitrogen (N)', u: 'kg/ha' },
  { k: 'phosphorus', l: 'Phosphorus (P)', u: 'kg/ha' },
  { k: 'potassium', l: 'Potassium (K)', u: 'kg/ha' },
  { k: 'sulphur', l: 'Sulphur (S)', u: 'ppm' },
  { k: 'zinc', l: 'Zinc (Zn)', u: 'ppm' },
  { k: 'boron', l: 'Boron (B)', u: 'ppm' },
  { k: 'iron', l: 'Iron (Fe)', u: 'ppm' },
  { k: 'manganese', l: 'Manganese (Mn)', u: 'ppm' },
  { k: 'copper', l: 'Copper (Cu)', u: 'ppm' },
];

export default function SoilCardPage() {
  const toast = useToast();
  const [params] = useSearchParams();

  const [parcels, setParcels] = useState([]);
  const [farmId, setFarmId] = useState(params.get('farm') || '');
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({
    sampled_at: '', soc_percent: '', ph: '', ec: '', shc_reference: '',
    nitrogen: '', phosphorus: '', potassium: '', sulphur: '',
    zinc: '', boron: '', iron: '', manganese: '', copper: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const list = await farmerService.listParcels();
        setParcels(list);
        if (!farmId && list.length) setFarmId(list[0].farmId);
      } catch {
        toast.error('Could not load your plots');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!farmId) return setSamples([]);
    farmerService.listSamples(farmId).then(setSamples).catch(() => setSamples([]));
  }, [farmId]);

  const parcel = parcels.find((p) => p.farmId === farmId);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!farmId) return toast.error('Choose a plot');
    if (!form.sampled_at) return toast.error('Enter the sample date from your card');
    if (!form.soc_percent) return toast.error('Enter the organic carbon value');

    const payload = { sampled_at: form.sampled_at, shc_reference: form.shc_reference || null };
    for (const [k, v] of Object.entries(form)) {
      if (k === 'sampled_at' || k === 'shc_reference') continue;
      if (v !== '' && v !== null) payload[k] = Number(v);
    }

    setSaving(true);
    try {
      await farmerService.addSoilCard(farmId, payload);
      toast.success('Soil Health Card saved successfully');
      setForm({
        sampled_at: '', soc_percent: '', ph: '', ec: '', shc_reference: '',
        nitrogen: '', phosphorus: '', potassium: '', sulphur: '',
        zinc: '', boron: '', iron: '', manganese: '', copper: '',
      });
      setSamples(await farmerService.listSamples(farmId));
      farmerService.listParcels().then(setParcels);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the card');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in font-sans">
        <div className="h-8 w-60"><Skeleton className="h-8 w-full" /></div>
        <div className="h-48 rounded-3xl"><Skeleton className="h-full w-full rounded-3xl" /></div>
        <div className="h-72 rounded-3xl"><Skeleton className="h-full w-full rounded-3xl" /></div>
      </div>
    );
  }

  if (parcels.length === 0) {
    return (
      <div className="space-y-6 font-sans">
        <h1 className="text-2xl font-extrabold text-surface-950">Soil Health Card Entry</h1>
        <div className="bg-white rounded-3xl border border-surface-200 p-12 text-center shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto mb-3 shadow-subtle">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.942A6 6 0 0115 17.25h-6a6 6 0 01-3.23-.942L4.2 15.3m15.6 0A2.25 2.25 0 0021 13.342V6.75a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6.75v6.592c0 .878.512 1.67 1.3 2.036" />
            </svg>
          </div>
          <p className="text-sm font-bold text-surface-800">Draw a plot boundary first</p>
          <p className="text-xs text-surface-500 mt-1">
            Soil samples are attached to specific parcel geometries.
          </p>
        </div>
      </div>
    );
  }

  const first = samples[0];
  const latest = samples[samples.length - 1];
  const gain =
    samples.length >= 2
      ? Number((latest.soc_percent - first.soc_percent).toFixed(4))
      : null;

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all';

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Soil Baseline Transcription
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
          Soil Health Card (SHC) Data
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Copy exact lab values printed on your physical card. No memory estimation.
        </p>
      </div>

      {/* Plot Selector */}
      <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card space-y-3">
        <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider">
          Select Farm Plot
        </label>
        <select
          className={inputClass}
          value={farmId}
          onChange={(e) => setFarmId(e.target.value)}
        >
          {parcels.map((p) => (
            <option key={p.farmId} value={p.farmId}>
              {p.name} {p.area ? ` — ${p.area.hectares} ha (${p.area.guntha} guntha)` : ''}
            </option>
          ))}
        </select>

        {parcel && !parcel.soilType && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            Notice: This plot has no soil type configured on the map. Soil bulk density is estimated from it.
          </div>
        )}
      </div>

      {/* Past Readings on this plot */}
      {samples.length > 0 && (
        <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-700">
              Recorded Soil Cards on this Plot
            </span>
            <span className="text-xs font-bold text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded-full">
              {samples.length} Reading(s)
            </span>
          </div>

          <div className="divide-y divide-surface-100">
            {samples.map((s, idx) => (
              <div key={s.sample_id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-surface-900 block">{s.sampled_at}</span>
                  <span className="text-xs text-surface-500">
                    {idx === 0 ? 'Baseline Reading 01' : `Subsequent Audit 0${idx + 1}`} · {s.source === 'shc' ? 'Physical Card' : s.source}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-mono font-bold text-brand-800">{s.soc_percent}%</span>
                  <span className="text-[10px] text-surface-400 block uppercase font-semibold">Organic Carbon</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-50 border border-surface-200 text-xs">
            {samples.length === 1 ? (
              <p className="text-surface-700">
                <strong>Next Step:</strong> One reading sets the baseline. A second card from a later date calculates carbon gain for minting.
              </p>
            ) : gain > 0 ? (
              <p className="text-brand-900 font-semibold">
                ✓ Carbon increased by <strong>+{gain}%</strong> since baseline ({first.sampled_at}) · {latest.co2_equivalent} tCO₂e sequestered!
              </p>
            ) : (
              <p className="text-surface-600">
                Carbon stock maintained between {first.sampled_at} and {latest.sampled_at}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Entry Form */}
      <form onSubmit={submit}>
        <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 shadow-card space-y-6">
          <div className="border-b border-surface-100 pb-3">
            <span className="text-[10px] font-mono uppercase text-brand-700 font-bold tracking-wider">
              Card Entry
            </span>
            <h2 className="text-base font-bold text-surface-900 tracking-tight">
              Physical Card Values
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                Sampling Date (printed on card) *
              </label>
              <input
                type="date"
                className={inputClass}
                value={form.sampled_at}
                onChange={set('sampled_at')}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                Card Reference / Serial ID
              </label>
              <input
                className={inputClass}
                placeholder="e.g. SHC/MH/2026/0142"
                value={form.shc_reference}
                onChange={set('shc_reference')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                Organic Carbon (OC %) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                placeholder="e.g. 0.65"
                value={form.soc_percent}
                onChange={set('soc_percent')}
                required
              />
              <span className="text-[11px] text-surface-400 mt-1 block">Primary metric for credit calculation</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                pH (Soil Reaction)
              </label>
              <input
                type="number"
                step="0.1"
                className={inputClass}
                placeholder="e.g. 7.2"
                value={form.ph}
                onChange={set('ph')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                Electrical Conductivity (EC dS/m)
              </label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="e.g. 0.35"
                value={form.ec}
                onChange={set('ec')}
              />
            </div>
          </div>

          {/* Optional Nutrients Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-bold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1.5"
            >
              <span>{showAll ? '▲ Collapse Optional Nutrients' : '▼ Add 12 Additional Nutrients from Card (Optional)'}</span>
            </button>
          </div>

          {showAll && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-surface-50 rounded-2xl border border-surface-200 animate-slide-down">
              {NUTRIENTS.map((n) => (
                <div key={n.k}>
                  <label className="block text-[11px] font-bold text-surface-600 uppercase tracking-wider mb-1">
                    {n.l} <span className="text-[10px] text-surface-400">({n.u})</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className={inputClass}
                    value={form[n.k]}
                    onChange={set(n.k)}
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={saving}
            className="w-full shadow-glow-brand"
          >
            {saving ? 'Transcribing Card...' : 'Save & Calculate Carbon Stock'}
          </Button>
        </div>
      </form>
    </div>
  );
}
