import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';

const EMPTY = {
  farmName: '', location: '', district: '', state: '', area: '',
  cropType: '', farmerName: '', farmerContact: '', numberOfFarmers: '1',
  soc: '', bulkDensity: '', depth: '',
  title: '', subtitle: '', coverImageUrl: '', pricePerCredit: '',
  vintageYear: new Date().getFullYear(), verificationStandard: 'gold standard',
  practiceTags: '', listingStatus: 'active',
};

const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const estimateCarbon = () => {
    const soc = parseFloat(form.soc);
    const bd = parseFloat(form.bulkDensity);
    const depth = parseFloat(form.depth);
    const area = parseFloat(form.area);
    if (!soc || !bd || !depth || !area) return null;
    const carbonStock = (soc / 100) * bd * depth * area * 10;
    const co2eq = carbonStock * 3.67;
    const credits = co2eq * 0.85;
    return {
      carbonStock: Math.round(carbonStock),
      co2eq: Math.round(co2eq),
      credits: Math.round(credits),
    };
  };

  const est = estimateCarbon();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        practiceTags: form.practiceTags
          ? form.practiceTags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        numberOfFarmers: parseInt(form.numberOfFarmers) || 1,
      };
      await adminService.createProject(payload);
      toast.success('Project created and carbon metrics calculated!');
      navigate('/admin/projects');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', placeholder, hint, full, step }) => (
    <div className={full ? 'col-span-full' : ''}>
      <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        name={name}
        type={type}
        step={step}
        value={form[name]}
        onChange={set}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
      />
      {hint && <span className="block text-[11px] text-surface-400 mt-1">{hint}</span>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/projects')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-surface-900 transition-colors"
      >
        <span className="p-1.5 rounded-lg bg-white border border-surface-200 shadow-subtle">
          <BackIcon />
        </span>
        <span>Back to Projects</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
          Launch Carbon Project
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Onboard farm parcel, calculate deterministic soil organic carbon, and issue marketplace listings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Farm Details Card */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 shadow-card space-y-5">
          <div className="border-b border-surface-100 pb-3">
            <span className="text-[10px] font-mono uppercase text-brand-700 font-bold tracking-wider">
              Section 01
            </span>
            <h2 className="text-base font-bold text-surface-900 tracking-tight">
              Land & Smallholder Identity
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Farm / Project Name *" name="farmName" placeholder="e.g. Sahyadri Regenerative Agroforestry Cluster" full />
            <Field label="Location Name *" name="location" placeholder="e.g. Konkan Coast" />
            <Field label="District" name="district" placeholder="e.g. Ratnagiri" />
            <Field label="State" name="state" placeholder="e.g. Maharashtra" />
            <Field label="Registered Area (ha) *" name="area" type="number" step="any" placeholder="e.g. 250" />
            <Field label="Crop Variety" name="cropType" placeholder="e.g. Mango, Cashew, Legumes" />
            <Field label="Lead Farmer / Rep" name="farmerName" placeholder="e.g. Ramesh Patil" />
            <Field label="Contact Details" name="farmerContact" placeholder="Phone or email" />
            <Field label="Total Enrolled Farmers" name="numberOfFarmers" type="number" placeholder="1" />
          </div>
        </div>

        {/* 2. Soil & Carbon Chemistry Card */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 shadow-card space-y-5">
          <div className="border-b border-surface-100 pb-3">
            <span className="text-[10px] font-mono uppercase text-emerald-700 font-bold tracking-wider">
              Section 02
            </span>
            <h2 className="text-base font-bold text-surface-900 tracking-tight">
              Soil Organic Carbon Chemistry
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label="SOC % *"
              name="soc"
              type="number"
              step="any"
              placeholder="e.g. 1.45"
              hint="Soil Organic Carbon percentage off card"
            />
            <Field
              label="Bulk Density (g/cm³) *"
              name="bulkDensity"
              type="number"
              step="any"
              placeholder="e.g. 1.25"
              hint="Typical range: 1.0 – 1.6 g/cm³"
            />
            <Field
              label="Sample Depth (cm) *"
              name="depth"
              type="number"
              step="any"
              placeholder="e.g. 30"
              hint="Physical soil core sampling depth"
            />
          </div>

          {/* Interactive Calculation Live Simulation */}
          {est && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50/60 border border-brand-200 shadow-subtle">
              <span className="text-[11px] font-mono uppercase text-brand-800 font-bold tracking-wider block mb-3">
                Live Physical Carbon Stock Estimation
              </span>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-brand-200/60">
                  <span className="text-xl font-extrabold text-surface-900 font-mono block">
                    {est.carbonStock.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-semibold text-surface-500">Carbon Stock (t)</span>
                </div>
                <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-brand-200/60">
                  <span className="text-xl font-extrabold text-brand-900 font-mono block">
                    {est.co2eq.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-semibold text-surface-500">CO₂ Equivalent (t)</span>
                </div>
                <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-brand-200/60">
                  <span className="text-xl font-extrabold text-emerald-700 font-mono block">
                    {est.credits.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-semibold text-surface-500">Available Credits</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Marketplace Listing Parameters */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 shadow-card space-y-5">
          <div className="border-b border-surface-100 pb-3">
            <span className="text-[10px] font-mono uppercase text-sky-700 font-bold tracking-wider">
              Section 03
            </span>
            <h2 className="text-base font-bold text-surface-900 tracking-tight">
              Marketplace Catalog & Pricing
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full">
              <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                Listing Title *
              </label>
              <input
                name="title"
                value={form.title}
                onChange={set}
                placeholder="e.g. Ratnagiri Soil Restoration & Agroforestry Project"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                Executive Subtitle
              </label>
              <textarea
                name="subtitle"
                value={form.subtitle}
                onChange={set}
                rows={2}
                placeholder="High-permanence soil carbon capture across 250 smallholder parcels."
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <Field label="Price per Credit (ETH) *" name="pricePerCredit" type="number" step="any" placeholder="e.g. 0.00001" />
            <Field label="Vintage Year" name="vintageYear" type="number" placeholder="2026" />

            <div>
              <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                Verification Standard
              </label>
              <select
                name="verificationStandard"
                value={form.verificationStandard}
                onChange={set}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="gold standard">Gold Standard Verified</option>
                <option value="vcs">VCS (Verra) Verified</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                Listing Initial State
              </label>
              <select
                name="listingStatus"
                value={form.listingStatus}
                onChange={set}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="active">Active (Immediate Public Mint)</option>
                <option value="draft">Draft (Review Later)</option>
              </select>
            </div>

            <Field label="Practice Tags (comma-separated)" name="practiceTags" placeholder="Agroforestry, Organic, No-Till" full />
            <Field label="Cover Image URL (Satellite or Field)" name="coverImageUrl" placeholder="https://images.unsplash.com/..." full />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate('/admin/projects')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="shadow-glow-brand"
          >
            {loading ? 'Registering Project...' : 'Complete Registration'}
          </Button>
        </div>

      </form>
    </div>
  );
}