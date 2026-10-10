import api from './api';

/**
 * Devices and their health.
 *
 * There is no Supabase client in the browser and this does not add
 * one: everything goes through Express, so the service-role key
 * stays server-side and row scoping is enforced by the controller
 * rather than by RLS policies that are not applied yet.
 */
const deviceService = {
  list: async (farmId) => (await api.get(`/api/devices/${farmId}`)).data,

  // The raw key comes back exactly once, in this response, and is
  // never retrievable again.
  create: async (farmId, { label, deviceType = 'soil_probe' } = {}) =>
    (await api.post('/api/devices', { farm_id: farmId, label, device_type: deviceType })).data,

  deactivate: async (deviceId) => (await api.delete(`/api/devices/${deviceId}`)).data,
};

export default deviceService;
