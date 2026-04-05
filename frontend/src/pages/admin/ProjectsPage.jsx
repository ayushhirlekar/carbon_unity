import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../components/common/Toast';

// ── Icons ────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const LocationIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);
const AreaIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
  </svg>
);
const FarmerIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);
const LeafIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#2D5A27' }}>
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);
const EthIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 12l10 6 10-6L12 2zm0 0v10m-10 0l10 6 10-6" />
  </svg>
);
const ViewIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const EmptyFolderIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#B8DDAC" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const S = {
  page: { background: '#EEF2EE', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '28px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 700, color: '#1C2B1C', margin: 0 },
  subtitle: { fontSize: 13, color: '#4A6741', marginTop: 3 },
  addBtn: { padding: '9px 18px', background: '#2D5A27', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 },
  card: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', padding: '20px 24px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#1C2B1C', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardMeta: { fontSize: 12, color: '#4A6741', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 },
  badgeVerified: { fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#D6EDCC', color: '#1C4A18', fontWeight: 600 },
  badgeActive: { fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#D6EDCC', color: '#1C4A18', fontWeight: 600 },
  badgeDraft: { fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#E8EDE6', color: '#3D5438', fontWeight: 600 },
  badgeSold: { fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#fdf3dc', color: '#7a5c10', fontWeight: 600 },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#4A6741', alignItems: 'center' },
  metaItem: { display: 'flex', alignItems: 'center', gap: 4 },
  metaGreen: { color: '#2D5A27', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  metaGold: { color: '#8a6310', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  actions: { display: 'flex', gap: 8, flexShrink: 0 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, border: '1px solid #C8DDBE', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textDecoration: 'none', transition: 'all .18s', color: '#4A6741' },
  empty: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', padding: '60px 20px', textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#1C2B1C', marginBottom: 6, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: '#4A6741', marginBottom: 20 },
  spinner: { width: 36, height: 36, border: '3px solid #D8E8D0', borderTopColor: '#2D5A27', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '60px auto' },
};

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
    if (!confirm(`Delete "${farmName}"? This also deletes associated carbon data and listings.`)) return;
    try {
      await adminService.deleteProject(farmId);
      toast.success('Project deleted');
      setProjects(prev => prev.filter(p => p.farm_id !== farmId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const statusBadge = (status) => {
    const map = { active: S.badgeActive, draft: S.badgeDraft, sold: S.badgeSold };
    return <span style={map[status] || S.badgeDraft}>{status}</span>;
  };

  if (loading) return (
    <div style={S.page}>
      <div style={S.spinner} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .cu-del:hover{background:#fce8e8!important;border-color:#e57373!important;color:#c0392b!important}
        .cu-view:hover{background:#EAF3DE!important;border-color:#2D5A27!important;color:#2D5A27!important}
      `}</style>

      <div style={S.header}>
        <div>
          <div style={S.title}>Projects</div>
          <div style={S.subtitle}>{projects.length} project{projects.length !== 1 ? 's' : ''} created</div>
        </div>
        <Link to="/admin/create-project" style={S.addBtn}><PlusIcon /> New Project</Link>
      </div>

      {projects.length === 0 ? (
        <div style={S.empty}>
          <EmptyFolderIcon />
          <div style={S.emptyTitle}>No projects yet</div>
          <div style={S.emptyDesc}>Create your first carbon offset project</div>
          <Link to="/admin/create-project" style={{ ...S.addBtn, display: 'inline-flex' }}>Create Project</Link>
        </div>
      ) : (
        projects.map(project => {
          const listing = project.marketplace_listings?.[0];
          const carbon = project.carbon_data?.[0];
          return (
            <div key={project.farm_id} style={S.card}>
              <div style={{ flex: 1 }}>
                <div style={S.cardTitle}>
                  {project.name}
                  {project.is_verified && <span style={S.badgeVerified}>✓ Verified</span>}
                  {listing && statusBadge(listing.status)}
                </div>
                <div style={S.cardMeta}>
                  <LocationIcon />
                  {project.location}{project.district ? `, ${project.district}` : ''}{project.state ? `, ${project.state}` : ''}
                </div>
                <div style={S.metaRow}>
                  <span style={S.metaItem}><AreaIcon /> {project.area} ha</span>
                  {project.farmer_name && <span style={S.metaItem}><FarmerIcon /> {project.farmer_name}</span>}
                  {project.number_of_farmers > 1 && <span style={S.metaItem}><FarmerIcon /> {project.number_of_farmers} farmers</span>}
                  {carbon && <span style={S.metaGreen}><LeafIcon /> {parseFloat(carbon.credits_generated).toLocaleString()} credits</span>}
                  {listing && <span style={S.metaGold}><EthIcon /> {parseFloat(listing.price_per_credit).toFixed(6)} ETH/credit</span>}
                </div>
              </div>
              <div style={S.actions}>
                <Link to={`/admin/projects/${project.farm_id}`} className="cu-view" style={S.iconBtn} title="View Details">
                  <ViewIcon />
                </Link>
                <button className="cu-del" onClick={() => handleDelete(project.farm_id, project.name)} style={S.iconBtn} title="Delete">
                  <TrashIcon />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}