import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../components/common/Toast';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const res = await adminService.getProjects();
      setProjects(res.data || []);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (farmId, farmName) => {
    if (!confirm(`Delete "${farmName}"? This will also delete associated carbon data and listings.`)) return;
    try {
      await adminService.deleteProject(farmId);
      toast.success('Project deleted');
      setProjects(prev => prev.filter(p => p.farm_id !== farmId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#639922] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">{projects.length} project(s) created</p>
        </div>
        <Link
          to="/admin/create-project"
          className="bg-[#639922] hover:bg-[#2d5016] text-white font-medium px-5 py-2.5 rounded-xl transition-all"
        >
          ➕ New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-[#1a1a2e] border border-white/5 rounded-2xl">
          <span className="text-5xl mb-4 block">📁</span>
          <h3 className="text-xl text-white mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-6">Create your first carbon offset project</p>
          <Link to="/admin/create-project" className="bg-[#639922] text-white px-6 py-2.5 rounded-xl">
            Create Project
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(project => {
            const listing = project.marketplace_listings?.[0];
            const carbon = project.carbon_data?.[0];

            return (
              <div
                key={project.farm_id}
                className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                      {project.is_verified && (
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                          ✓ Verified
                        </span>
                      )}
                      {listing && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          listing.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          listing.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                          listing.status === 'sold' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {listing.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      📍 {project.location}{project.district ? `, ${project.district}` : ''}{project.state ? `, ${project.state}` : ''}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-gray-400">
                        🌾 {project.area} ha
                      </span>
                      {project.farmer_name && (
                        <span className="text-gray-400">
                          👤 {project.farmer_name}
                        </span>
                      )}
                      {carbon && (
                        <span className="text-[#639922]">
                          🌱 {parseFloat(carbon.credits_generated).toLocaleString()} credits
                        </span>
                      )}
                      {listing && (
                        <span className="text-[#c9a961]">
                          ⟠ {parseFloat(listing.price_per_credit).toFixed(6)} ETH/credit
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      to={`/admin/projects/${project.farm_id}`}
                      className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-all"
                      title="View Details"
                    >
                      👁️
                    </Link>
                    <button
                      onClick={() => handleDelete(project.farm_id, project.name)}
                      className="text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
