import api from './api';

const agentService = {
  ask: async (farmIdOrPayload, options = {}) => {
    const payload = typeof farmIdOrPayload === 'object'
      ? farmIdOrPayload
      : { farmId: farmIdOrPayload, ...options };
    const res = await api.post('/api/agent/chat', payload);
    return res.data.data;
  },

  getFacts: async (farmId) => {
    try {
      const res = await api.get(`/api/advisory/${farmId}/latest`);
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  history: async (farmId) => {
    const res = await api.get(`/api/agent/conversations/${farmId}`);
    return res.data.data;
  },

  assess: async (farmId) => {
    const res = await api.post(`/api/advisory/assess/${farmId}`);
    return res.data.data;
  },

  latest: async (farmId) => {
    const res = await api.get(`/api/advisory/${farmId}/latest`);
    return res.data.data;
  },

  refreshSensing: async (farmId) => {
    const res = await api.post(`/api/sensing/refresh/${farmId}`);
    return res.data.data;
  },

  sensingStatus: async (farmId) => {
    const res = await api.get(`/api/sensing/status/${farmId}`);
    return res.data.data;
  },
};

export default agentService;
