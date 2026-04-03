import api from './api';

const adminService = {
  createProject: async (projectData) => {
    const res = await api.post('/api/admin/create-project', projectData);
    return res.data;
  },

  getProjects: async () => {
    const res = await api.get('/api/admin/projects');
    return res.data;
  },

  getProjectDetail: async (farmId) => {
    const res = await api.get(`/api/admin/projects/${farmId}`);
    return res.data;
  },

  updateProject: async (farmId, updates) => {
    const res = await api.put(`/api/admin/projects/${farmId}`, updates);
    return res.data;
  },

  deleteProject: async (farmId) => {
    const res = await api.delete(`/api/admin/projects/${farmId}`);
    return res.data;
  },

  getDashboard: async () => {
    const res = await api.get('/api/admin/dashboard');
    return res.data;
  }
};

export default adminService;
