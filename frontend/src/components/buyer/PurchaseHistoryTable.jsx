import { useState, useEffect } from 'react';
import marketplaceService from '../../services/marketplaceService';

// ── Icons ────────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" />
  </svg>
);
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const LocationIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);
const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#B8DDAC" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  </svg>
);
const ExternalLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const S = {
  page: { background: '#EEF2EE', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '28px' },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#1C2B1C' },
  subtitle: { fontSize: 13, color: '#4A6741', marginTop: 3 },
  card: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', padding: '20px 24px', marginBottom: 14 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#1C2B1C', marginBottom: 3 },
  cardLocation: { fontSize: 12, color: '#4A6741', display: 'flex', alignItems: 'center', gap: 4 },
  badge: (type) => ({
    fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: 5,
    ...(type === 'confirmed' ? { background: '#D6EDCC', color: '#1C4A18' }
      : type === 'pending'   ? { background: '#fdf3dc', color: '#7a5c10' }
      :                        { background: '#fce8e8', color: '#c0392b' })
  }),
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 12, paddingTop: 14, borderTop: '1px solid #D8E8D0' },
  metaLabel: { fontSize: 10, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 3 },
  metaVal: { fontSize: 14, fontWeight: 600, color: '#1C2B1C' },
  metaValGold: { fontSize: 14, fontWeight: 600, color: '#8a6310' },
  ethLink: { fontSize: 11, color: '#185FA5', textDecoration: 'none', marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 4 },
  empty: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', padding: '60px 20px', textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#1C2B1C', marginBottom: 6, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: '#4A6741' },
  spinner: { width: 36, height: 36, border: '3px solid #D8E8D0', borderTopColor: '#2D5A27', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '60px auto' },
};

const statusConfig = {
  confirmed: { label: 'Confirmed', Icon: CheckIcon },
  pending:   { label: 'Pending',   Icon: ClockIcon },
  failed:    { label: 'Failed',    Icon: XIcon },
};

export default function PurchaseHistoryPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPurchases(); }, []);

  const loadPurchases = async () => {
    try {
      const res = await marketplaceService.getPurchaseHistory();
      setPurchases(res.data || []);
    } catch (err) {
      console.error('Load purchases error:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || statusConfig.failed;
    return (
      <span style={S.badge(status)}>
        <cfg.Icon />
        {cfg.label}
      </span>
    );
  };

  if (loading) return (
    <div style={S.page}><div style={S.spinner} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
  );

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={S.header}>
        <div style={S.title}>Purchase History</div>
        <div style={S.subtitle}>{purchases.length} transaction{purchases.length !== 1 ? 's' : ''}</div>
      </div>

      {purchases.length === 0 ? (
        <div style={S.empty}>
          <EmptyIcon />
          <div style={S.emptyTitle}>No purchases yet</div>
          <div style={S.emptyDesc}>Visit the marketplace to purchase carbon credits</div>
        </div>
      ) : (
        purchases.map(tx => (
          <div key={tx.transaction_id} style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={S.cardTitle}>
                  {tx.marketplace_listings?.title || `Listing #${tx.listing_id?.slice(0, 8)}`}
                </div>
                <div style={S.cardLocation}>
                  <LocationIcon />
                  {tx.marketplace_listings?.location || tx.marketplace_listings?.farms?.location || '—'}
                </div>
              </div>
              <StatusBadge status={tx.status} />
            </div>

            <div style={S.metaGrid}>
              <div>
                <span style={S.metaLabel}>Credits</span>
                <span style={S.metaVal}>{parseFloat(tx.credits_purchased).toLocaleString()}</span>
              </div>
              <div>
                <span style={S.metaLabel}>Price Paid</span>
                <span style={S.metaValGold}>{parseFloat(tx.price_paid).toFixed(6)} ETH</span>
              </div>
              <div>
                <span style={S.metaLabel}>Block</span>
                <span style={S.metaVal}>{tx.block_number || '—'}</span>
              </div>
              <div>
                <span style={S.metaLabel}>Date</span>
                <span style={S.metaVal}>{new Date(tx.created_at).toLocaleDateString()}</span>
              </div>
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
  );
}