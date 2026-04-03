import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../components/common/Toast';

export default function ProjectDetailPage() {
  const { farm_id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [farm_id]);

  const loadProject = async () => {
    try {
      const res = await adminService.getProjectDetail(farm_id);
      setProject(res.data);
    } catch (err) {
      toast.error('Project not found');
      navigate('/admin/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await adminService.updateProject(farm_id, {
        listing: { status: newStatus }
      });
      toast.success(`Status changed to ${newStatus}`);
      loadProject();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleVerify = async () => {
    try {
      await adminService.updateProject(farm_id, {
        farm: { is_verified: true },
        carbonData: { verified: true }
      });
      toast.success('Project verified!');
      loadProject();
    } catch (err) {
      toast.error('Failed to verify');
    }
  };

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#639922] border-t-transparent rounded-full" />
      </div>
    );
  }

  const carbon = project.carbon_data?.[0] || {};
  const listing = project.marketplace_listings?.[0] || {};
  const transactions = listing.transactions || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button onClick={() => navigate('/admin/projects')} className="text-gray-500 hover:text-white text-sm mb-2 flex items-center gap-1">
            ← Back to Projects
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {project.name}
            {project.is_verified && (
              <span className="bg-emerald-500/20 text-emerald-400 text-sm px-3 py-1 rounded-full">✓ Verified</span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">📍 {project.location}</p>
        </div>

        <div className="flex gap-2">
          {!project.is_verified && (
            <button onClick={handleVerify} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm transition-all">
              ✓ Verify Project
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Farm Info */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🌾 Farm Details</h2>
          <div className="space-y-3 text-sm">
            {[
              ['Farm Name', project.name],
              ['Location', `${project.location}${project.district ? ', ' + project.district : ''}${project.state ? ', ' + project.state : ''}`],
              ['Area', `${project.area} hectares`],
              ['Crop Type', project.crop_type || '—'],
              ['Farmer', project.farmer_name || '—'],
              ['Contact', project.farmer_contact || '—'],
              ['Farmers Count', project.number_of_farmers || 1],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Carbon Data */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🔬 Carbon Data</h2>
          <div className="space-y-3 text-sm">
            {[
              ['SOC', `${carbon.soc}%`],
              ['Bulk Density', `${carbon.bulk_density} g/cm³`],
              ['Depth', `${carbon.depth} cm`],
              ['Carbon Stock', `${parseFloat(carbon.carbon_stock || 0).toLocaleString()} tons`],
              ['CO₂ Equivalent', `${parseFloat(carbon.co2_equivalent || 0).toLocaleString()} tons`],
              ['Credits Generated', `${parseFloat(carbon.credits_generated || 0).toLocaleString()}`],
              ['Verified', carbon.verified ? '✓ Yes' : '✕ No'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className={`${label === 'Credits Generated' ? 'text-[#639922] font-bold' : 'text-white'}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Listing Info */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🏷️ Listing</h2>
          <div className="space-y-3 text-sm mb-4">
            {[
              ['Title', listing.title || '—'],
              ['Status', listing.status || '—'],
              ['Credits Available', parseFloat(listing.credits_available || 0).toLocaleString()],
              ['Price per Credit', `${parseFloat(listing.price_per_credit || 0).toFixed(6)} ETH`],
              ['Vintage Year', listing.vintage_year || '—'],
              ['Standard', listing.verification_standard || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="text-white">{value}</span>
              </div>
            ))}
          </div>

          {listing.practice_tags && listing.practice_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.practice_tags.map(tag => (
                <span key={tag} className="bg-[#639922]/20 text-[#639922] text-xs px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Status Controls */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
            {listing.status === 'draft' && (
              <button onClick={() => handleStatusChange('active')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-all">
                🟢 Publish
              </button>
            )}
            {listing.status === 'active' && (
              <button onClick={() => handleStatusChange('draft')} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-all">
                📝 Unpublish
              </button>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">💳 Transactions ({transactions.length})</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map(tx => (
                <div key={tx.transaction_id} className="bg-white/5 rounded-xl p-4 text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Buyer</span>
                    <span className="text-white font-mono text-xs">
                      {tx.buyer_wallet?.slice(0, 8)}...{tx.buyer_wallet?.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Credits</span>
                    <span className="text-white">{tx.credits_purchased}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Paid</span>
                    <span className="text-[#c9a961]">{parseFloat(tx.price_paid).toFixed(6)} ETH</span>
                  </div>
                  {tx.blockchain_tx_hash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${tx.blockchain_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-2 block"
                    >
                      View on Etherscan →
                    </a>
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
