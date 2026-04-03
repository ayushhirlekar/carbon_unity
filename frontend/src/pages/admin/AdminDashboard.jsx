import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#639922] border-t-transparent rounded-full" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Projects', value: stats?.totalProjects || 0, icon: '📁', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20' },
    { label: 'Active Listings', value: stats?.activeListings || 0, icon: '🟢', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20' },
    { label: 'Credits Generated', value: parseFloat(stats?.totalCreditsGenerated || 0).toLocaleString(), icon: '🌱', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/20' },
    { label: 'Credits Sold', value: parseFloat(stats?.totalCreditsSold || 0).toLocaleString(), icon: '💰', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/20' },
    { label: 'Total Revenue', value: `${stats?.totalRevenue || '0.000000'} ETH`, icon: '⟠', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/20' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your carbon credit projects</p>
        </div>
        <Link
          to="/admin/create-project"
          className="bg-[#639922] hover:bg-[#2d5016] text-white font-medium px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2"
        >
          <span>➕</span> New Project
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(card => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-6`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/admin/create-project"
            className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
          >
            <span className="text-xl">➕</span>
            <div>
              <p className="text-white font-medium text-sm">Create Project</p>
              <p className="text-gray-500 text-xs">Add new carbon offset project</p>
            </div>
          </Link>
          <Link
            to="/admin/projects"
            className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
          >
            <span className="text-xl">📁</span>
            <div>
              <p className="text-white font-medium text-sm">View Projects</p>
              <p className="text-gray-500 text-xs">Manage existing projects</p>
            </div>
          </Link>
          <Link
            to="/marketplace"
            className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
          >
            <span className="text-xl">🛒</span>
            <div>
              <p className="text-white font-medium text-sm">Marketplace</p>
              <p className="text-gray-500 text-xs">View public listings</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
