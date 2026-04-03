import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../components/common/Toast';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Farm, 2: Carbon, 3: Listing

  const [form, setForm] = useState({
    // Farm
    farmName: '', location: '', district: '', state: '',
    area: '', cropType: '', farmerName: '', farmerContact: '', numberOfFarmers: '1',
    // Carbon
    soc: '', bulkDensity: '', depth: '',
    // Listing
    title: '', subtitle: '', coverImageUrl: '', pricePerCredit: '',
    vintageYear: new Date().getFullYear().toString(),
    verificationStandard: '', practiceTags: [],
    listingStatus: 'draft'
  });

  const [tagInput, setTagInput] = useState('');

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addTag = () => {
    if (tagInput.trim() && !form.practiceTags.includes(tagInput.trim())) {
      update('practiceTags', [...form.practiceTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    update('practiceTags', form.practiceTags.filter(t => t !== tag));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminService.createProject({
        ...form,
        area: parseFloat(form.area),
        soc: parseFloat(form.soc),
        bulkDensity: parseFloat(form.bulkDensity),
        depth: parseFloat(form.depth),
        pricePerCredit: parseFloat(form.pricePerCredit),
        vintageYear: parseInt(form.vintageYear),
        numberOfFarmers: parseInt(form.numberOfFarmers)
      });

      toast.success(`Project created! ${res.data.calculation.creditsGenerated.toLocaleString()} credits generated.`);
      navigate('/admin/projects');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#639922] transition-colors placeholder-gray-600";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1.5";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Create Carbon Offset Project</h1>
        <p className="text-gray-500 text-sm mt-1">
          Fill in farm details, soil measurements, and listing information
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: 'Farm Details' },
          { n: 2, label: 'Carbon Data' },
          { n: 3, label: 'Listing Info' }
        ].map(s => (
          <button
            key={s.n}
            onClick={() => setStep(s.n)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
              step === s.n
                ? 'bg-[#639922] text-white'
                : step > s.n
                  ? 'bg-[#639922]/20 text-[#639922] border border-[#639922]/30'
                  : 'bg-white/5 text-gray-500 border border-white/10'
            }`}
          >
            {s.n}. {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 lg:p-8">

          {/* Step 1: Farm */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white mb-4">🌾 Farm Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Farm Name *</label>
                  <input type="text" value={form.farmName} onChange={e => update('farmName', e.target.value)} className={inputClass} placeholder="Green Valley Farm" required />
                </div>
                <div>
                  <label className={labelClass}>Location *</label>
                  <input type="text" value={form.location} onChange={e => update('location', e.target.value)} className={inputClass} placeholder="Nashik, Maharashtra" required />
                </div>
                <div>
                  <label className={labelClass}>District</label>
                  <input type="text" value={form.district} onChange={e => update('district', e.target.value)} className={inputClass} placeholder="Nashik" />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input type="text" value={form.state} onChange={e => update('state', e.target.value)} className={inputClass} placeholder="Maharashtra" />
                </div>
                <div>
                  <label className={labelClass}>Area (hectares) *</label>
                  <input type="number" step="0.01" min="0.01" value={form.area} onChange={e => update('area', e.target.value)} className={inputClass} placeholder="850" required />
                </div>
                <div>
                  <label className={labelClass}>Crop Type</label>
                  <input type="text" value={form.cropType} onChange={e => update('cropType', e.target.value)} className={inputClass} placeholder="Rice, Wheat" />
                </div>
              </div>

              <h3 className="text-md font-semibold text-white mt-6 pt-4 border-t border-white/5">
                👤 Farmer Information (Offline)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>Farmer Name</label>
                  <input type="text" value={form.farmerName} onChange={e => update('farmerName', e.target.value)} className={inputClass} placeholder="Rajesh Kumar" />
                </div>
                <div>
                  <label className={labelClass}>Contact</label>
                  <input type="text" value={form.farmerContact} onChange={e => update('farmerContact', e.target.value)} className={inputClass} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className={labelClass}>Number of Farmers</label>
                  <input type="number" min="1" value={form.numberOfFarmers} onChange={e => update('numberOfFarmers', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="button" onClick={() => setStep(2)} className="bg-[#639922] hover:bg-[#2d5016] text-white font-medium px-6 py-2.5 rounded-xl transition-all">
                  Next: Carbon Data →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Carbon */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white mb-4">🔬 Soil Measurements</h2>

              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-xl text-sm">
                <strong>Formula:</strong> Carbon Stock = SOC% × Bulk Density × Depth(cm) × Area(ha) × 100 → ×3.67 = CO₂e
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>SOC - Soil Organic Carbon (%) *</label>
                  <input type="number" step="0.0001" min="0.01" max="20" value={form.soc} onChange={e => update('soc', e.target.value)} className={inputClass} placeholder="2.8" required />
                  <p className="text-xs text-gray-600 mt-1">Typical: 0.5% - 10%</p>
                </div>
                <div>
                  <label className={labelClass}>Bulk Density (g/cm³) *</label>
                  <input type="number" step="0.0001" min="0.5" max="2.5" value={form.bulkDensity} onChange={e => update('bulkDensity', e.target.value)} className={inputClass} placeholder="1.35" required />
                  <p className="text-xs text-gray-600 mt-1">Typical: 1.0 - 1.8 g/cm³</p>
                </div>
                <div>
                  <label className={labelClass}>Depth (cm) *</label>
                  <input type="number" step="0.1" min="1" max="300" value={form.depth} onChange={e => update('depth', e.target.value)} className={inputClass} placeholder="50" required />
                  <p className="text-xs text-gray-600 mt-1">Typical: 10 - 100 cm</p>
                </div>
              </div>

              {/* Live Preview */}
              {form.soc && form.bulkDensity && form.depth && form.area && (
                <div className="bg-[#639922]/10 border border-[#639922]/30 rounded-xl p-5 mt-4">
                  <h3 className="text-[#639922] font-semibold mb-3">📊 Estimated Credits</h3>
                  {(() => {
                    const cs = (parseFloat(form.soc)/100) * parseFloat(form.bulkDensity) * parseFloat(form.depth) * parseFloat(form.area) * 100;
                    const co2 = cs * 3.67;
                    return (
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-white">{cs.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">Carbon Stock (tons)</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{co2.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">CO₂ Equivalent (tons)</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[#639922]">{Math.round(co2 * 100) / 100}</p>
                          <p className="text-xs text-gray-400">Credits Generated</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(1)} className="text-gray-400 hover:text-white transition-colors">
                  ← Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="bg-[#639922] hover:bg-[#2d5016] text-white font-medium px-6 py-2.5 rounded-xl transition-all">
                  Next: Listing Info →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Listing */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white mb-4">🏷️ Marketplace Listing</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelClass}>Listing Title *</label>
                  <input type="text" value={form.title} onChange={e => update('title', e.target.value)} className={inputClass} placeholder="Maharashtra Regenerative Agriculture Project" required />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Subtitle</label>
                  <input type="text" value={form.subtitle} onChange={e => update('subtitle', e.target.value)} className={inputClass} placeholder="Carbon sequestration through no-till farming practices" />
                </div>
                <div>
                  <label className={labelClass}>Price per Credit (ETH) *</label>
                  <input type="number" step="0.000001" min="0.000001" value={form.pricePerCredit} onChange={e => update('pricePerCredit', e.target.value)} className={inputClass} placeholder="0.001" required />
                </div>
                <div>
                  <label className={labelClass}>Vintage Year</label>
                  <input type="number" min="2000" max="2100" value={form.vintageYear} onChange={e => update('vintageYear', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Verification Standard</label>
                  <input type="text" value={form.verificationStandard} onChange={e => update('verificationStandard', e.target.value)} className={inputClass} placeholder="Verra VCS, Gold Standard" />
                </div>
                <div>
                  <label className={labelClass}>Cover Image URL</label>
                  <input type="url" value={form.coverImageUrl} onChange={e => update('coverImageUrl', e.target.value)} className={inputClass} placeholder="https://..." />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className={labelClass}>Practice Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className={inputClass}
                    placeholder="e.g., No-Till, Cover Cropping"
                  />
                  <button type="button" onClick={addTag} className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl transition-all">
                    Add
                  </button>
                </div>
                {form.practiceTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.practiceTags.map(tag => (
                      <span key={tag} className="bg-[#639922]/20 text-[#639922] text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className={labelClass}>Initial Status</label>
                <div className="flex gap-3">
                  {['draft', 'active'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update('listingStatus', s)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        form.listingStatus === s
                          ? 'bg-[#639922] text-white'
                          : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {s === 'draft' ? '📝 Draft' : '🟢 Active (publish now)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(2)} className="text-gray-400 hover:text-white transition-colors">
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#639922] hover:bg-[#2d5016] disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Creating...
                    </>
                  ) : (
                    '🚀 Create Project'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
