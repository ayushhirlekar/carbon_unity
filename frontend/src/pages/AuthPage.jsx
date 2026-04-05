import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useToast } from '../components/common/Toast';

const LeafIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);

const WalletIcon = () => (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V9" />
  </svg>
);

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, isAdmin } = useAuth();
  const { account, connectWallet, hasMetaMask } = useWeb3();
  const toast = useToast();

  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('buyer');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

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
        navigate(user.role === 'admin' ? '/admin' : '/buyer');
      } else {
        if (!displayName.trim()) { toast.error('Please enter a display name'); setLoading(false); return; }
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
    <div style={{
      minHeight: '100vh', background: '#f0f5f0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#2d5016', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <LeafIcon />
        </div>
        <span style={{ fontSize: '26px', fontWeight: 800, color: '#1C2B1C', letterSpacing: '-0.5px' }}>
          Carbon<span style={{ color: '#639922' }}>Unity</span>
        </span>
      </div>
      <p style={{ fontSize: '14px', color: '#6a8a6e', marginBottom: '32px' }}>Verified carbon credits, on-chain</p>

      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '420px',
        boxShadow: '0 4px 24px rgba(30,80,30,0.10), 0 1px 4px rgba(30,80,30,0.06)',
        border: '1px solid #d4e8d4', overflow: 'hidden',
      }}>
        {/* Tab switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f0f5f0', padding: '6px', gap: '4px' }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '10px', borderRadius: '10px', border: 'none',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
              background: mode === m ? '#2d5016' : 'transparent',
              color: mode === m ? '#fff' : '#6a8a6e',
            }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '28px 28px 32px' }}>
          {!account ? (
            <div style={{ background: '#f0f7ec', border: '1px solid #c8ddc0', borderRadius: '14px', padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', background: '#e0f0d8', border: '1px solid #b8d8b0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#2d5016' }}>
                <WalletIcon />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#1C2B1C', marginBottom: '6px' }}>Connect your wallet</p>
              <p style={{ fontSize: '13px', color: '#6a8a6e', marginBottom: '20px' }}>MetaMask is required to sign in to CarbonUnity</p>
              <button
                onClick={connectWallet}
                disabled={!hasMetaMask}
                style={{
                  width: '100%', border: 'none', borderRadius: '10px', padding: '12px',
                  fontSize: '14px', fontWeight: 600, cursor: hasMetaMask ? 'pointer' : 'not-allowed',
                  background: hasMetaMask ? '#2d5016' : '#9BB89A', color: '#fff', transition: 'background 0.18s',
                }}
                onMouseEnter={e => { if (hasMetaMask) e.currentTarget.style.background = '#1C4018'; }}
                onMouseLeave={e => { if (hasMetaMask) e.currentTarget.style.background = '#2d5016'; }}
              >
                {hasMetaMask ? 'Connect MetaMask' : 'Install MetaMask First'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Connected wallet */}
              <div style={{ background: '#f0f7ec', border: '1px solid #c8ddc0', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#8aaa8e', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Connected wallet</div>
                <div style={{ fontSize: '13px', color: '#2d5016', fontWeight: 600, fontFamily: 'monospace' }}>{account.slice(0, 8)}...{account.slice(-6)}</div>
              </div>

              {mode === 'register' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3a5e3e', marginBottom: '6px' }}>Display Name</label>
                    <input
                      type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your name" required
                      style={{ width: '100%', background: '#f8fbf8', border: '1px solid #d0e4d0', borderRadius: '9px', padding: '10px 14px', fontSize: '14px', color: '#1C2B1C', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#2d5016'}
                      onBlur={e => e.target.style.borderColor = '#d0e4d0'}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3a5e3e', marginBottom: '6px' }}>Account Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {[
                        { value: 'buyer', label: 'Buyer', icon: '🛒', desc: 'Purchase carbon credits' },
                        { value: 'admin', label: 'Admin', icon: '🛡️', desc: 'Manage projects' },
                      ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setRole(opt.value)} style={{
                          padding: '14px 10px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                          border: role === opt.value ? '2px solid #2d5016' : '1.5px solid #d0e4d0',
                          background: role === opt.value ? '#f0f7ec' : '#fafcfa',
                        }}>
                          <span style={{ fontSize: '22px', display: 'block', marginBottom: '6px' }}>{opt.icon}</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1C2B1C', display: 'block' }}>{opt.label}</span>
                          <span style={{ fontSize: '11px', color: '#8aaa8e', display: 'block', marginTop: '2px' }}>{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit" disabled={loading}
                style={{ width: '100%', background: '#2d5016', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'background 0.18s', marginTop: '4px' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1C4018'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2d5016'; }}
              >
                {loading ? 'Signing...' : mode === 'login' ? 'Sign In with Wallet' : 'Create Account'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#8aaa8e' }}>
                {mode === 'login' ? (
                  <>New here?{' '}<button type="button" onClick={() => setMode('register')} style={{ color: '#2d5016', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Create account</button></>
                ) : (
                  <>Already registered?{' '}<button type="button" onClick={() => setMode('login')} style={{ color: '#2d5016', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Sign in</button></>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}