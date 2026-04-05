import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import marketplaceService from '../../services/marketplaceService';

// ── Icons ────────────────────────────────────────────────────────────────────
const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V9" />
  </svg>
);

const MarketplaceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  </svg>
);

const S = {
  page: { background: '#EEF2EE', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '28px' },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#1C2B1C' },
  subtitle: { fontSize: 13, color: '#4A6741', marginTop: 3 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #D4E6CE' },
  statLabel: { fontSize: 11, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: 700, color: '#1C2B1C' },
  statSub: { fontSize: 12, color: '#2D5A27', marginLeft: 5, fontWeight: 400 },
  section: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#1C2B1C', marginBottom: 14 },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 },
  actionCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderRadius: 12, border: '1px solid #C8DDBE', textDecoration: 'none', transition: 'all .18s' },
  actionIconWrap: { width: 40, height: 40, borderRadius: 10, background: '#EAF3DE', border: '1px solid #B8DDAC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionTitle: { fontSize: 13, fontWeight: 600, color: '#1C2B1C', display: 'block' },
  actionDesc: { fontSize: 11, color: '#4A6741', display: 'block', marginTop: 2 },
  walletBox: { background: '#EAF3DE', borderRadius: 12, border: '1px solid #B8DDAC', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 },
  walletIconWrap: { width: 36, height: 36, borderRadius: 8, background: '#D6EDCC', border: '1px solid #B8DDAC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  walletLabel: { fontSize: 11, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 2 },
  walletAddr: { fontSize: 13, fontWeight: 600, color: '#1C4A18', fontFamily: 'monospace' },
  spinner: { width: 36, height: 36, border: '3px solid #D8E8D0', borderTopColor: '#2D5A27', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '60px auto' },
};

const actions = [
  { to: '/marketplace',      Icon: MarketplaceIcon, title: 'Browse Marketplace',  desc: 'Find carbon offset projects' },
  { to: '/buyer/purchases',  Icon: HistoryIcon,     title: 'Purchase History',    desc: 'View past transactions' },
];

export default function BuyerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await marketplaceService.getBuyerDashboard();
      setStats(res.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={S.page}><div style={S.spinner} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
  );

  const statCards = [
    { label: 'Credits Owned',    value: stats?.totalCreditsOwned || 0,       sub: 'credits' },
    { label: 'Total Purchases',  value: stats?.totalPurchases || 0,           sub: 'transactions' },
    { label: 'ETH Spent',        value: stats?.totalEthSpent || '0.000000',   sub: 'ETH' },
  ];

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .cu-action:hover{background:#EAF3DE!important;border-color:#2D5A27!important}`}</style>

      <div style={S.header}>
        <div style={S.title}>Buyer Dashboard</div>
        <div style={S.subtitle}>Track your carbon credit purchases</div>
      </div>

      {user?.wallet_address && (
        <div style={S.walletBox}>
          <div style={S.walletIconWrap}><WalletIcon /></div>
          <div>
            <span style={S.walletLabel}>Connected Wallet</span>
            <span style={S.walletAddr}>{user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}</span>
          </div>
          {user.display_name && (
            <div style={{ marginLeft: 'auto', fontSize: 13, color: '#1C4A18', fontWeight: 600 }}>
              {user.display_name}
            </div>
          )}
        </div>
      )}

      <div style={S.statsGrid}>
        {statCards.map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={S.statVal}>{s.value} <span style={S.statSub}>{s.sub}</span></div>
          </div>
        ))}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Quick Actions</div>
        <div style={S.actionGrid}>
          {actions.map(({ to, Icon, title, desc }) => (
            <Link key={to} to={to} className="cu-action" style={S.actionCard}>
              <div style={S.actionIconWrap}><Icon /></div>
              <div>
                <span style={S.actionTitle}>{title}</span>
                <span style={S.actionDesc}>{desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}