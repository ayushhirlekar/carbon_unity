import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../components/common/Toast';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';

// Icons
const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

export default function ProjectDetailPage() {
  const { farm_id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProject(); }, [farm_id]);

  const loadProject = async () => {
    try {
      const res = await adminService.getProjectDetail(farm_id);
      setProject(res.data);
    } catch {
      toast.error('Project not found');
      navigate('/admin/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await adminService.updateProject(farm_id, { listing: { status: newStatus } });
      toast.success(`Listing status updated to ${newStatus}`);
      loadProject();
    } catch {
      toast.error('Failed to update listing status');
    }
  };

  const handleVerify = async () => {
    try {
      await adminService.updateProject(farm_id, {
        farm: { is_verified: true },
        carbonData: { verified: true },
      });
      toast.success('Project and carbon stock marked as verified!');
      loadProject();
    } catch {
      toast.error('Failed to verify project');
    }
  };

  if (loading || !project) {
    return (
      <div className="space-y-6 animate-fade-in font-sans">
        <div className="h-6 w-36"><Skeleton className="h-6 w-full" /></div>
        <div className="h-10 w-72"><Skeleton className="h-10 w-full" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64"><Skeleton className="h-full w-full rounded-2xl" /></div>
          ))}
        </div>
      </div>
    );
  }

  const carbon = project.carbon_data?.[0] || {};
  const listing = project.marketplace_listings?.[0] || {};
  const transactions = listing.transactions || [];

  const InfoRow = ({ label, val, isHighlight, isGold }) => (
    <div className="flex justify-between items-center py-2 border-b border-surface-100 last:border-0 text-xs">
      <span className="text-surface-500 font-medium">{label}</span>
      <span
        className={`font-semibold ${
          isHighlight
            ? 'text-brand-800'
            : isGold
            ? 'text-amber-700 font-mono font-bold'
            : 'text-surface-900'
        }`}
      >
        {val}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/projects')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-surface-900 transition-colors"
      >
        <span className="p-1.5 rounded-lg bg-white border border-surface-200 shadow-subtle">
          <BackIcon />
        </span>
        <span>Back to Projects</span>
      </button>

      {/* Header and Audit Actions */}
      <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-surface-950 tracking-tight">
              {project.name}
            </h1>
            {project.is_verified && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                ✓ Verified
              </span>
            )}
            {listing.status && <StatusBadge status={listing.status} />}
          </div>
          <p className="text-xs text-surface-500 mt-1 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span>
              {project.location}
              {project.district ? `, ${project.district}` : ''}
              {project.state ? `, ${project.state}` : ''}
            </span>
          </p>
        </div>

        {/* Audit / Publishing Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {!project.is_verified && (
            <Button variant="primary" size="sm" onClick={handleVerify} className="shadow-subtle">
              Verify Ground-Truth
            </Button>
          )}
          {listing.status === 'draft' && (
            <Button variant="primary" size="sm" onClick={() => handleStatusChange('active')}>
              Publish to Marketplace
            </Button>
          )}
          {listing.status === 'active' && (
            <Button variant="secondary" size="sm" onClick={() => handleStatusChange('draft')}>
              Unpublish Listing
            </Button>
          )}
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Farm Details */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider pb-3 mb-3 border-b border-surface-100">
            Agricultural Registry
          </h2>
          <div className="space-y-1">
            <InfoRow label="Farm Identity" val={project.name} />
            <InfoRow label="Total Registered Area" val={`${project.area} hectares`} />
            <InfoRow label="Primary Crop Type" val={project.crop_type || '—'} />
            <InfoRow label="Lead Farmer" val={project.farmer_name || '—'} />
            <InfoRow label="Contact Info" val={project.farmer_contact || '—'} />
            <InfoRow label="Participating Farmers" val={project.number_of_farmers || 1} />
          </div>
        </div>

        {/* 2. Carbon Data */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider pb-3 mb-3 border-b border-surface-100">
            Soil Carbon Stock Math
          </h2>
          <div className="space-y-1">
            <InfoRow label="Soil Organic Carbon (SOC)" val={`${carbon.soc || '—'}%`} />
            <InfoRow label="Bulk Density" val={`${carbon.bulk_density || '—'} g/cm³`} />
            <InfoRow label="Sampling Depth" val={`${carbon.depth || '—'} cm`} />
            <InfoRow label="Total Carbon Stock" val={`${parseFloat(carbon.carbon_stock || 0).toLocaleString()} tons`} />
            <InfoRow label="CO₂ Equivalent" val={`${parseFloat(carbon.co2_equivalent || 0).toLocaleString()} tons`} />
            <InfoRow label="Audited Credits Minted" val={parseFloat(carbon.credits_generated || 0).toLocaleString()} isHighlight />
            <InfoRow label="Verified Status" val={carbon.verified ? '✓ Audited' : 'Pending Audit'} isHighlight={carbon.verified} />
          </div>
        </div>

        {/* 3. Marketplace Listing */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider pb-3 mb-3 border-b border-surface-100">
            Listing Terms & Standard
          </h2>
          <div className="space-y-1">
            <InfoRow label="Title" val={listing.title || '—'} />
            <InfoRow label="State" val={listing.status?.toUpperCase() || '—'} />
            <InfoRow label="Available Credits" val={parseFloat(listing.credits_available || 0).toLocaleString()} />
            <InfoRow label="Price per Credit" val={`${parseFloat(listing.price_per_credit || 0).toFixed(6)} ETH`} isGold />
            <InfoRow label="Vintage Year" val={listing.vintage_year || '—'} />
            <InfoRow label="Standard" val={listing.verification_standard || '—'} />
          </div>
          {listing.practice_tags?.length > 0 && (
            <div className="pt-3 flex flex-wrap gap-1.5">
              {listing.practice_tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-md bg-surface-100 text-surface-600 text-xs font-semibold">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Transactions */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider pb-3 mb-3 border-b border-surface-100 flex items-center justify-between">
            <span>Settled Transactions</span>
            <span className="text-xs font-normal text-surface-500 font-mono">({transactions.length})</span>
          </h2>
          {transactions.length === 0 ? (
            <p className="text-xs text-surface-400 py-6 text-center">No purchases recorded for this project yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.transaction_id} className="p-3.5 rounded-xl bg-surface-50 border border-surface-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-surface-500 font-medium">Buyer:</span>
                    <span className="font-mono font-bold text-surface-800">
                      {tx.buyer_wallet?.slice(0, 8)}...{tx.buyer_wallet?.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500 font-medium">Credits:</span>
                    <span className="font-bold text-brand-800">{tx.credits_purchased} tCO₂e</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500 font-medium">Paid:</span>
                    <span className="font-mono font-bold text-surface-900">{parseFloat(tx.price_paid).toFixed(6)} ETH</span>
                  </div>
                  {tx.blockchain_tx_hash && (
                    <div className="pt-1 text-right">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.blockchain_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
                      >
                        <span>Etherscan Receipt</span>
                        <ExternalLinkIcon />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}