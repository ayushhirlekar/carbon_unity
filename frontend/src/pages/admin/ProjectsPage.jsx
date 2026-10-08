import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../components/common/Toast';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';

// Icons
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-3.5 h-3.5 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const res = await adminService.getProjects();
      setProjects(res.data || []);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (farmId, farmName) => {
    if (!confirm(`Delete "${farmName}"? This also deletes associated carbon data and listings.`)) return;
    try {
      await adminService.deleteProject(farmId);
      toast.success('Project deleted');
      setProjects((prev) => prev.filter((p) => p.farm_id !== farmId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in font-sans">
        <div className="h-8 w-60"><Skeleton className="h-8 w-full" /></div>
        <div className="h-4 w-40 mb-6"><Skeleton className="h-4 w-full" /></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28"><Skeleton className="h-full w-full rounded-2xl" /></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
            Registered Projects
          </h1>
          <p className="text-sm text-surface-600 mt-0.5">
            {projects.length} agricultural carbon project{projects.length !== 1 ? 's' : ''} in the platform
          </p>
        </div>

        <Link to="/admin/create-project">
          <Button variant="primary" size="md" className="shadow-glow-brand">
            <PlusIcon />
            <span>New Project</span>
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-surface-200 p-12 text-center max-w-lg mx-auto shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 text-surface-500 flex items-center justify-center mx-auto mb-3 shadow-subtle">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-surface-900">No projects registered yet</h2>
          <p className="text-xs text-surface-500 mt-1 mb-6">
            Create your first farm boundary or carbon offset project to begin monitoring.
          </p>
          <Link to="/admin/create-project">
            <Button variant="primary" size="md">
              Create Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const listing = project.marketplace_listings?.[0];
            const carbon = project.carbon_data?.[0];

            return (
              <div
                key={project.farm_id}
                className="bg-white rounded-2xl border border-surface-200 p-5 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-surface-900 tracking-tight">
                      {project.name}
                    </h3>
                    {project.is_verified && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ✓ Verified
                      </span>
                    )}
                    {listing && <StatusBadge status={listing.status} />}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <LocationIcon />
                    <span>
                      {project.location}
                      {project.district ? `, ${project.district}` : ''}
                      {project.state ? `, ${project.state}` : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1">
                    <span className="text-surface-600">{project.area} ha</span>
                    {project.farmer_name && (
                      <span className="text-surface-600">Farmer: {project.farmer_name}</span>
                    )}
                    {project.number_of_farmers > 1 && (
                      <span className="text-surface-600">{project.number_of_farmers} farmers</span>
                    )}
                    {carbon && (
                      <span className="text-brand-800 font-bold bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200">
                        {parseFloat(carbon.credits_generated).toLocaleString()} Credits
                      </span>
                    )}
                    {listing && (
                      <span className="text-surface-900 font-mono font-bold">
                        {parseFloat(listing.price_per_credit).toFixed(6)} ETH
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Link
                    to={`/admin/projects/${project.farm_id}`}
                    className="p-2.5 rounded-xl border border-surface-200 hover:border-brand-300 hover:bg-brand-50 text-surface-600 hover:text-brand-800 transition-colors shadow-subtle"
                    title="View Project Details"
                  >
                    <ViewIcon />
                  </Link>
                  <button
                    onClick={() => handleDelete(project.farm_id, project.name)}
                    className="p-2.5 rounded-xl border border-surface-200 hover:border-rose-200 hover:bg-rose-50 text-surface-400 hover:text-rose-600 transition-colors shadow-subtle"
                    title="Delete Project"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}