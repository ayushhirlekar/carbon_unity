import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';

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

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isLanding
        ? 'bg-transparent backdrop-blur-md border-b border-white/10'
        : 'bg-[#1a1a2e] border-b border-[#2d5016]/30'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-bold text-white tracking-tight">
              Carbon<span className="text-[#639922]">Unity</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/marketplace"
              className="text-gray-300 hover:text-[#639922] transition-colors text-sm font-medium"
            >
              Marketplace
            </Link>

            {isAuthenticated && isAdmin && (
              <Link
                to="/admin"
                className="text-gray-300 hover:text-[#639922] transition-colors text-sm font-medium"
              >
                Admin Panel
              </Link>
            )}

            {isAuthenticated && isBuyer && (
              <Link
                to="/buyer"
                className="text-gray-300 hover:text-[#639922] transition-colors text-sm font-medium"
              >
                My Dashboard
              </Link>
            )}
          </div>

          {/* Auth / Wallet */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  {user?.role === 'admin' ? '🛡️' : '🛒'}{' '}
                  {user?.display_name || `${account?.slice(0, 6)}...${account?.slice(-4)}`}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {account ? (
                  <Link
                    to="/auth"
                    className="bg-[#639922] hover:bg-[#2d5016] text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    Sign In
                  </Link>
                ) : (
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting || !hasMetaMask}
                    className="bg-[#639922] hover:bg-[#2d5016] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    {isConnecting ? 'Connecting...' : hasMetaMask ? 'Connect Wallet' : 'Install MetaMask'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
