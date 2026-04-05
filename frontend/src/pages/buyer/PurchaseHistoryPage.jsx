import { useState, useEffect } from 'react';
import marketplaceService from '../../services/marketplaceService';

const S = {
  page: { background: '#EEF2EE', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '28px' },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#1C2B1C' },
  subtitle: { fontSize: 13, color: '#4A6741', marginTop: 3 },
  card: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', padding: '20px 24px', marginBottom: 14 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#1C2B1C', marginBottom: 3 },
  cardLocation: { fontSize: 12, color: '#4A6741' },
  statusConfirmed: { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#D6EDCC', color: '#1C4A18', fontWeight: 600 },
  statusPending: { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fdf3dc', color: '#7a5c10', fontWeight: 600 },
  statusFailed: { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fce8e8', color: '#c0392b', fontWeight: 600 },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 12, paddingTop: 14, borderTop: '1px solid #D8E8D0' },
  metaItem: {},
  metaLabel: { fontSize: 10, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 3 },
  metaVal: { fontSize: 14, fontWeight: 600, color: '#1C2B1C' },
  metaValGold: { fontSize: 14, fontWeight: 600, color: '#8a6310' },
  ethLink: { fontSize: 11, color: '#185FA5', textDecoration: 'none', marginTop: 10, display: 'inline-block' },
  empty: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', padding: '60px 20px', textAlign: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#1C2B1C', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#4A6741' },
  spinner: { width: 36, height: 36, border: '3px solid #D8E8D0', borderTopColor: '#2D5A27', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '60px auto' },
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

  const statusBadge = (status) => {
    if (status === 'confirmed') return <span style={S.statusConfirmed}>✓ Confirmed</span>;
    if (status === 'pending') return <span style={S.statusPending}>⏳ Pending</span>;
    return <span style={S.statusFailed}>✕ Failed</span>;
  };

  if (loading) return (
    <div style={S.page}><div style={S.spinner} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
  );

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={S.header}>
        <div style={S.title}>Purchase History</div>
        <div style={S.subtitle}>{purchases.length} transaction(s)</div>
      </div>

      {purchases.length === 0 ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}>📋</div>
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
                  📍 {tx.marketplace_listings?.location || tx.marketplace_listings?.farms?.location || '—'}
                </div>
              </div>
              {statusBadge(tx.status)}
            </div>

            <div style={S.metaGrid}>
              <div style={S.metaItem}>
                <span style={S.metaLabel}>Credits</span>
                <span style={S.metaVal}>{parseFloat(tx.credits_purchased).toLocaleString()}</span>
              </div>
              <div style={S.metaItem}>
                <span style={S.metaLabel}>Price Paid</span>
                <span style={S.metaValGold}>{parseFloat(tx.price_paid).toFixed(6)} ETH</span>
              </div>
              <div style={S.metaItem}>
                <span style={S.metaLabel}>Block</span>
                <span style={S.metaVal}>{tx.block_number || '—'}</span>
              </div>
              <div style={S.metaItem}>
                <span style={S.metaLabel}>Date</span>
                <span style={S.metaVal}>{new Date(tx.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {tx.blockchain_tx_hash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${tx.blockchain_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={S.ethLink}
              >
                View on Etherscan →
              </a>
            )}
          </div>
        ))
      )}
    </div>
  );
}