import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';

// ── Icons ────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const LeafIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#2D5A27">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const MarketplaceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const S = {
  page: { background: '#EEF2EE', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '28px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 700, color: '#1C2B1C', margin: 0 },
  subtitle: { fontSize: 13, color: '#4A6741', marginTop: 3 },
  addBtn: { padding: '9px 18px', background: '#2D5A27', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #D4E6CE' },
  statLabel: { fontSize: 11, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: 700, color: '#1C2B1C' },
  statSub: { fontSize: 12, color: '#2D5A27', marginLeft: 5, fontWeight: 400 },
  section: { background: '#fff', borderRadius: 16, border: '1px solid #C8DDBE', padding: 24, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#1C2B1C', marginBottom: 16 },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 },
  actionCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#FAFCF8', borderRadius: 12, border: '1px solid #C8DDBE', textDecoration: 'none', transition: 'all .18s' },
  actionIconWrap: { width: 40, height: 40, borderRadius: 10, background: '#EAF3DE', border: '1px solid #B8DDAC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionTitle: { fontSize: 13, fontWeight: 600, color: '#1C2B1C', display: 'block' },
  actionDesc: { fontSize: 11, color: '#4A6741', display: 'block', marginTop: 2 },
  spinner: { width: 36, height: 36, border: '3px solid #D8E8D0', borderTopColor: '#2D5A27', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '60px auto' },
};

const actions = [
  { to: '/admin/create-project', Icon: LeafIcon,        title: 'Create Project',  desc: 'Add new carbon offset project' },
  { to: '/admin/projects',       Icon: FolderIcon,      title: 'View Projects',   desc: 'Manage existing projects' },
  { to: '/marketplace',          Icon: MarketplaceIcon, title: 'Marketplace',     desc: 'View public listings' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await adminService.getDashboard();
      setStats(res.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={S.page}>
      <div style={S.spinner} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const statCards = [
    { label: 'Total Projects',    value: stats?.totalProjects || 0 },
    { label: 'Active Listings',   value: stats?.activeListings || 0,                                    sub: 'live' },
    { label: 'Credits Generated', value: parseFloat(stats?.totalCreditsGenerated || 0).toLocaleString(), sub: 'total' },
    { label: 'Credits Sold',      value: parseFloat(stats?.totalCreditsSold || 0).toLocaleString(),      sub: 'sold' },
    { label: 'Total Revenue',     value: stats?.totalRevenue || '0.000000',                              sub: 'ETH' },
  ];

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .cu-action:hover{background:#EAF3DE!important;border-color:#2D5A27!important}`}</style>

      <div style={S.header}>
        <div>
          <div style={S.title}>Admin Dashboard</div>
          <div style={S.subtitle}>Manage your carbon credit projects</div>
        </div>
        <Link to="/admin/create-project" style={S.addBtn}>
          <PlusIcon /> New Project
        </Link>
      </div>

      <div style={S.statsGrid}>
        {statCards.map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={S.statVal}>{s.value}{s.sub && <span style={S.statSub}>{s.sub}</span>}</div>
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