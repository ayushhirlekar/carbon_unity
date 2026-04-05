import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../config/constants';

// ── SVG Icon set ─────────────────────────────────────────────────────────────
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const ListingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
  </svg>
);

const MarketplaceIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const PurchasesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  </svg>
);

// ── Link definitions ──────────────────────────────────────────────────────────
const farmerLinks = [
  { to: '/farmer',          label: 'Dashboard',      icon: <DashboardIcon />, end: true },
  { to: '/farmer/farms',    label: 'My Farms',        icon: <HomeIcon /> },
  { to: '/farmer/listings', label: 'My Listings',     icon: <ListingsIcon /> },
  { to: '/marketplace',     label: 'Marketplace',     icon: <MarketplaceIcon /> },
];

const buyerLinks = [
  { to: '/buyer',            label: 'Dashboard',       icon: <DashboardIcon />, end: true },
  { to: '/marketplace',      label: 'Marketplace',     icon: <MarketplaceIcon /> },
  { to: '/buyer/purchases',  label: 'Purchase History', icon: <PurchasesIcon /> },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user } = useAuth();
  const links = user?.role === ROLES.FARMER ? farmerLinks : buyerLinks;

  return (
    <aside style={{
      display: 'none',
      width: '240px',
      flexShrink: 0,
      borderRight: '1px solid #D4E6CE',
      background: '#ffffff',
      minHeight: '100vh',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }}
    className="lg-sidebar"
    >
      {/* Nav links */}
      <div style={{ padding: '20px 12px', flex: 1 }}>
        <p style={{
          fontSize: '10px', fontWeight: 700, color: '#4A6741',
          textTransform: 'uppercase', letterSpacing: '0.6px',
          padding: '0 8px', marginBottom: '8px', margin: '0 0 8px 8px',
        }}>
          Navigation
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {links.map((link) => (
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
              <span style={{ display: 'flex', color: 'inherit' }}>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User info */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #D4E6CE' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #639922, #2d5016)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
              {user?.display_name?.[0]?.toUpperCase() || user?.role?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1C2B1C', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.display_name || 'Unnamed'}
            </p>
            <p style={{ fontSize: '11px', color: '#4A6741', margin: 0, textTransform: 'capitalize' }}>
              {user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Responsive show helper */}
      <style>{`
        @media (min-width: 1024px) {
          .lg-sidebar { display: flex !important; }
        }
      `}</style>
    </aside>
  );
}