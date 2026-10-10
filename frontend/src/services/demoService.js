import api from './api';

/**
 * Trial data runs.
 *
 * Polled rather than streamed: no Supabase client in the browser,
 * no publishable key shipped, and nothing that depends on RLS
 * policies which are not applied yet. A 1s poll is enough to watch
 * a reading land.
 */
const demoService = {
  scenarios: async () => (await api.get('/api/demo/scenarios')).data,

  start: async (farmId, { scenario, days, intervalMs, reset }) =>
    (await api.post(`/api/demo/${farmId}/start`, { scenario, days, intervalMs, reset })).data.run,

  status: async (farmId, runId) =>
    (await api.get(`/api/demo/${farmId}/run/${runId}`)).data.run,

  stop: async (farmId, runId) =>
    (await api.post(`/api/demo/${farmId}/run/${runId}/stop`)).data.run,

  clear: async (farmId) => (await api.post(`/api/demo/${farmId}/clear`)).data,

  interpret: async (farmId, question) =>
    (await api.post(`/api/demo/${farmId}/interpret`, question ? { question } : {})).data,
};

export default demoService;
