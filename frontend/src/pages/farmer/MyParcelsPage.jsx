import { useEffect, useRef, useState } from 'react';
import MapCanvas from '../../components/farmer/MapCanvas';
import farmerService from '../../services/farmerService';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Skeleton from '../../components/common/Skeleton';
import DevicesPanel from '../../components/farmer/DevicesPanel';

const SOIL_TYPES = [
  { v: 'black', l: 'Black / kali (काळी)' },
  { v: 'red', l: 'Red / lal (लाल)' },
  { v: 'sandy', l: 'Sandy / reti (रेती)' },
  { v: 'gravelly', l: 'Gravelly / murmad (मुरमाड)' },
  { v: 'loam', l: 'Loam' },
  { v: 'clay', l: 'Clay' },
];

const WATER_SOURCES = [
  { v: 'rainfed', l: 'Rainfed (जिरायत)' },
  { v: 'well', l: 'Well' },
  { v: 'borewell', l: 'Borewell' },
  { v: 'canal', l: 'Canal' },
  { v: 'drip', l: 'Drip' },
  { v: 'sprinkler', l: 'Sprinkler' },
];

const TENURES = [
  { v: 'owned', l: 'Owned (मालकी)' },
  { v: 'leased', l: 'Leased (कूळ)' },
  { v: 'sharecropped', l: 'Sharecropped (बटाई)' },
  { v: 'other', l: 'Other' },
];

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-surface-700 mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-surface-500 mt-1">{hint}</span>}
  </label>
);

const inputCls =
  'w-full bg-surface-50 border border-surface-200/90 rounded-xl px-3.5 py-2.5 text-sm ' +
  'text-surface-900 placeholder:text-surface-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all';

