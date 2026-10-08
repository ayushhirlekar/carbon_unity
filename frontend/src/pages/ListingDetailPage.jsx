import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import marketplaceService from '../services/marketplaceService';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useToast } from '../components/common/Toast';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';

const FALLBACK = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80';

// Icons
const IconMapPin = () => (
  <svg className="w-4 h-4 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const IconCalendar = () => (
  <svg className="w-4 h-4 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
  </svg>
);

const IconAward = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.004 0A1.5 1.5 0 0115 15.75v-1.5a1.5 1.5 0 00-1.5-1.5h-3A1.5 1.5 0 009 14.25v1.5a1.5 1.5 0 01.496 1.125" />
  </svg>
);

const IconArrowLeft = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

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
    } catch {
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
      toast.info('Confirm transaction in MetaMask...');
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: listing.created_by,
        value: ethers.parseEther(totalEth),
      });
      const receipt = await tx.wait();
      const txHash = receipt.hash;
      toast.info('Transaction confirmed! Recording purchase...');
      await marketplaceService.purchaseCredits({
        listingId: listing.listing_id,
        blockchainTxHash: txHash,
        creditsPurchased: creditAmount,
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in font-sans">
        <div className="h-6 w-36 mb-6"><Skeleton className="h-6 w-full" /></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-72 rounded-3xl"><Skeleton className="h-full w-full rounded-3xl" /></div>
            <div className="h-48 rounded-2xl"><Skeleton className="h-full w-full rounded-2xl" /></div>
          </div>
          <div className="h-96 rounded-3xl"><Skeleton className="h-full w-full rounded-3xl" /></div>
        </div>
      </div>
    );
  }

  const farm = listing.farms || {};
  const carbon = farm.carbon_data?.[0] || {};
  const std = (listing.verification_standard || '').toLowerCase();
  const isGold = std.includes('gold');
  const creditUnits = parseFloat(credits || listing.credits_available);
  const totalPrice = creditUnits * parseFloat(listing.price_per_credit);

  return (
    <div className="min-h-screen bg-surface-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto animate-fade-in">

        {/* Back Link */}
        <button
          onClick={() => navigate('/marketplace')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-surface-900 mb-6 transition-colors group"
        >
          <span className="p-1.5 rounded-lg bg-white border border-surface-200 group-hover:border-surface-300 shadow-subtle">
            <IconArrowLeft />
          </span>
          <span>Back to Marketplace</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Hero Cover Card */}
            <div className="bg-white rounded-3xl border border-surface-200 shadow-card overflow-hidden">
              <div className="relative h-72 sm:h-80 bg-surface-900">
                <img
                  src={listing.cover_image_url || FALLBACK}
                  alt={listing.title}
                  onError={(e) => { e.target.src = FALLBACK; }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-950/80 via-transparent to-transparent pointer-events-none" />

                {/* Badges on Hero */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {farm.is_verified && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-xs font-bold shadow-subtle">
                      <IconCheck /> Ground Audited
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md text-white ${isGold ? 'bg-amber-600/90' : 'bg-sky-600/90'}`}>
                    {isGold ? 'Gold Standard' : 'VCS Verified'}
                  </span>
                </div>

                <div className="absolute bottom-4 left-6 right-6 text-white">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-300 font-semibold">
                    Project #{listing.listing_id.slice(0, 8)}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
                    {listing.title}
                  </h1>
                </div>
              </div>

              {/* Subtitle & Meta */}
              <div className="p-6">
                {listing.subtitle && (
                  <p className="text-sm text-surface-600 leading-relaxed mb-4">
                    {listing.subtitle}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-surface-500 pb-4 border-b border-surface-100">
                  <span className="inline-flex items-center gap-1.5">
                    <IconMapPin />
                    <span>{listing.location || farm.location || 'Maharashtra, India'}</span>
                  </span>
                  {listing.vintage_year && (
                    <span className="inline-flex items-center gap-1.5">
                      <IconCalendar />
                      <span>Vintage {listing.vintage_year}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-brand-700">
                    <IconAward />
                    <span>Sepolia Smart Contract Escrow</span>
                  </span>
                </div>

                {/* Practice Badges */}
                {listing.practice_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {listing.practice_tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg bg-surface-100 text-surface-700 text-xs font-semibold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Farm & Land Info Card */}
            <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card">
              <h2 className="text-base font-bold text-surface-900 tracking-tight pb-3 mb-4 border-b border-surface-100">
                Agricultural Origin & Methodology
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Farm / Group Name', val: farm.name || 'Maharashtra Smallholder Cluster' },
                  { label: 'Registered Area', val: `${farm.area || '—'} Hectares` },
                  { label: 'Dominant Crop', val: farm.crop_type || 'Mixed / Agroforestry' },
                  { label: 'District', val: farm.district || 'Pune / Nashik' },
                  { label: 'State', val: farm.state || 'Maharashtra' },
                  { label: 'Enrolled Farmers', val: `${farm.number_of_farmers || 1} Smallholders` },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-surface-50 border border-surface-100">
                    <span className="block text-[10px] uppercase font-bold text-surface-400 tracking-wider">
                      {item.label}
                    </span>
                    <span className="text-xs font-bold text-surface-800 mt-0.5 block truncate">
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Carbon Stock Metrics */}
            <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card">
              <h2 className="text-base font-bold text-surface-900 tracking-tight pb-3 mb-4 border-b border-surface-100">
                Ground-Truth Carbon Measurement
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200/60 text-center">
                  <span className="text-2xl font-extrabold text-brand-900 tracking-tight block">
                    {parseFloat(carbon.carbon_stock || 0).toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-brand-700 mt-1 block">
                    Total Carbon Stock (t)
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-center">
                  <span className="text-2xl font-extrabold text-emerald-900 tracking-tight block">
                    {parseFloat(carbon.co2_equivalent || 0).toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 mt-1 block">
                    CO₂ Equivalent (t)
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/60 text-center">
                  <span className="text-2xl font-extrabold text-sky-900 tracking-tight block">
                    {parseFloat(carbon.credits_generated || 0).toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-sky-700 mt-1 block">
                    Audited Credits Minted
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Sticky Checkout Memo */}
          <div className="sticky top-24 bg-white rounded-3xl border border-surface-200 p-6 shadow-card space-y-5">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-brand-700 font-bold block">
                Direct Purchase
              </span>
              <h3 className="text-xl font-bold text-surface-900 tracking-tight mt-0.5">
                Acquire Verified Credits
              </h3>
            </div>

            <div className="space-y-2 pt-2 border-t border-surface-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-surface-500 font-medium">Credits Available:</span>
                <span className="font-bold text-surface-900">
                  {parseFloat(listing.credits_available).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-surface-500 font-medium">Unit Price:</span>
                <span className="font-mono font-bold text-brand-800">
                  {parseFloat(listing.price_per_credit).toFixed(6)} ETH
                </span>
              </div>
            </div>

            {/* Input Slider / Box */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                Credits to Purchase
              </label>
              <input
                type="number"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                placeholder={listing.credits_available}
                min="1"
                max={listing.credits_available}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Total Eth Box */}
            <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-surface-400 block tracking-wider">
                  Total Settlement
                </span>
                <span className="text-xs text-surface-500">Includes contract gas estimation</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-mono font-bold text-brand-900">
                  {totalPrice.toFixed(6)} ETH
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {!account ? (
              <Button
                variant="primary"
                onClick={connectWallet}
                className="w-full shadow-glow-brand"
              >
                Connect Wallet to Purchase
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handlePurchase}
                disabled={purchasing || listing.status !== 'active'}
                loading={purchasing}
                className="w-full shadow-glow-brand"
              >
                {purchasing ? 'Executing on Sepolia...' : 'Purchase & Retire Credits'}
              </Button>
            )}

            {!isSepolia && account && (
              <button
                onClick={switchToSepolia}
                className="w-full text-center text-xs font-semibold text-amber-700 hover:text-amber-800 p-2 rounded-xl bg-amber-50 border border-amber-200 transition-colors"
              >
                Switch Network to Sepolia Testnet
              </button>
            )}

            <div className="pt-3 border-t border-surface-100 text-center">
              <p className="text-[11px] text-surface-400">
                Direct non-custodial transfer to project host: <br />
                <span className="font-mono text-surface-500">
                  {listing.created_by?.slice(0, 10)}...{listing.created_by?.slice(-8)}
                </span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}