import api from './api';

const reportService = {
  latest: async (farmId) => (await api.get(`/api/reports/${farmId}/latest`)).data.report,
  history: async (farmId) => (await api.get(`/api/reports/${farmId}`)).data.reports,

  // force replaces today's report rather than returning the
  // existing one — used by "Generate again", not by the first press.
  generate: async (farmId, force = false) =>
    (await api.post(`/api/reports/${farmId}/generate${force ? '?force=1' : ''}`)).data,
};

export default reportService;
