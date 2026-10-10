import api from './api';

const mlService = {
  info: async () => (await api.get('/api/ml/soc/info')).data,
  start: async ({ rows, intervalMs }) =>
    (await api.post('/api/ml/soc/start', { rows, intervalMs })).data.run,
  status: async (runId) => (await api.get(`/api/ml/soc/run/${runId}`)).data.run,
  stop: async (runId) => (await api.post(`/api/ml/soc/run/${runId}/stop`)).data.run,
};

export default mlService;
