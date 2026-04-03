import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import marketplaceService from '../services/marketplaceService';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useToast } from '../components/common/Toast';
import { purchaseCreditsOnChain } from '../services/contractService';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isBuyer } = useAuth();
  const { account, connectWallet, isSepolia, switchToSepolia } = useWeb3();
  const toast = useToast();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [credits, setCredits] = useState('');

  useEffect(() => { loadListing(); }, [id]);

  const loadListing = async () => {
    try {
      const res = await marketplaceService.getListingDetail(id);
      setListing(res.data);
    } catch (err) {
      toast.error('Listing not found');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated || !isBuyer) {
      toast.error('Please sign in as a buyer to purchase');
      navigate('/auth');
      return;
    }

    if (!isSepolia) {
      toast.warning('Please switch to Sepolia network');
      await switchToSepolia();
      return;
    }

    const creditAmount = parseFloat(credits) || parseFloat(listing.credits_available);
    if (creditAmount <= 0 || creditAmount > parseFloat(listing.credits_available)) {
      toast.error(`Invalid amount. Max: ${listing.credits_available}`);
      return;
    }

    const totalEth = (creditAmount * parseFloat(listing.price_per_credit)).toFixed(18);

    setPurchasing(true);
    try {
      // Step 1: Blockchain transaction via MetaMask
      toast.info('Confirm transaction in MetaMask...');

      // Use direct ETH transfer if no contract configured, otherwise use contract
      let txHash;
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

      if (contractAddress) {
        const result = await purchaseCreditsOnChain(1, creditAmount, totalEth);
        txHash = result.txHash;
      } else {
        // Direct ETH transfer fallback
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: listing.created_by,
          value: ethers.parseEther(totalEth)
        });
        const receipt = await tx.wait();
        txHash = receipt.hash;
      }

      toast.info('Transaction confirmed! Recording purchase...');

      // Step 2: Record in backend
      const result = await marketplaceService.purchaseCredits({
        listingId: listing.listing_id,
        blockchainTxHash: txHash,
        creditsPurchased: creditAmount
      });

      toast.success(`Purchased ${creditAmount} credits!`);
      navigate('/buyer/purchases');
    } catch (err) {
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        toast.warning('Transaction cancelled by user');
      } else {
        toast.error(err.response?.data?.message || err.message || 'Purchase failed');
      }
    } finally {
      setPurchasing(false);
    }
  };

  if (loading || !listing) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#639922] border-t-transparent rounded-full" />
      </div>
    );
  }

  const farm = listing.farms || {};
  const carbon = farm.carbon_data?.[0] || {};
  const totalPrice = (parseFloat(credits || listing.credits_available) * parseFloat(listing.price_per_credit));

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <button onClick={() => navigate('/marketplace')} className="text-gray-500 hover:text-white text-sm mb-6 flex items-center gap-1">
          ← Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
              <div className="h-64 bg-gradient-to-br from-[#2d5016]/40 to-[#639922]/20 relative">
                {listing.cover_image_url ? (
                  <img src={listing.cover_image_url} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-8xl opacity-20">🌱</span>
                  </div>
                )}
                {farm.is_verified && (
                  <span className="absolute top-4 right-4 bg-emerald-500/90 text-white text-sm font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
                    ✓ Verified
                  </span>
                )}
              </div>

              <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-2">{listing.title}</h1>
                {listing.subtitle && <p className="text-gray-400 mb-4">{listing.subtitle}</p>}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>📍 {listing.location || farm.location}</span>
                  {listing.vintage_year && <span>· 📅 {listing.vintage_year}</span>}
                  {listing.verification_standard && <span>· 🏅 {listing.verification_standard}</span>}
                </div>

                {listing.practice_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {listing.practice_tags.map(tag => (
                      <span key={tag} className="bg-[#639922]/10 text-[#639922] text-xs px-3 py-1 rounded-full border border-[#639922]/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Farm Details */}
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">🌾 Farm Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Farm Name', farm.name],
                  ['Area', `${farm.area} hectares`],
                  ['Crop Type', farm.crop_type || '—'],
                  ['Location', `${farm.location || ''}${farm.district ? ', ' + farm.district : ''}${farm.state ? ', ' + farm.state : ''}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-gray-500">{label}</p>
                    <p className="text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Carbon Data */}
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">🔬 Carbon Assessment</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-2xl font-bold text-white">{parseFloat(carbon.carbon_stock || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Carbon Stock (tons)</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-2xl font-bold text-white">{parseFloat(carbon.co2_equivalent || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">CO₂ Equivalent (tons)</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-2xl font-bold text-[#639922]">{parseFloat(carbon.credits_generated || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Credits Generated</p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Panel */}
          <div className="lg:col-span-1">
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-4">Purchase Credits</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Available</span>
                  <span className="text-white font-bold">{parseFloat(listing.credits_available).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Price / Credit</span>
                  <span className="text-[#c9a961] font-bold">{parseFloat(listing.price_per_credit).toFixed(6)} ETH</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1.5">Credits to Purchase</label>
                <input
                  type="number"
                  value={credits}
                  onChange={e => setCredits(e.target.value)}
                  placeholder={listing.credits_available}
                  min="1"
                  max={listing.credits_available}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#639922]"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Cost</span>
                  <span className="text-xl font-bold text-[#c9a961]">
                    {totalPrice.toFixed(6)} ETH
                  </span>
                </div>
              </div>

              {!account ? (
                <button
                  onClick={connectWallet}
                  className="w-full bg-[#639922] hover:bg-[#2d5016] text-white font-semibold py-3.5 rounded-xl transition-all"
                >
                  Connect Wallet to Purchase
                </button>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing || listing.status !== 'active'}
                  className="w-full bg-[#639922] hover:bg-[#2d5016] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {purchasing ? (
                    <>
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Processing...
                    </>
                  ) : (
                    '⟠ Purchase with ETH'
                  )}
                </button>
              )}

              {!isSepolia && account && (
                <button onClick={switchToSepolia} className="w-full mt-2 text-amber-400 text-sm hover:underline">
                  ⚠️ Switch to Sepolia Network
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
