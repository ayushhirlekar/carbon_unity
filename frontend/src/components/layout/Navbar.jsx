import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';

const LeafIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const CartIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const WalletIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V9" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

export default function Navbar() {
  const { isAuthenticated, isAdmin, isBuyer, user, logout } = useAuth();
  const { account, connectWallet, isConnecting, hasMetaMask } = useWeb3();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isLinkActive = (path) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-nav transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">

        {/* Brand Logo */}
        <Link to="/" className="flex items-center group shrink-0">
          <span className="text-xl font-black tracking-tight text-surface-900 font-display">
            CARBON<span className="text-brand-600 font-extrabold">UNITY</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <Link
            to="/marketplace"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isLinkActive('/marketplace')
                ? 'bg-brand-50 text-brand-800 font-semibold shadow-subtle'
                : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100/70'
            }`}
          >
            Marketplace
          </Link>

          <Link
            to="/#features"
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-100/70 transition-all"
          >
            Architecture
          </Link>

          <Link
            to="/#how-it-works"
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-100/70 transition-all"
          >
            How it Works
          </Link>

          {isAuthenticated && isAdmin && (
            <Link
              to="/admin"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                location.pathname.startsWith('/admin')
                  ? 'bg-brand-50 text-brand-800 font-semibold shadow-subtle'
                  : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100/70'
              }`}
            >
              Admin Panel
            </Link>
          )}

          {isAuthenticated && isBuyer && (
            <Link
              to="/buyer"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                location.pathname.startsWith('/buyer')
                  ? 'bg-brand-50 text-brand-800 font-semibold shadow-subtle'
                  : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100/70'
              }`}
            >
              Buyer Dashboard
            </Link>
          )}
        </nav>

        {/* Right Section: Web3 & Account */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              {/* User Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-100 border border-surface-200/90 text-surface-800 text-xs font-medium shadow-subtle">
                <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
                  {isAdmin ? <ShieldIcon /> : <CartIcon />}
                </div>
                <span className="max-w-[130px] truncate font-semibold">
                  {user?.display_name || `${account?.slice(0, 6)}...${account?.slice(-4)}`}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Sepolia Testnet Connected" />
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 text-surface-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-semibold transition-all active:scale-95"
                title="Disconnect"
              >
                <LogoutIcon />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              {/* Wallet connection */}
              {account ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-900 text-xs font-mono font-medium shadow-subtle">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{`${account.slice(0, 6)}...${account.slice(-4)}`}</span>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting || !hasMetaMask}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-900 hover:bg-surface-800 text-white text-xs font-semibold shadow-subtle hover:shadow-card active:scale-95 transition-all disabled:opacity-50"
                >
                  <WalletIcon />
                  <span>{isConnecting ? 'Connecting...' : hasMetaMask ? 'Connect Wallet' : 'MetaMask'}</span>
                </button>
              )}

              <Link
                to="/auth"
                className="inline-flex items-center px-4 py-1.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold shadow-subtle hover:shadow-glow-brand active:scale-95 transition-all"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}