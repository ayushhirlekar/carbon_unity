import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useToast } from '../components/common/Toast';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, isAdmin } = useAuth();
  const { account, connectWallet, hasMetaMask } = useWeb3();
  const toast = useToast();

  const [mode, setMode] = useState('login'); // login | register
  const [role, setRole] = useState('buyer');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate(isAdmin ? '/admin' : '/buyer', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await login(account);
        toast.success('Welcome back!');
        navigate(user.role === 'admin' ? '/admin' : '/buyer');
      } else {
        if (!displayName.trim()) {
          toast.error('Please enter a display name');
          setLoading(false);
          return;
        }
        const user = await register(account, role, displayName);
        toast.success('Account created!');
        navigate(user.role === 'admin' ? '/admin' : '/buyer');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-400">
            {mode === 'login'
              ? 'Sign in with your wallet'
              : 'Register to start using CarbonUnity'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-8">
          {/* Wallet Connection */}
          {!account ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#639922]/20 flex items-center justify-center">
                <span className="text-3xl">🦊</span>
              </div>
              <p className="text-gray-400 mb-6">Connect your MetaMask wallet to continue</p>
              <button
                onClick={connectWallet}
                disabled={!hasMetaMask}
                className="w-full bg-[#639922] hover:bg-[#2d5016] disabled:opacity-50 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
              >
                {hasMetaMask ? 'Connect MetaMask' : 'Install MetaMask First'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Connected wallet */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                <p className="text-sm text-white font-mono">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </p>
              </div>

              {/* Register fields */}
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#639922] transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'buyer', label: 'Buyer', icon: '🛒', desc: 'Purchase carbon credits' },
                        { value: 'admin', label: 'Admin', icon: '🛡️', desc: 'Manage projects' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRole(opt.value)}
                          className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                            role === opt.value
                              ? 'border-[#639922] bg-[#639922]/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <span className="text-2xl">{opt.icon}</span>
                          <p className="text-white font-medium mt-2">{opt.label}</p>
                          <p className="text-gray-500 text-xs mt-1">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#639922] hover:bg-[#2d5016] disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Signing...
                  </>
                ) : (
                  mode === 'login' ? 'Sign In with Wallet' : 'Create Account'
                )}
              </button>

              {/* Toggle mode */}
              <p className="text-center text-sm text-gray-500">
                {mode === 'login' ? (
                  <>
                    New here?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-[#639922] hover:underline"
                    >
                      Create account
                    </button>
                  </>
                ) : (
                  <>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-[#639922] hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
