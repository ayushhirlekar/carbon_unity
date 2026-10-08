import api from './api';

const alertService = {
  list: async () => {
    const res = await api.get('/api/alerts');
    return { alerts: res.data.data, unread: res.data.unread };
  },
  markRead: async (alertId) => (await api.post(`/api/alerts/${alertId}/read`)).data,
  run: async () => (await api.post('/api/alerts/run')).data.data,
};

export default alertService;
