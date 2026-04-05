import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../components/common/Toast';

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
const TxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);
const ShieldCheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const LocationIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);
const ExternalLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const S = {
  page: { background: '#EEF2EE', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '28px' },
  back: { fontSize: 13, color: '#4A6741', cursor: 'pointer', marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', fontFamily: 'inherit' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  titleRow: { fontSize: 22, fontWeight: 700, color: '#1C2B1C', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  subtitle: { fontSize: 13, color: '#4A6741', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 },
  badgeVerified: { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#D6EDCC', color: '#1C4A18', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 },
  card: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', padding: 20 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1C2B1C', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #D8E8D0', display: 'flex', alignItems: 'center', gap: 7 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #EEF2EE', fontSize: 13 },
  rowLabel: { color: '#4A6741' },
  rowVal: { color: '#1C2B1C', fontWeight: 500 },
  rowValGreen: { color: '#2D5A27', fontWeight: 600 },
  rowValGold: { color: '#8a6310', fontWeight: 600 },
  tag: { fontSize: 11, padding: '3px 9px', borderRadius: 6, background: '#E2EED9', color: '#2D5A27', fontWeight: 500, marginRight: 6, marginTop: 6, display: 'inline-block' },
  btnPrimary: { padding: '8px 16px', background: '#2D5A27', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginRight: 8, display: 'inline-flex', alignItems: 'center', gap: 5 },
  btnSecondary: { padding: '8px 16px', background: 'transparent', color: '#2D5A27', border: '1px solid #3A8A2A', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 },
  btnVerify: { padding: '8px 16px', background: '#1C4A18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginRight: 8, display: 'inline-flex', alignItems: 'center', gap: 5 },
  txCard: { background: '#fff', borderRadius: 10, border: '1px solid #D8E8D0', padding: '12px 14px', marginBottom: 8, fontSize: 12 },
  txRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 },
  ethLink: { fontSize: 11, color: '#185FA5', textDecoration: 'none', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 },
  spinner: { width: 36, height: 36, border: '3px solid #D8E8D0', borderTopColor: '#2D5A27', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '60px auto' },
};

export default function ProjectDetailPage() {
  const { farm_id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProject(); }, [farm_id]);

  const loadProject = async () => {
    try {
      const res = await adminService.getProjectDetail(farm_id);
      setProject(res.data);
    } catch (err) {
      toast.error('Project not found');
      navigate('/admin/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await adminService.updateProject(farm_id, { listing: { status: newStatus } });
      toast.success(`Status changed to ${newStatus}`);
      loadProject();
    } catch (err) { toast.error('Failed to update status'); }
  };

  const handleVerify = async () => {
    try {
      await adminService.updateProject(farm_id, { farm: { is_verified: true }, carbonData: { verified: true } });
      toast.success('Project verified!');
      loadProject();
    } catch (err) { toast.error('Failed to verify'); }
  };

  if (loading || !project) return (
    <div style={S.page}><div style={S.spinner} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
  );

  const carbon = project.carbon_data?.[0] || {};
  const listing = project.marketplace_listings?.[0] || {};
  const transactions = listing.transactions || [];

  const InfoRow = ({ label, val, valStyle }) => (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <span style={valStyle || S.rowVal}>{val}</span>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <button style={S.back} onClick={() => navigate('/admin/projects')}>
        <BackIcon /> Back to Projects
      </button>

      <div style={S.header}>
        <div>
          <div style={S.titleRow}>
            {project.name}
            {project.is_verified && (
              <span style={S.badgeVerified}><ShieldCheckIcon /> Verified</span>
            )}
          </div>
          <div style={S.subtitle}>
            <LocationIcon />
            {project.location}{project.district ? `, ${project.district}` : ''}{project.state ? `, ${project.state}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!project.is_verified && (
            <button style={S.btnVerify} onClick={handleVerify}>
              <ShieldCheckIcon /> Verify Project
            </button>
          )}
          {listing.status === 'draft' && (
            <button style={S.btnPrimary} onClick={() => handleStatusChange('active')}>
              Publish
            </button>
          )}
          {listing.status === 'active' && (
            <button style={S.btnSecondary} onClick={() => handleStatusChange('draft')}>
              Unpublish
            </button>
          )}
        </div>
      </div>

      <div style={S.grid}>
        {/* Farm */}
        <div style={S.card}>
          <div style={S.cardTitle}><FarmIcon /> Farm Details</div>
          {[
            ['Farm Name', project.name],
            ['Area', `${project.area} hectares`],
            ['Crop Type', project.crop_type || '—'],
            ['Farmer', project.farmer_name || '—'],
            ['Contact', project.farmer_contact || '—'],
            ['Farmers Count', project.number_of_farmers || 1],
          ].map(([l, v]) => <InfoRow key={l} label={l} val={v} />)}
        </div>

        {/* Carbon */}
        <div style={S.card}>
          <div style={S.cardTitle}><ScienceIcon /> Carbon Data</div>
          {[
            ['SOC', `${carbon.soc || '—'}%`, null],
            ['Bulk Density', `${carbon.bulk_density || '—'} g/cm³`, null],
            ['Depth', `${carbon.depth || '—'} cm`, null],
            ['Carbon Stock', `${parseFloat(carbon.carbon_stock || 0).toLocaleString()} tons`, null],
            ['CO₂ Equivalent', `${parseFloat(carbon.co2_equivalent || 0).toLocaleString()} tons`, null],
            ['Credits Generated', parseFloat(carbon.credits_generated || 0).toLocaleString(), S.rowValGreen],
            ['Verified', carbon.verified ? '✓ Yes' : '✕ No', carbon.verified ? S.rowValGreen : S.rowVal],
          ].map(([l, v, style]) => <InfoRow key={l} label={l} val={v} valStyle={style} />)}
        </div>

        {/* Listing */}
        <div style={S.card}>
          <div style={S.cardTitle}><TagIcon /> Listing</div>
          {[
            ['Title', listing.title || '—', null],
            ['Status', listing.status || '—', null],
            ['Credits Available', parseFloat(listing.credits_available || 0).toLocaleString(), null],
            ['Price per Credit', `${parseFloat(listing.price_per_credit || 0).toFixed(6)} ETH`, S.rowValGold],
            ['Vintage Year', listing.vintage_year || '—', null],
            ['Standard', listing.verification_standard || '—', null],
          ].map(([l, v, style]) => <InfoRow key={l} label={l} val={v} valStyle={style} />)}
          {listing.practice_tags?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {listing.practice_tags.map(tag => <span key={tag} style={S.tag}>{tag}</span>)}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div style={S.card}>
          <div style={S.cardTitle}><TxIcon /> Transactions ({transactions.length})</div>
          {transactions.length === 0 ? (
            <p style={{ fontSize: 13, color: '#4A6741' }}>No transactions yet</p>
          ) : (
            transactions.map(tx => (
              <div key={tx.transaction_id} style={S.txCard}>
                <div style={S.txRow}>
                  <span style={{ color: '#4A6741' }}>Buyer</span>
                  <span style={{ color: '#1C2B1C', fontFamily: 'monospace', fontSize: 11 }}>{tx.buyer_wallet?.slice(0, 8)}...{tx.buyer_wallet?.slice(-6)}</span>
                </div>
                <div style={S.txRow}>
                  <span style={{ color: '#4A6741' }}>Credits</span>
                  <span style={{ color: '#2D5A27', fontWeight: 600 }}>{tx.credits_purchased}</span>
                </div>
                <div style={S.txRow}>
                  <span style={{ color: '#4A6741' }}>Paid</span>
                  <span style={{ color: '#8a6310', fontWeight: 600 }}>{parseFloat(tx.price_paid).toFixed(6)} ETH</span>
                </div>
                {tx.blockchain_tx_hash && (
                  <a href={`https://sepolia.etherscan.io/tx/${tx.blockchain_tx_hash}`} target="_blank" rel="noopener noreferrer" style={S.ethLink}>
                    View on Etherscan <ExternalLinkIcon />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}