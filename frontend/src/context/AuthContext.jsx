import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWeb3 } from './Web3Context';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { account, signMessage, connectWallet } = useWeb3();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Auto-logout when wallet changes
  useEffect(() => {
    if (user && account && user.wallet_address !== account) {
      logout();
    }
  }, [account, user]);

  const login = useCallback(async (walletAddress) => {
    setError(null);
    try {
      // Step 1: Get nonce
      const nonceRes = await authService.requestNonce(walletAddress);
      const { message } = nonceRes.data;

      // Step 2: Sign message
      const signature = await signMessage(message);

      // Step 3: Login
      const loginRes = await authService.login({ walletAddress, signature, message });
      const { user: userData, token: jwt } = loginRes.data;

      setUser(userData);
      setToken(jwt);
      localStorage.setItem('token', jwt);
      localStorage.setItem('user', JSON.stringify(userData));

      return userData;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      throw err;
    }
  }, [signMessage]);

  const register = useCallback(async (walletAddress, role, displayName) => {
    setError(null);
    try {
      // Step 1: Get nonce
      const nonceRes = await authService.requestNonce(walletAddress);
      const { message } = nonceRes.data;

      // Step 2: Sign message
      const signature = await signMessage(message);

      // Step 3: Register
      const regRes = await authService.register({
        walletAddress, signature, message, role, displayName
      });
      const { user: userData, token: jwt } = regRes.data;

      setUser(userData);
      setToken(jwt);
      localStorage.setItem('token', jwt);
      localStorage.setItem('user', JSON.stringify(userData));

      return userData;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setError(msg);
      throw err;
    }
  }, [signMessage]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';
  const isBuyer = user?.role === 'buyer';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      isAuthenticated,
      isAdmin,
      isBuyer,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
