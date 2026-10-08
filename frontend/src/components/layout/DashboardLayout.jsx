import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Clean SVG Icons
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
    </svg>
  ),
  CreateProject: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Projects: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  Purchases: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
  Marketplace: () => (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  ),
};

export default function DashboardLayout() {
  const { isAdmin, isBuyer, user } = useAuth();

  const adminLinks = [
    { to: '/admin', label: 'Overview', icon: <Icons.Dashboard />, end: true },
    { to: '/admin/create-project', label: 'Create Project', icon: <Icons.CreateProject /> },
    { to: '/admin/projects', label: 'All Projects', icon: <Icons.Projects /> },
    { to: '/admin/carbon-projects', label: 'Carbon Group Host', icon: <Icons.Projects /> },
  ];

  const buyerLinks = [
    { to: '/buyer', label: 'Portfolio Overview', icon: <Icons.Dashboard />, end: true },
    { to: '/buyer/purchases', label: 'Purchase History', icon: <Icons.Purchases /> },
    { to: '/marketplace', label: 'Marketplace', icon: <Icons.Marketplace /> },
  ];

  const links = isAdmin ? adminLinks : buyerLinks;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex bg-surface-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-surface-200/90 flex flex-col shrink-0 shadow-subtle">
        {/* Workspace Identity */}
        <div className="p-4 border-b border-surface-100">
          <div className="p-3 rounded-xl bg-surface-50 border border-surface-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-800 to-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-subtle shrink-0">
              {user?.display_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-surface-900 truncate">
                {user?.display_name || 'Dashboard'}
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 capitalize">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {isAdmin ? 'Admin Console' : 'Buyer Portfolio'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <p className="px-3 py-1.5 text-[10px] font-bold text-surface-400 uppercase tracking-wider">
            Navigation
          </p>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-50 text-brand-900 shadow-subtle border border-brand-200/70'
                    : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100/70 border border-transparent'
                }`
              }
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-surface-100">
          <div className="flex items-center justify-between text-xs text-surface-400">
            <span className="font-mono">v2.1 Sepolia</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Synced
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}