import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function DashboardLayout() {
  const { isAdmin, isBuyer, user } = useAuth();

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/create-project', label: 'Create Project', icon: '➕' },
    { to: '/admin/projects', label: 'Projects', icon: '📁' },
  ];

  const buyerLinks = [
    { to: '/buyer', label: 'Dashboard', icon: '📊', end: true },
    { to: '/buyer/purchases', label: 'Purchase History', icon: '📋' },
    { to: '/marketplace', label: 'Marketplace', icon: '🛒' },
  ];

  const links = isAdmin ? adminLinks : buyerLinks;

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a2e] border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {isAdmin ? 'Admin Panel' : 'Buyer Dashboard'}
          </p>
          <p className="text-sm text-white font-medium truncate">
            {user?.display_name || 'User'}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#639922]/20 text-[#639922] border border-[#639922]/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="text-xs text-gray-600">
            CarbonUnity v2.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
