import api from './api';

const farmerService = {
  getMe: async () => {
    const res = await api.get('/api/farmer/me');
    return res.data.data;
  },

  listParcels: async () => {
    const res = await api.get('/api/farmer/parcels');
    return res.data.data;
  },

  // Dry run while the farmer is still drawing, so a conflict
  // shows before they submit rather than after.
  checkOverlap: async (boundary) => {
    const res = await api.post('/api/farmer/parcels/check-overlap', { boundary });
    return res.data.data;
  },

  // No area is sent. It is computed from the polygon by the
  // database, which is what stops a typed figure inflating credits.
  createParcel: async (payload) => {
    const res = await api.post('/api/farmer/parcels', payload);
    return res.data.data;
  },

  listSamples: async (farmId) => {
    const res = await api.get(`/api/farmer/parcels/${farmId}/samples`);
    return res.data.data;
  },

  addSoilCard: async (farmId, values) => {
    const res = await api.post(`/api/farmer/parcels/${farmId}/soil-card`, values);
    return res.data.data;
  },
};

export default farmerService;
