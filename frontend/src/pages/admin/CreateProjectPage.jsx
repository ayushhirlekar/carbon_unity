import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../components/common/Toast';

const EMPTY = {
  farmName: '', location: '', district: '', state: '', area: '',
  cropType: '', farmerName: '', farmerContact: '', numberOfFarmers: '1',
  soc: '', bulkDensity: '', depth: '',
  title: '', subtitle: '', coverImageUrl: '', pricePerCredit: '',
  vintageYear: new Date().getFullYear(), verificationStandard: 'gold standard',
  practiceTags: '', listingStatus: 'active',
};

// ── Icons ────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const FarmIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);
const ScienceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
  </svg>
);
const TagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path d="M6 6h.008v.008H6V6z" />
  </svg>
);

const S = {
  page: { background: '#EEF2EE', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '28px' },
  back: { fontSize: 13, color: '#4A6741', cursor: 'pointer', marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', fontFamily: 'inherit' },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#1C2B1C' },
  subtitle: { fontSize: 13, color: '#4A6741', marginTop: 3 },
  card: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', padding: 24, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#1C2B1C', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #D8E8D0', display: 'flex', alignItems: 'center', gap: 8 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 },
  group: { display: 'flex', flexDirection: 'column', gap: 5 },
  groupFull: { display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1/-1' },
  label: { fontSize: 11, fontWeight: 600, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.4px' },
  input: { padding: '9px 12px', border: '1px solid #C8DDBE', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#1C2B1C', background: '#fff', outline: 'none' },
  select: { padding: '9px 12px', border: '1px solid #C8DDBE', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#1C2B1C', background: '#fff', outline: 'none' },
  textarea: { padding: '9px 12px', border: '1px solid #C8DDBE', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#1C2B1C', background: '#fff', outline: 'none', resize: 'vertical', minHeight: 70 },
  hint: { fontSize: 11, color: '#4A6741', marginTop: 3 },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  btnCancel: { padding: '10px 22px', background: 'transparent', color: '#4A6741', border: '1px solid #C8DDBE', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  btnSubmit: { padding: '10px 28px', background: '#2D5A27', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .18s' },
  btnDisabled: { padding: '10px 28px', background: '#9ab89a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit' },
  error: { background: '#fce8e8', border: '1px solid #e57373', color: '#c0392b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 12 },
  calcBox: { background: '#EAF3DE', border: '1px solid #B8DDAC', borderRadius: 12, padding: '14px 16px', marginTop: 12 },
  calcTitle: { fontSize: 12, fontWeight: 600, color: '#1C4A18', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.4px' },
  calcGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 },
  calcItem: { textAlign: 'center' },
  calcVal: { fontSize: 18, fontWeight: 700, color: '#1C4A18', display: 'block' },
  calcLabel: { fontSize: 10, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.4px' },
};

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const estimateCarbon = () => {
    const soc = parseFloat(form.soc);
    const bd  = parseFloat(form.bulkDensity);
    const depth = parseFloat(form.depth);
    const area  = parseFloat(form.area);
    if (!soc || !bd || !depth || !area) return null;
    const carbonStock = (soc / 100) * bd * depth * area * 10;
    const co2eq   = carbonStock * 3.67;
    const credits = co2eq * 0.85;
    return { carbonStock: Math.round(carbonStock), co2eq: Math.round(co2eq), credits: Math.round(credits) };
  };

  const est = estimateCarbon();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        practiceTags: form.practiceTags ? form.practiceTags.split(',').map(t => t.trim()).filter(Boolean) : [],
        numberOfFarmers: parseInt(form.numberOfFarmers) || 1,
      };
      await adminService.createProject(payload);
      toast.success('Project created successfully!');
      navigate('/admin/projects');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', placeholder, hint, full }) => (
    <div style={full ? S.groupFull : S.group}>
      <label style={S.label}>{label}</label>
      <input style={S.input} name={name} type={type} value={form[name]} onChange={set} placeholder={placeholder} />
      {hint && <span style={S.hint}>{hint}</span>}
    </div>
  );

  return (
    <div style={S.page}>
      <button style={S.back} onClick={() => navigate('/admin/projects')}>
        <BackIcon /> Back to Projects
      </button>

      <div style={S.header}>
        <div style={S.title}>Create New Project</div>
        <div style={S.subtitle}>Farm data + carbon calculation + marketplace listing in one step</div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Farm Details */}
        <div style={S.card}>
          <div style={S.sectionTitle}><FarmIcon /> Farm Details</div>
          <div style={S.grid2}>
            <Field label="Farm Name *"          name="farmName"        placeholder="e.g. Ayush's Farm"          full />
            <Field label="Location *"           name="location"        placeholder="e.g. Konkan Coast" />
            <Field label="District"             name="district"        placeholder="e.g. Ratnagiri" />
            <Field label="State"                name="state"           placeholder="e.g. Maharashtra" />
            <Field label="Area (hectares) *"    name="area"            type="number" placeholder="e.g. 400" />
            <Field label="Crop Type"            name="cropType"        placeholder="e.g. Wheat, Rice" />
            <Field label="Farmer Name"          name="farmerName"      placeholder="e.g. Ramesh Patil" />
            <Field label="Farmer Contact"       name="farmerContact"   placeholder="Phone or email" />
            <Field label="Number of Farmers"    name="numberOfFarmers" type="number" placeholder="1" />
          </div>
        </div>

        {/* Soil & Carbon Data */}
        <div style={S.card}>
          <div style={S.sectionTitle}><ScienceIcon /> Soil & Carbon Data</div>
          <div style={S.grid2}>
            <Field label="SOC % *"              name="soc"         type="number" placeholder="e.g. 1.5"  hint="Soil Organic Carbon percentage" />
            <Field label="Bulk Density (g/cm³) *" name="bulkDensity" type="number" placeholder="e.g. 1.2" hint="Typical: 1.0–1.6 g/cm³" />
            <Field label="Depth (cm) *"         name="depth"       type="number" placeholder="e.g. 30"   hint="Sampling depth in cm" />
          </div>
          {est && (
            <div style={S.calcBox}>
              <div style={S.calcTitle}>Estimated Carbon Calculation</div>
              <div style={S.calcGrid}>
                <div style={S.calcItem}><span style={S.calcVal}>{est.carbonStock.toLocaleString()}</span><span style={S.calcLabel}>Carbon Stock (t)</span></div>
                <div style={S.calcItem}><span style={S.calcVal}>{est.co2eq.toLocaleString()}</span><span style={S.calcLabel}>CO₂ Equivalent (t)</span></div>
                <div style={S.calcItem}><span style={S.calcVal}>{est.credits.toLocaleString()}</span><span style={S.calcLabel}>Est. Credits</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Listing Details */}
        <div style={S.card}>
          <div style={S.sectionTitle}><TagIcon /> Marketplace Listing</div>
          <div style={S.grid2}>
            <div style={S.groupFull}>
              <label style={S.label}>Listing Title *</label>
              <input style={S.input} name="title" value={form.title} onChange={set} placeholder="e.g. Konkan Coastal Agroforestry Initiative" />
            </div>
            <div style={S.groupFull}>
              <label style={S.label}>Subtitle</label>
              <textarea style={S.textarea} name="subtitle" value={form.subtitle} onChange={set} placeholder="One line describing project impact" />
            </div>
            <Field label="Price per Credit (ETH) *" name="pricePerCredit" type="number" placeholder="e.g. 0.00001" />
            <Field label="Vintage Year"              name="vintageYear"    type="number" placeholder={String(new Date().getFullYear())} />
            <div style={S.group}>
              <label style={S.label}>Verification Standard</label>
              <select style={S.select} name="verificationStandard" value={form.verificationStandard} onChange={set}>
                <option value="gold standard">Gold Standard</option>
                <option value="vcs">VCS Verified</option>
              </select>
            </div>
            <div style={S.group}>
              <label style={S.label}>Listing Status</label>
              <select style={S.select} name="listingStatus" value={form.listingStatus} onChange={set}>
                <option value="active">Active (publish immediately)</option>
                <option value="draft">Draft (save for later)</option>
              </select>
            </div>
            <div style={S.groupFull}>
              <label style={S.label}>Practice Tags</label>
              <input style={S.input} name="practiceTags" value={form.practiceTags} onChange={set} placeholder="Agroforestry, Organic, No-Till (comma separated)" />
            </div>
            <div style={S.groupFull}>
              <label style={S.label}>Cover Image URL</label>
              <input style={S.input} name="coverImageUrl" value={form.coverImageUrl} onChange={set} placeholder="https://images.unsplash.com/..." />
            </div>
          </div>
        </div>

        {error && <div style={S.error}>{error}</div>}

        <div style={S.actions}>
          <button type="button" style={S.btnCancel} onClick={() => navigate('/admin/projects')}>Cancel</button>
          <button type="submit" style={loading ? S.btnDisabled : S.btnSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}