export default function MyParcelsPage() {
  const toast = useToast();
  const mapRef = useRef(null);

  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [sketch, setSketch] = useState(null); // { geometry, hectares }
  const [serverCheck, setServerCheck] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', village: '', taluka: '', gat_number: '', hissa_number: '',
    tenure: '', soil_type: '', water_source: '', crop_type: '',
  });

  const load = async () => {
    try {
      setParcels(await farmerService.listParcels());
    } catch {
      toast.error('Could not load your plots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Ask the server about the shape shortly after drawing stops.
  useEffect(() => {
    if (!sketch?.geometry) { setServerCheck(null); return; }
    const t = setTimeout(async () => {
      try {
        setServerCheck(await farmerService.checkOverlap(sketch.geometry));
      } catch {
        setServerCheck(null);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [sketch]);

  const startDrawing = () => {
    setDrawing(true);
    setSketch(null);
    setServerCheck(null);
    setTimeout(() => mapRef.current?.startDraw(), 50);
  };

  const cancel = () => {
    mapRef.current?.clear();
    setDrawing(false);
    setSketch(null);
    setServerCheck(null);
  };

  const blocked = serverCheck?.verdict === 'rejected' || serverCheck?.verdict === 'invalid_shape';

  const submit = async (e) => {
    e.preventDefault();
    if (!sketch?.geometry) return toast.error('Draw the boundary first');
    if (!form.name.trim()) return toast.error('Give this plot a name');
    if (blocked) return toast.error('Fix the boundary before saving');

    setSaving(true);
    try {
      const created = await farmerService.createParcel({ ...form, boundary: sketch.geometry });
      toast.success(`Plot registered — ${created.area.hectares} ha`);
      cancel();
      setForm({
        name: '', village: '', taluka: '', gat_number: '', hissa_number: '',
        tenure: '', soil_type: '', water_source: '', crop_type: '',
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not register this plot');
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const totalHectares = parcels.reduce((sum, p) => sum + (parseFloat(p.area?.hectares) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200/60">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-surface-900 tracking-tight">My Farm Plots</h1>
          <p className="text-xs text-surface-500 mt-1">
            Registered agricultural parcels mapped with satellite boundary validation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!drawing && (
            <>
              {parcels.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-800 rounded-xl text-xs font-semibold border border-brand-200/60">
                  <span>{parcels.length} {parcels.length === 1 ? 'Plot' : 'Plots'}</span>
                  <span>·</span>
                  <span>{totalHectares.toFixed(2)} Total ha</span>
                </div>
              )}
              <Button
                onClick={startDrawing}
                variant="primary"
                size="md"
                id="btn-draw-plot"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Draw New Plot
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Drawing mode */}
      {drawing && (
        <form onSubmit={submit} className="space-y-5 animate-fade-in">
          <Card className="p-5 space-y-4 border border-brand-200/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-800 text-sm font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                Satellite Boundary Editor
              </div>
              <span className="text-xs text-surface-500">Tap at least 3 points to enclose</span>
            </div>

            <p className="text-xs text-surface-600 bg-surface-50 rounded-xl p-3 border border-surface-200/60">
              Tap each corner of your field on the satellite canvas. The shape closes automatically once three or more corners are tapped.
            </p>

            <MapCanvas ref={mapRef} onChange={setSketch} height={340} />

            {/* Real-time calculated measurement banner */}
            {sketch && (
              <div className="rounded-xl bg-brand-50/90 border border-brand-200/80 p-3.5">
                <div className="flex items-center justify-between text-sm text-surface-900 font-medium">
                  <div>
                    {(serverCheck?.area ?? null) ? (
                      <span className="flex items-center gap-2">
                        <strong className="text-brand-800 font-bold text-base">{serverCheck.area.hectares} ha</strong>
                        <span className="text-surface-400">·</span>
                        <span className="text-surface-700">{serverCheck.area.acres} acre</span>
                        <span className="text-surface-400">·</span>
                        <span className="text-surface-700">{serverCheck.area.guntha} guntha</span>
                      </span>
                    ) : (
                      <span className="text-brand-700 font-medium animate-pulse">
                        Calculating area: ~{sketch.hectares.toFixed(3)} ha…
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-brand-700 font-semibold bg-white/80 px-2 py-0.5 rounded-lg border border-brand-200">
                    Live GPS Measurement
                  </span>
                </div>
                <div className="text-[11px] text-surface-500 mt-1">
                  Derived directly from polygon geometry. Check that this matches your 7/12 extract records.
                </div>
              </div>
            )}

            {/* Verification and conflict alerts */}
            {serverCheck?.verdict === 'rejected' && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 p-3.5 text-xs flex items-start gap-2.5">
                <svg className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <strong>Overlap detected:</strong> This shape overlaps <strong>{serverCheck.conflictName}</strong> by{' '}
                  {Math.round(serverCheck.intersectionRatio * 100)}%. That parcel is already registered. Please readjust your points.
                </div>
              </div>
            )}
            {serverCheck?.verdict === 'flagged' && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 p-3.5 text-xs flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong>Marginal boundary overlap:</strong> Slight boundary touching with a neighbouring plot. Registration can proceed and will be queued for manual survey audit.
                </div>
              </div>
            )}
            {serverCheck?.verdict === 'invalid_shape' && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 p-3.5 text-xs flex items-start gap-2.5">
                <svg className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <strong>Self-intersecting outline:</strong> The polygon outline crosses itself. Use "Undo last corner" or start over.
                </div>
              </div>
            )}
            {serverCheck?.sizeWarning && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 p-3.5 text-xs">
                {serverCheck.sizeWarning}
              </div>
            )}

            {/* Drawing controls */}
            <div className="flex gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => mapRef.current?.undo()}
                className="flex-1"
              >
                Undo Last Corner
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => mapRef.current?.clear()}
                className="flex-1"
              >
                Clear & Restart
              </Button>
            </div>
          </Card>

          {/* Metadata Form */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-2">
              Parcel Details & Land Extract
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Plot Name">
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. North Orchard, Shirgaon Plot"
                  required
                />
              </Field>
              <Field label="Village">
                <input
                  className={inputCls}
                  value={form.village}
                  onChange={set('village')}
                  placeholder="e.g. Shirgaon"
                />
              </Field>
              <Field label="Taluka / Tehsil">
                <input
                  className={inputCls}
                  value={form.taluka}
                  onChange={set('taluka')}
                  placeholder="e.g. Karad"
                />
              </Field>
              <Field label="Gat Number" hint="From your official 7/12 land extract">
                <input
                  className={inputCls}
                  value={form.gat_number}
                  onChange={set('gat_number')}
                  placeholder="e.g. 142"
                />
              </Field>
              <Field label="Hissa Number" hint="Sub-division index if applicable">
                <input
                  className={inputCls}
                  value={form.hissa_number}
                  onChange={set('hissa_number')}
                  placeholder="e.g. 2A"
                />
              </Field>
              <Field label="Land Ownership / Tenure" hint="Only owners can mint carbon credits">
                <select className={inputCls} value={form.tenure} onChange={set('tenure')}>
                  <option value="">Select tenure…</option>
                  {TENURES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </Field>
              <Field label="Soil Type" hint="Used for bulk density calculation">
                <select className={inputCls} value={form.soil_type} onChange={set('soil_type')}>
                  <option value="">Select soil classification…</option>
                  {SOIL_TYPES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </Field>
              <Field label="Primary Irrigation / Water Source">
                <select className={inputCls} value={form.water_source} onChange={set('water_source')}>
                  <option value="">Select water source…</option>
                  {WATER_SOURCES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </Field>
              <Field label="Current Cultivated Crop">
                <input
                  className={inputCls}
                  value={form.crop_type}
                  onChange={set('crop_type')}
                  placeholder="e.g. Sugarcane, Soybean, Wheat"
                />
              </Field>
            </div>
          </Card>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={saving}
              disabled={!sketch || blocked}
              className="flex-1"
              id="btn-register-parcel"
            >
              {saving ? 'Registering Plot…' : 'Register Farm Plot'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={cancel}
              className="px-8"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Parcel list */}
      {!drawing && (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : parcels.length === 0 ? (
          <Card className="py-16 text-center border-dashed border-2 border-surface-200">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200/80 flex items-center justify-center mx-auto mb-4 text-brand-600">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-surface-800">No plots registered yet</h3>
            <p className="text-xs text-surface-500 max-w-sm mx-auto mt-1 mb-5">
              Tap below to draw and register your field boundary on satellite imagery.
            </p>
            <Button onClick={startDrawing} variant="primary" size="md">
              Register First Plot
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {parcels.map((p) => (
              <Card key={p.farmId} hover className="overflow-hidden group flex flex-col justify-between">
                <div>
                  {p.boundary && (
                    <div className="relative border-b border-surface-100">
                      <MapCanvas key={p.farmId} initialBoundary={p.boundary} readOnly height={160} />
                      <div className="absolute top-2.5 right-2.5 bg-surface-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium text-white shadow-sm border border-white/10">
                        {p.area?.hectares ? `${p.area.hectares} ha` : 'Mapped'}
                      </div>
                    </div>
                  )}

                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-surface-900 text-base group-hover:text-brand-700 transition-colors">
                          {p.name}
                        </h3>
                        <div className="text-xs text-surface-500 mt-0.5">
                          {p.area && (
                            <span className="font-medium text-brand-700">
                              {p.area.hectares} ha · {p.area.acres} acre · {p.area.guntha} guntha
                            </span>
                          )}
                        </div>
                      </div>

                      {p.overlapStatus === 'flagged' ? (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5">
                          Under Review
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-md px-2 py-0.5">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-surface-100 grid grid-cols-2 gap-2 text-xs text-surface-600">
                      <div>
                        <span className="text-surface-400 block text-[10px] uppercase font-semibold">Location</span>
                        <span className="truncate block font-medium">
                          {p.village ? `${p.village}${p.taluka ? `, ${p.taluka}` : ''}` : 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-surface-400 block text-[10px] uppercase font-semibold">Gat / Hissa</span>
                        <span className="font-medium">
                          {p.gatNumber ? `Gat ${p.gatNumber}${p.hissaNumber ? `/${p.hissaNumber}` : ''}` : '—'}
                        </span>
                      </div>
                    </div>

                    {p.project && (
                      <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-surface-50 border border-surface-200/60 text-xs text-surface-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                        <span>Enrolled in <strong>{p.project.name}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-5 pt-0">
                  <a
                    href={`/farmer/soil-card?farm=${p.farmId}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold rounded-xl text-brand-700 bg-brand-50 hover:bg-brand-100/80 border border-brand-200/60 transition-all active:scale-[0.99]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {p.sampleCount === 0 ? 'Add Soil Health Card' : `View Soil Cards (${p.sampleCount})`}
                  </a>

                  {/* Sensors belong on the parcel, not on a settings
                      page: a device measures one piece of land, and
                      attaching it anywhere else would invite
                      connecting it to the wrong one. */}
                  <details className="mt-3 rounded-xl border border-surface-200">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-surface-700">
                      Sensors
                    </summary>
                    <div className="border-t border-surface-100 p-3">
                      <DevicesPanel farmId={p.farmId} />
                    </div>
                  </details>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
