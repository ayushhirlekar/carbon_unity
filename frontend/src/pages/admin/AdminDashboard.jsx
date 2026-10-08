import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';

// Icons
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const LeafIcon = () => (
  <svg className="w-5 h-5 text-brand-600" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);

const FolderIcon = () => (
  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const MarketplaceIcon = () => (
  <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const CoinsIcon = () => (
  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const actions = [
  { to: '/admin/create-project', Icon: LeafIcon, title: 'Create Project', desc: 'Onboard farm parcel & generate baseline' },
  { to: '/admin/projects', Icon: FolderIcon, title: 'All Projects', desc: 'Inspect farm registrations & audits' },
  { to: '/admin/carbon-projects', Icon: CoinsIcon, title: 'Carbon Group Host', desc: 'Multi-farmer aggregated carbon pool' },
  { to: '/marketplace', Icon: MarketplaceIcon, title: 'Marketplace View', desc: 'Public buyer catalog verification' },
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

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in font-sans">
        <div className="h-8 w-60"><Skeleton className="h-8 w-full" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28"><Skeleton className="h-full w-full rounded-2xl" /></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Registry Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
            Admin Console
          </h1>
          <p className="text-sm text-surface-600 mt-0.5">
            Manage smallholder verification, audit pipelines, and on-chain carbon inventory
          </p>
        </div>

        <Link to="/admin/create-project">
          <Button variant="primary" size="md" className="shadow-glow-brand">
            <PlusIcon />
            <span>Launch Project</span>
          </Button>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<FolderIcon />}
          label="Total Projects"
          value={stats?.totalProjects || 0}
          sub="Registered"
        />
        <StatCard
          icon={<MarketplaceIcon />}
          label="Active Listings"
          value={stats?.activeListings || 0}
          sub="Trading live"
        />
        <StatCard
          icon={<LeafIcon />}
          label="Credits Generated"
          value={parseFloat(stats?.totalCreditsGenerated || 0).toLocaleString()}
          sub="Total minted"
        />
        <StatCard
          icon={<CoinsIcon />}
          label="Credits Retired"
          value={parseFloat(stats?.totalCreditsSold || 0).toLocaleString()}
          sub="Acquired by buyers"
        />
        <StatCard
          icon={<CoinsIcon />}
          label="Gross Revenue"
          value={`${parseFloat(stats?.totalRevenue || 0).toFixed(4)}`}
          sub="ETH Settled"
        />
      </div>

      {/* Operations Panel */}
      <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card">
        <h2 className="text-base font-bold text-surface-900 tracking-tight mb-4">
          Administrative Workflows
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map(({ to, Icon, title, desc }) => (
            <Link
              key={to}
              to={to}
              className="p-5 rounded-2xl bg-surface-50 border border-surface-200 hover:border-brand-300 hover:bg-brand-50/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col group"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center shadow-subtle group-hover:scale-105 transition-transform mb-3">
                <Icon />
              </div>
              <h3 className="text-sm font-bold text-surface-900 group-hover:text-brand-800 transition-colors">
                {title}
              </h3>
              <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                {desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}