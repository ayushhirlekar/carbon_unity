import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import marketplaceService from '../../services/marketplaceService';
import StatCard from '../../components/common/StatCard';
import Skeleton from '../../components/common/Skeleton';

// Icons
const MarketplaceIcon = () => (
  <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  </svg>
);

const LeafIcon = () => (
  <svg className="w-5 h-5 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);

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

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in font-sans">
        <div className="h-8 w-60"><Skeleton className="h-8 w-full" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28"><Skeleton className="h-full w-full rounded-2xl" /></div>
          ))}
        </div>
      </div>
    );
  }

  const creditsCount = stats?.totalCreditsOwned || 0;
  const purchasesCount = stats?.totalPurchases || 0;
  const ethSpent = stats?.totalEthSpent || '0.000000';

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      {/* Top Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Buyer Portfolio
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
          Carbon Offset Dashboard
        </h1>
        <p className="text-sm text-surface-600 mt-1">
          Monitor your retired and active carbon credits settled on Sepolia
        </p>
      </div>

      {/* Wallet Banner */}
      {user?.wallet_address && (
        <div className="p-4 rounded-2xl bg-white border border-surface-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm border border-brand-200 shadow-subtle shrink-0">
              {user?.display_name?.[0]?.toUpperCase() || 'B'}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-surface-400 font-semibold block">
                Active Buyer Account
              </span>
              <span className="text-sm font-bold text-surface-900">
                {user.display_name || 'Verified Institution'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-surface-50 border border-surface-200 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-surface-700 font-semibold">
              {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
            </span>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={<LeafIcon />}
          label="Credits Owned"
          value={creditsCount.toLocaleString()}
          sub="Verified metric tons CO₂"
        />
        <StatCard
          icon={<HistoryIcon />}
          label="Transactions"
          value={purchasesCount}
          sub="Smart contract settlements"
        />
        <StatCard
          icon={<MarketplaceIcon />}
          label="Total ETH Deployed"
          value={`${parseFloat(ethSpent).toFixed(4)}`}
          sub="Paid to farmers on-chain"
        />
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card">
        <h2 className="text-base font-bold text-surface-900 tracking-tight mb-4">
          Marketplace Operations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/marketplace"
            className="p-5 rounded-2xl bg-surface-50 border border-surface-200 hover:border-brand-300 hover:bg-brand-50/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-surface-200 text-brand-600 flex items-center justify-center shadow-subtle group-hover:scale-105 transition-transform">
              <MarketplaceIcon />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900 group-hover:text-brand-800 transition-colors">
                Browse Marketplace
              </h3>
              <p className="text-xs text-surface-500 mt-0.5">
                Explore newly verified agricultural carbon projects in India
              </p>
            </div>
          </Link>

          <Link
            to="/buyer/purchases"
            className="p-5 rounded-2xl bg-surface-50 border border-surface-200 hover:border-brand-300 hover:bg-brand-50/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-surface-200 text-emerald-600 flex items-center justify-center shadow-subtle group-hover:scale-105 transition-transform">
              <HistoryIcon />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900 group-hover:text-brand-800 transition-colors">
                Purchase History & Receipts
              </h3>
              <p className="text-xs text-surface-500 mt-0.5">
                View cryptographic transaction receipts and verify on Sepolia
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}