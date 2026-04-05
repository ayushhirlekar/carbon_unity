import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import marketplaceService from '../services/marketplaceService';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useToast } from '../components/common/Toast';

const FALLBACK = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80';

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icon = ({ children, size = 14, color = 'currentColor', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const IconMapPin = ({ size, color }) => <Icon size={size} color={color}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></Icon>;
const IconCalendar = ({ size, color }) => <Icon size={size} color={color}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>;
const IconAward = ({ size, color }) => <Icon size={size} color={color}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></Icon>;
const IconCheckCircle = ({ size, color }) => <Icon size={size} color={color}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Icon>;
const IconWheat = ({ size, color }) => <Icon size={size} color={color}><path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94z"/><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4z"/><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0z"/></Icon>;
const IconFlask = ({ size, color }) => <Icon size={size} color={color}><path d="M9 3h6l1 9H8L9 3z"/><path d="M6.5 21a5.5 5.5 0 0 0 11 0l-1.5-9h-8L6.5 21z"/><line x1="9" y1="3" x2="9" y2="12"/><line x1="15" y1="3" x2="15" y2="12"/></Icon>;
const IconWallet = ({ size, color }) => <Icon size={size} color={color}><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></Icon>;
const IconEth = ({ size, color }) => <Icon size={size} color={color}><polygon points="12 2 2 12 12 16 22 12 12 2"/><polyline points="2 12 12 22 22 12"/></Icon>;
const IconArrowLeft = ({ size, color }) => <Icon size={size} color={color}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></Icon>;
const IconAlertTriangle = ({ size, color }) => <Icon size={size} color={color}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>;
const IconLoader = ({ size, color }) => <Icon size={size} color={color}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></Icon>;
const IconUsers = ({ size, color }) => <Icon size={size} color={color}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>;
const IconLayers = ({ size, color }) => <Icon size={size} color={color}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Icon>;
const IconMap = ({ size, color }) => <Icon size={size} color={color}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></Icon>;
const IconTag = ({ size, color }) => <Icon size={size} color={color}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></Icon>;
const IconTrendingUp = ({ size, color }) => <Icon size={size} color={color}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Icon>;

const S = {
  page: { background: '#EEF2EE', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '28px 24px' },
  inner: { maxWidth: 1100, margin: '0 auto' },
  back: { fontSize: 13, color: '#4A6741', cursor: 'pointer', marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', fontFamily: 'inherit', padding: '6px 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' },
  card: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', overflow: 'hidden', marginBottom: 16 },
  cardBody: { padding: '20px 24px' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#1C2B1C', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #D8E8D0', display: 'flex', alignItems: 'center', gap: 8 },
  imgWrap: { position: 'relative', height: 280, overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  imgOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(10,30,10,0) 40%,rgba(10,30,10,.5) 100%)', pointerEvents: 'none' },
  verifiedBadge: { position: 'absolute', top: 14, right: 14, background: '#D6EDCC', color: '#1C4A18', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, border: '1px solid #B8DDAC', display: 'flex', alignItems: 'center', gap: 5 },
  h1: { fontSize: 22, fontWeight: 700, color: '#1C2B1C', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#4A6741', marginBottom: 14 },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: '#4A6741', marginBottom: 14 },
  metaItem: { display: 'flex', alignItems: 'center', gap: 5 },
  tagWrap: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#E2EED9', color: '#2D5A27', fontWeight: 500, border: '1px solid #C8DDBE', display: 'flex', alignItems: 'center', gap: 4 },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' },
  infoItem: { padding: '8px 0', borderBottom: '1px solid #EEF2EE' },
  infoLabel: { fontSize: 11, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.4px', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 },
  infoVal: { fontSize: 13, fontWeight: 600, color: '#1C2B1C' },
  carbonGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 },
  carbonItem: { background: '#EAF3DE', borderRadius: 10, padding: '14px 12px', textAlign: 'center', border: '1px solid #B8DDAC' },
  carbonVal: { fontSize: 20, fontWeight: 700, color: '#1C4A18', display: 'block' },
  carbonLabel: { fontSize: 10, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
  stickyCard: { background: '#FAFCF8', borderRadius: 16, border: '1px solid #C8DDBE', padding: 20, position: 'sticky', top: 24 },
  purchaseTitle: { fontSize: 16, fontWeight: 700, color: '#1C2B1C', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #D8E8D0' },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 },
  priceLabel: { color: '#4A6741', display: 'flex', alignItems: 'center', gap: 5 },
  priceVal: { fontWeight: 600, color: '#1C2B1C' },
  priceValGold: { fontWeight: 700, color: '#8a6310' },
  inputLabel: { fontSize: 11, fontWeight: 600, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.4px', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, marginTop: 14 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #C8DDBE', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#1C2B1C', background: '#fff', outline: 'none', boxSizing: 'border-box' },
  totalBox: { background: '#EAF3DE', borderRadius: 10, border: '1px solid #B8DDAC', padding: '12px 14px', marginTop: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 12, color: '#4A6741', display: 'flex', alignItems: 'center', gap: 5 },
  totalVal: { fontSize: 18, fontWeight: 700, color: '#1C4A18' },
  buyBtn: (disabled) => ({ width: '100%', padding: '12px 0', background: disabled ? '#9ab89a' : '#2D5A27', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background .18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }),
  sepoliaWarn: { width: '100%', marginTop: 8, padding: '8px 0', background: 'transparent', border: 'none', color: '#8a6310', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 },
  spinner: { width: 36, height: 36, border: '3px solid #D8E8D0', borderTopColor: '#2D5A27', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '60px auto' },
  btnSpinner: { width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' },
};

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
    if (!isAuthenticated || !isBuyer) { toast.error('Please sign in as a buyer to purchase'); navigate('/auth'); return; }
    if (!isSepolia) { toast.warning('Please switch to Sepolia network'); await switchToSepolia(); return; }
    const creditAmount = parseFloat(credits) || parseFloat(listing.credits_available);
    if (creditAmount <= 0 || creditAmount > parseFloat(listing.credits_available)) { toast.error(`Invalid amount. Max: ${listing.credits_available}`); return; }
    const totalEth = (creditAmount * parseFloat(listing.price_per_credit)).toFixed(18);
    setPurchasing(true);
    try {
      toast.info('Confirm transaction in MetaMask...');
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({ to: listing.created_by, value: ethers.parseEther(totalEth) });
      const receipt = await tx.wait();
      const txHash = receipt.hash;
      toast.info('Transaction confirmed! Recording purchase...');
      await marketplaceService.purchaseCredits({ listingId: listing.listing_id, blockchainTxHash: txHash, creditsPurchased: creditAmount });
      toast.success(`Purchased ${creditAmount} credits!`);
      navigate('/buyer/purchases');
    } catch (err) {
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) toast.warning('Transaction cancelled by user');
      else toast.error(err.response?.data?.message || err.message || 'Purchase failed');
    } finally { setPurchasing(false); }
  };

  if (loading || !listing) return (
    <div style={S.page}><div style={S.spinner} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
  );

  const farm = listing.farms || {};
  const carbon = farm.carbon_data?.[0] || {};
  const std = (listing.verification_standard || '').toLowerCase();
  const isGold = std.includes('gold');
  const totalPrice = (parseFloat(credits || listing.credits_available) * parseFloat(listing.price_per_credit));

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={S.inner}>
        <button style={S.back} onClick={() => navigate('/marketplace')}>
          <IconArrowLeft size={14} color="#4A6741" /> Back to Marketplace
        </button>

        <div style={S.grid}>
          <div>
            {/* Image + Title card */}
            <div style={S.card}>
              <div style={S.imgWrap}>
                <img src={listing.cover_image_url || FALLBACK} alt={listing.title} style={S.img} onError={e => { e.target.src = FALLBACK }} />
                <div style={S.imgOverlay} />
                {farm.is_verified && (
                  <span style={S.verifiedBadge}>
                    <IconCheckCircle size={12} color="#1C4A18" /> Verified
                  </span>
                )}
              </div>
              <div style={S.cardBody}>
                <h1 style={S.h1}>{listing.title}</h1>
                {listing.subtitle && <p style={S.subtitle}>{listing.subtitle}</p>}
                <div style={S.metaRow}>
                  <span style={S.metaItem}>
                    <IconMapPin size={13} color="#4A6741" />
                    {listing.location || farm.location}
                  </span>
                  {listing.vintage_year && (
                    <span style={S.metaItem}>
                      <IconCalendar size={13} color="#4A6741" />
                      {listing.vintage_year}
                    </span>
                  )}
                  <span style={{ ...S.metaItem, color: isGold ? '#8a6310' : '#185FA5', fontWeight: 600 }}>
                    <IconAward size={13} color={isGold ? '#8a6310' : '#185FA5'} />
                    {isGold ? 'Gold Standard' : 'VCS Verified'}
                  </span>
                </div>
                {listing.practice_tags?.length > 0 && (
                  <div style={S.tagWrap}>
                    {listing.practice_tags.map(tag => (
                      <span key={tag} style={S.tag}>
                        <IconTag size={9} color="#2D5A27" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Farm Info */}
            <div style={S.card}>
              <div style={S.cardBody}>
                <div style={S.cardTitle}>
                  <IconWheat size={15} color="#2D5A27" /> Farm Information
                </div>
                <div style={S.infoGrid}>
                  {[
                    ['Farm Name', farm.name, <IconWheat size={10} color="#4A6741" />],
                    ['Area', `${farm.area} hectares`, <IconMap size={10} color="#4A6741" />],
                    ['Crop Type', farm.crop_type || '—', <IconLayers size={10} color="#4A6741" />],
                    ['District', farm.district || '—', <IconMapPin size={10} color="#4A6741" />],
                    ['State', farm.state || '—', <IconMapPin size={10} color="#4A6741" />],
                    ['Farmers', farm.number_of_farmers || 1, <IconUsers size={10} color="#4A6741" />],
                  ].map(([l, v, icon]) => (
                    <div key={l} style={S.infoItem}>
                      <span style={S.infoLabel}>{icon}{l}</span>
                      <span style={S.infoVal}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Carbon Data */}
            <div style={S.card}>
              <div style={S.cardBody}>
                <div style={S.cardTitle}>
                  <IconFlask size={15} color="#2D5A27" /> Carbon Assessment
                </div>
                <div style={S.carbonGrid}>
                  <div style={S.carbonItem}>
                    <span style={S.carbonVal}>{parseFloat(carbon.carbon_stock || 0).toLocaleString()}</span>
                    <span style={S.carbonLabel}><IconLayers size={9} color="#4A6741" /> Carbon Stock (t)</span>
                  </div>
                  <div style={S.carbonItem}>
                    <span style={S.carbonVal}>{parseFloat(carbon.co2_equivalent || 0).toLocaleString()}</span>
                    <span style={S.carbonLabel}><IconTrendingUp size={9} color="#4A6741" /> CO₂ Equivalent (t)</span>
                  </div>
                  <div style={S.carbonItem}>
                    <span style={{ ...S.carbonVal, color: '#1C4A18' }}>{parseFloat(carbon.credits_generated || 0).toLocaleString()}</span>
                    <span style={S.carbonLabel}><IconCheckCircle size={9} color="#4A6741" /> Credits Generated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Panel */}
          <div style={S.stickyCard}>
            <div style={S.purchaseTitle}>Purchase Credits</div>

            <div style={S.priceRow}>
              <span style={S.priceLabel}><IconLayers size={12} color="#4A6741" /> Available</span>
              <span style={S.priceVal}>{parseFloat(listing.credits_available).toLocaleString()}</span>
            </div>
            <div style={S.priceRow}>
              <span style={S.priceLabel}><IconEth size={12} color="#8a6310" /> Price / Credit</span>
              <span style={S.priceValGold}>{parseFloat(listing.price_per_credit).toFixed(6)} ETH</span>
            </div>

            <label style={S.inputLabel}>
              <IconTag size={11} color="#4A6741" /> Credits to Purchase
            </label>
            <input
              type="number"
              value={credits}
              onChange={e => setCredits(e.target.value)}
              placeholder={listing.credits_available}
              min="1"
              max={listing.credits_available}
              style={S.input}
            />

            <div style={S.totalBox}>
              <span style={S.totalLabel}><IconEth size={12} color="#4A6741" /> Total Cost</span>
              <span style={S.totalVal}>{totalPrice.toFixed(6)} ETH</span>
            </div>

            {!account ? (
              <button onClick={connectWallet} style={S.buyBtn(false)}>
                <IconWallet size={16} color="#fff" /> Connect Wallet to Purchase
              </button>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={purchasing || listing.status !== 'active'}
                style={S.buyBtn(purchasing || listing.status !== 'active')}
              >
                {purchasing
                  ? <><div style={S.btnSpinner} /> Processing...</>
                  : <><IconEth size={16} color="#fff" /> Purchase with ETH</>
                }
              </button>
            )}

            {!isSepolia && account && (
              <button onClick={switchToSepolia} style={S.sepoliaWarn}>
                <IconAlertTriangle size={13} color="#8a6310" /> Switch to Sepolia Network
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}