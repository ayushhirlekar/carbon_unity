import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';

const LeafIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const CartIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const WalletIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V9" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

export default function Navbar() {
  const { isAuthenticated, isAdmin, isBuyer, user, logout } = useAuth();
  const { account, connectWallet, isConnecting, hasMetaMask } = useWeb3();
  const location = useLocation();
  const navigate = useNavigate();

  const isLanding = location.pathname === '/';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    height: '60px',
    background: '#2d5016',
    borderBottom: '1px solid rgba(0,0,0,0.15)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  };

  const linkStyle = {
    textDecoration: 'none',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'color 0.2s',
  };

  return (
    <nav style={navStyle}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#2d5016',
          }}>
            <LeafIcon />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            Carbon<span style={{ color: '#a3d46f' }}>Unity</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <Link to="/marketplace" style={linkStyle}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
          >
            Marketplace
          </Link>

          {isAuthenticated && isAdmin && (
            <Link to="/admin" style={linkStyle}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
            >
              Admin Panel
            </Link>
          )}

          {isAuthenticated && isBuyer && (
            <Link to="/buyer" style={linkStyle}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
            >
              My Dashboard
            </Link>
          )}
        </div>

        {/* Auth / Wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAuthenticated ? (
            <>
              {/* User badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '20px', padding: '5px 12px 5px 7px',
              }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#2d5016', flexShrink: 0,
                }}>
                  {isAdmin ? <ShieldIcon /> : <CartIcon />}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.display_name || `${account?.slice(0, 6)}...${account?.slice(-4)}`}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px', padding: '6px 12px',
                  color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ffaaaa'; e.currentTarget.style.color = '#ffcccc'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              >
                <LogoutIcon />
                Logout
              </button>
            </>
          ) : (
            <>
              {account ? (
                <Link
                  to="/auth"
                  style={{
                    background: 'rgba(255,255,255,0.15)', color: '#fff',
                    textDecoration: 'none', fontSize: '13.5px', fontWeight: 500,
                    padding: '8px 18px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)', transition: 'background 0.18s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
                >
                  Sign In
                </Link>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting || !hasMetaMask}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: hasMetaMask ? '#fff' : 'rgba(255,255,255,0.2)',
                    color: hasMetaMask ? '#2d5016' : 'rgba(255,255,255,0.7)',
                    border: 'none',
                    fontSize: '13.5px', fontWeight: 600,
                    padding: '8px 16px', borderRadius: '8px',
                    cursor: hasMetaMask ? 'pointer' : 'not-allowed',
                    transition: 'all 0.18s',
                    opacity: isConnecting ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (hasMetaMask && !isConnecting) e.currentTarget.style.background = '#e8f5e0'; }}
                  onMouseLeave={e => { if (hasMetaMask) e.currentTarget.style.background = '#fff'; }}
                >
                  <WalletIcon />
                  {isConnecting ? 'Connecting...' : hasMetaMask ? 'Connect Wallet' : 'Install MetaMask'}
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </nav>
  );
}