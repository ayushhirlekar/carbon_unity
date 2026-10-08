import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useToast } from '../components/common/Toast';
import Button from '../components/common/Button';

const LeafIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);

const WalletIcon = () => (
  <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V9" />
  </svg>
);

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, isAdmin } = useAuth();
  const { account, connectWallet, hasMetaMask } = useWeb3();
  const toast = useToast();

  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('farmer');
  const [displayName, setDisplayName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  const homeFor = (r) => (r === 'admin' ? '/admin' : r === 'farmer' ? '/farmer' : '/buyer');

  if (isAuthenticated) {
    navigate(isAdmin ? '/admin' : '/buyer', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) { toast.error('Please connect your wallet first'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await login(account);
        toast.success('Welcome back!');
        navigate(homeFor(user.role));
      } else {
        if (!displayName.trim()) { toast.error('Please enter a display name'); setLoading(false); return; }
        if (role === 'admin' && !adminCode.trim()) {
          toast.error('Enter the admin code'); setLoading(false); return;
        }
        const user = await register(account, role, displayName, { adminCode });
        toast.success('Account created!');
        navigate(homeFor(user.role));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center animate-fade-in">
        <Link to="/" className="flex items-center mb-2 group">
          <span className="text-2xl font-black tracking-tight text-surface-900 font-display">
            CARBON<span className="text-brand-600 font-extrabold">UNITY</span>
          </span>
        </Link>
        <p className="text-sm font-medium text-surface-500">
          Decentralized verification and non-custodial carbon trading
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-surface-200 shadow-card-hover overflow-hidden animate-scale-in">
        {/* Tab Switcher */}
        <div className="p-1.5 bg-surface-100/80 border-b border-surface-200/80 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 text-sm font-semibold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-white text-surface-900 shadow-subtle'
                : 'text-surface-500 hover:text-surface-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 text-sm font-semibold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-white text-surface-900 shadow-subtle'
                : 'text-surface-500 hover:text-surface-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8">
          {!account ? (
            <div className="p-6 rounded-2xl bg-brand-50/50 border border-brand-200/60 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center mx-auto mb-4 shadow-subtle">
                <WalletIcon />
              </div>
              <h3 className="text-base font-bold text-surface-900 mb-1">Web3 Wallet Required</h3>
              <p className="text-xs text-surface-600 mb-6 leading-relaxed">
                Connect MetaMask or your browser Web3 wallet to authenticate seamlessly on Sepolia.
              </p>
              <Button
                variant="primary"
                onClick={connectWallet}
                disabled={!hasMetaMask}
                className="w-full shadow-glow-brand"
              >
                {hasMetaMask ? 'Connect MetaMask' : 'Install MetaMask First'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Connected Wallet Pill */}
              <div className="p-3 rounded-xl bg-surface-50 border border-surface-200 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-surface-400 font-semibold">
                    Connected Wallet
                  </span>
                  <span className="text-xs font-mono font-bold text-brand-800">
                    {account.slice(0, 8)}...{account.slice(-6)}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sepolia
                </span>
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Ramesh Patil or Green Capital"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                      Account Role
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          value: 'farmer',
                          label: 'Farmer',
                          icon: (
                            <svg className="w-5 h-5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5m-15 10.5V10.5" />
                            </svg>
                          ),
                          desc: 'Land & MRV'
                        },
                        {
                          value: 'buyer',
                          label: 'Buyer',
                          icon: (
                            <svg className="w-5 h-5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                            </svg>
                          ),
                          desc: 'Trade & Offset'
                        },
                        {
                          value: 'admin',
                          label: 'Admin',
                          icon: (
                            <svg className="w-5 h-5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                          ),
                          desc: 'Audit Host'
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRole(opt.value)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            role === opt.value
                              ? 'border-brand-600 bg-brand-50/70 shadow-subtle ring-1 ring-brand-500'
                              : 'border-surface-200 hover:border-surface-300 bg-white'
                          }`}
                        >
                          <div className="mb-2">{opt.icon}</div>
                          <span className="text-xs font-bold text-surface-900 block">{opt.label}</span>
                          <span className="text-[10px] text-surface-500 block">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {role === 'admin' && (
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                      <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                        Admin Secret Passcode
                      </label>
                      <input
                        type="password"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        placeholder="Required for administrative accounts"
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-[10px] text-amber-700 mt-1 block">
                        Requires valid ADMIN_SIGNUP_CODE environment key
                      </span>
                    </div>
                  )}
                </>
              )}

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full mt-2 shadow-glow-brand"
              >
                {loading
                  ? 'Authenticating...'
                  : mode === 'login'
                  ? 'Sign In with Wallet'
                  : 'Complete Registration'}
              </Button>

              <div className="text-center pt-2 text-xs text-surface-500">
                {mode === 'login' ? (
                  <p>
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="font-bold text-brand-700 hover:underline"
                    >
                      Create one
                    </button>
                  </p>
                ) : (
                  <p>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="font-bold text-brand-700 hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}