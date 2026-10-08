import api from './api';

const authService = {
  requestNonce: async (walletAddress) => {
    const res = await api.post('/api/auth/request-nonce', { walletAddress });
    return res.data;
  },

  // Spread rather than a fixed list, so adminCode, phone and
  // preferredLanguage reach the server without another edit here.
  register: async (payload) => {
    const res = await api.post('/api/auth/register', payload);
    return res.data;
  },

  login: async ({ walletAddress, signature, message }) => {
    const res = await api.post('/api/auth/login', {
      walletAddress, signature, message
    });
    return res.data;
  },

  getProfile: async () => {
    const res = await api.get('/api/auth/profile');
    return res.data;
  }
};

export default authService;
