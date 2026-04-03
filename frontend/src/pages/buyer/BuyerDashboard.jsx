import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import marketplaceService from '../../services/marketplaceService';

export default function BuyerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#639922] border-t-transparent rounded-full" />
      </div>
    );
  }

  const cards = [
    { label: 'Credits Owned', value: stats?.totalCreditsOwned || 0, icon: '🌱', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/20' },
    { label: 'Total Purchases', value: stats?.totalPurchases || 0, icon: '🛒', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20' },
    { label: 'ETH Spent', value: `${stats?.totalEthSpent || '0.000000'} ETH`, icon: '⟠', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/20' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Buyer Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Track your carbon credit purchases</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-6`}>
            <span className="text-2xl">{card.icon}</span>
            <p className="text-2xl font-bold text-white mt-3">{card.value}</p>
            <p className="text-sm text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/marketplace"
          className="flex items-center gap-3 p-5 bg-[#1a1a2e] hover:bg-white/5 rounded-2xl border border-white/5 transition-all"
        >
          <span className="text-2xl">🛒</span>
          <div>
            <p className="text-white font-medium">Browse Marketplace</p>
            <p className="text-gray-500 text-sm">Find carbon offset projects</p>
          </div>
        </Link>
        <Link
          to="/buyer/purchases"
          className="flex items-center gap-3 p-5 bg-[#1a1a2e] hover:bg-white/5 rounded-2xl border border-white/5 transition-all"
        >
          <span className="text-2xl">📋</span>
          <div>
            <p className="text-white font-medium">Purchase History</p>
            <p className="text-gray-500 text-sm">View past transactions</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
