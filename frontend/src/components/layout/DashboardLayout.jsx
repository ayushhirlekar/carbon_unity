import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// SVG Icons
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  CreateProject: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Projects: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  Purchases: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
  Marketplace: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  ),
  Leaf: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
    </svg>
  ),
};

export default function DashboardLayout() {
  const { isAdmin, isBuyer, user } = useAuth();

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: <Icons.Dashboard />, end: true },
    { to: '/admin/create-project', label: 'Create Project', icon: <Icons.CreateProject /> },
    { to: '/admin/projects', label: 'Projects', icon: <Icons.Projects /> },
  ];

  const buyerLinks = [
    { to: '/buyer', label: 'Dashboard', icon: <Icons.Dashboard />, end: true },
    { to: '/buyer/purchases', label: 'Purchase History', icon: <Icons.Purchases /> },
    { to: '/marketplace', label: 'Marketplace', icon: <Icons.Marketplace /> },
  ];

  const links = isAdmin ? adminLinks : buyerLinks;

  return (
    <div className="min-h-screen flex" style={{ background: '#EEF2EE', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: '256px',
        background: '#ffffff',
        borderRight: '1px solid #D4E6CE',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        minHeight: '100vh',
      }}>
        {/* Brand / User header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #D4E6CE' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #2d5016, #639922)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.Leaf />
            </div>
            <span style={{ fontSize: '17px', fontWeight: 800, color: '#1C2B1C', letterSpacing: '-0.3px' }}>
              Carbon<span style={{ color: '#639922' }}>Unity</span>
            </span>
          </div>

          {/* User pill */}
          <div style={{
            background: '#F0F7EC',
            border: '1px solid #C8DDBE',
            borderRadius: '10px',
            padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #639922, #2d5016)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                  {user?.display_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1C2B1C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                  {user?.display_name || 'User'}
                </p>
                <p style={{ fontSize: '11px', color: '#4A6741', margin: 0, textTransform: 'capitalize' }}>
                  {isAdmin ? 'Admin Panel' : 'Buyer Dashboard'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '0 8px', marginBottom: '8px' }}>
            Navigation
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.18s',
                  color: isActive ? '#2d5016' : '#4A6741',
                  background: isActive ? '#D6EDCC' : 'transparent',
                  border: isActive ? '1px solid #B8DDAC' : '1px solid transparent',
                })}
              >
                <span style={{ color: 'inherit', display: 'flex' }}>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #D4E6CE' }}>
          <p style={{ fontSize: '11px', color: '#9BB89A', margin: 0 }}>CarbonUnity v2.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 28px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}