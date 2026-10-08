import api from './api';

const unwrap = (res) => res.data.data;

const projectService = {
  list:    async () => unwrap(await api.get('/api/projects')),
  get:     async (id) => unwrap(await api.get(`/api/projects/${id}`)),
  members: async (id) => unwrap(await api.get(`/api/projects/${id}/members`)),
  create:  async (payload) => unwrap(await api.post('/api/projects', payload)),

  // Admin → farmer, by the code a farmer can read out loud.
  invite: async (id, { farmerCode, message }) =>
    unwrap(await api.post(`/api/projects/${id}/invite`, { farmerCode, message })),

  // Farmer → project.
  requestJoin: async (id, { farmId, message }) =>
    unwrap(await api.post(`/api/projects/${id}/request`, { farmId, message })),

  pendingRequests: async (id) => unwrap(await api.get(`/api/projects/${id}/requests`)),

  myInvitations: async () => unwrap(await api.get('/api/projects/invitations/mine')),
  accept:  async (invitationId) => (await api.post(`/api/projects/invitations/${invitationId}/accept`)).data,
  decline: async (invitationId) => (await api.post(`/api/projects/invitations/${invitationId}/decline`)).data,

  removeMember: async (projectId, farmId) =>
    (await api.post(`/api/projects/${projectId}/members/${farmId}/remove`)).data,
};

export default projectService;
