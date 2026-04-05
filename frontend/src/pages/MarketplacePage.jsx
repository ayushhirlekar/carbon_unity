import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import marketplaceService from '../services/marketplaceService';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80';

export default function MarketplacePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [practiceFilter, setPracticeFilter] = useState('all');
  const [verifyFilter, setVerifyFilter] = useState(['gold', 'vcs']);
  const { isAdmin } = useAuth();

  useEffect(() => { loadListings(); }, []);

  const loadListings = async () => {
    try {
      const res = await marketplaceService.getListings();
      setListings(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const toggleVerify = (type) => {
    setVerifyFilter(prev =>
      prev.includes(type) ? prev.filter(v => v !== type) : [...prev, type]
    );
  };

  const filteredListings = listings.filter(l => {
    const tags = (l.practice_tags || []).map(t => t.toLowerCase());
    const std = (l.verification_standard || '').toLowerCase();
    const practiceMatch = practiceFilter === 'all' || tags.includes(practiceFilter);
    const isGold = std.includes('gold');
    const isVcs = std.includes('vcs');
    const verifyMatch = verifyFilter.length === 0 ||
      (verifyFilter.includes('gold') && isGold) ||
      (verifyFilter.includes('vcs') && isVcs);
    return practiceMatch && verifyMatch;
  });

  // Stats
  const totalCO2 = listings.reduce((s, l) => s + parseFloat(l.carbon_data?.carbon_data?.[0]?.co2_equivalent || 0), 0);
  const totalCredits = listings.reduce((s, l) => s + parseFloat(l.credits_available || 0), 0);
  const avgPrice = listings.length
    ? (listings.reduce((s, l) => s + parseFloat(l.price_per_credit || 0), 0) / listings.length)
    : 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #639922', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#4A6741', fontFamily: 'system-ui, sans-serif' }}>Loading marketplace...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: '#EEF2EE', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2B1C', margin: 0 }}>
              Regional Carbon Credit Projects — India
            </h1>
            <p style={{ fontSize: 13, color: '#4A6741', marginTop: 3 }}>
              Verified farm-based carbon sequestration across Maharashtra & India
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Practice filters */}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {['all', 'agroforestry', 'regenerative', 'organic'].map(f => (
                <button key={f} onClick={() => setPracticeFilter(f)} style={{
                  fontSize: 12, padding: '6px 15px', borderRadius: 20,
                  border: `1px solid ${practiceFilter === f ? '#2D5A27' : '#B8CCAE'}`,
                  background: practiceFilter === f ? '#2D5A27' : 'transparent',
                  color: practiceFilter === f ? '#fff' : '#4A6741',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, transition: 'all .18s'
                }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {/* Add Project — admin only */}
            {isAdmin && (
              <Link to="/admin/create-project" style={{
                padding: '9px 20px', background: '#2D5A27', color: '#fff',
                borderRadius: 10, fontSize: 13, fontWeight: 600,
                textDecoration: 'none', transition: 'background .18s'
              }}>
                + Add Project
              </Link>
            )}
          </div>
        </div>

        {/* Verification filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#4A6741', fontWeight: 500, marginRight: 4 }}>Verification:</span>
          {[
            { key: 'gold', label: 'Gold Standard', dot: '#c9a961', activeBg: '#fdf3dc', activeBorder: '#c9a961', activeColor: '#7a5c10' },
            { key: 'vcs', label: 'VCS Verified', dot: '#378ADD', activeBg: '#e6f1fb', activeBorder: '#378ADD', activeColor: '#185FA5' },
          ].map(v => (
            <button key={v.key} onClick={() => toggleVerify(v.key)} style={{
              fontSize: 12, padding: '5px 14px', borderRadius: 6,
              border: `1px solid ${verifyFilter.includes(v.key) ? v.activeBorder : '#B8CCAE'}`,
              background: verifyFilter.includes(v.key) ? v.activeBg : '#fff',
              color: verifyFilter.includes(v.key) ? v.activeColor : '#4A6741',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .18s'
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.dot, display: 'inline-block' }} />
              {v.label}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 22 }}>
          {[
            { label: 'Active Projects', value: listings.length, suffix: '' },
            { label: 'Total CO₂ Offset', value: totalCO2 >= 1000 ? `${(totalCO2/1000).toFixed(1)}k` : Math.round(totalCO2), suffix: 'tons/yr' },
            { label: 'Total Credits', value: Math.round(totalCredits).toLocaleString(), suffix: 'available' },
            { label: 'Avg. Price / Credit', value: avgPrice.toFixed(6), suffix: 'ETH' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #D4E6CE' }}>
              <div style={{ fontSize: 11, color: '#4A6741', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1C2B1C' }}>
                {s.value} <span style={{ fontSize: 12, color: '#2D5A27', fontWeight: 400 }}>{s.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', color: '#c0392b', padding: '12px 20px', borderRadius: 10, marginBottom: 20, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Cards grid */}
        {filteredListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4A6741' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
            <p style={{ fontSize: 16, marginBottom: 8, color: '#1C2B1C' }}>No projects match your filters</p>
            <p style={{ fontSize: 13 }}>Try adjusting the filters above</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filteredListings.map(listing => (
              <ListingCard key={listing.listing_id} listing={listing} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .cu-card { transition: transform .22s ease, box-shadow .22s ease; }
        .cu-card:hover { transform: translateY(-5px) scale(1.013); box-shadow: 0 14px 36px rgba(30,60,25,.13); }
        .cu-card:hover .cu-img { transform: scale(1.07); }
        .cu-btn-primary:hover { background: #1C4018 !important; }
        .cu-btn-secondary:hover { background: #D6EDCC !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function ListingCard({ listing }) {
  const farm = listing.farms || {};
  const carbonData = listing.carbon_data?.carbon_data?.[0] || {};
  const std = (listing.verification_standard || '').toLowerCase();
  const isGold = std.includes('gold');
  const tags = listing.practice_tags || [];
  const co2 = parseFloat(carbonData.co2_equivalent || 0);
  const creditsAvailable = parseFloat(listing.credits_available || 0);
  const creditsGenerated = parseFloat(carbonData.credits_generated || creditsAvailable);
  const soldPct = creditsGenerated > 0
    ? Math.round(((creditsGenerated - creditsAvailable) / creditsGenerated) * 100)
    : 0;

  return (
    <Link to={`/marketplace/${listing.listing_id}`} style={{ textDecoration: 'none' }}>
      <div className="cu-card" style={{
        background: '#FAFCF8', borderRadius: 16, overflow: 'hidden',
        border: '1px solid #C8DDBE', cursor: 'pointer',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Image */}
        <div style={{ position: 'relative', height: 168, overflow: 'hidden', flexShrink: 0 }}>
          <img
            className="cu-img"
            src={listing.cover_image_url || FALLBACK_IMAGE}
            alt={listing.title}
            loading="lazy"
            onError={e => { e.target.src = FALLBACK_IMAGE }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s ease', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,30,10,0) 35%, rgba(10,30,10,.45) 100%)', pointerEvents: 'none' }} />

          {/* Price badge */}
          <div style={{ position: 'absolute', top: 12, right: 12, background: '#FAFCF8', borderRadius: 10, padding: '5px 12px', fontSize: 14, fontWeight: 600, color: '#1C4A18', border: '1px solid #B8DDAC' }}>
            {parseFloat(listing.price_per_credit).toFixed(6)} ETH
          </div>

          {/* Vintage badge */}
          {listing.vintage_year && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(250,252,248,.92)', borderRadius: 8, padding: '4px 9px', fontSize: 11, fontWeight: 500, color: '#3B5E38', border: '1px solid #C0D8B4' }}>
              {listing.vintage_year}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 16px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C2B1C', lineHeight: 1.4, marginBottom: 4 }}>
            {listing.title}
          </div>
          {listing.subtitle && (
            <div style={{ fontSize: 12, color: '#4A6741', marginBottom: 12, lineHeight: 1.45 }}>
              {listing.subtitle}
            </div>
          )}

          {/* Meta row */}
          <div style={{ display: 'flex', marginBottom: 12, borderTop: '1px solid #D8E8D0', borderBottom: '1px solid #D8E8D0', padding: '10px 0' }}>
            {[
              { val: farm.district || listing.location || '—', label: 'District' },
              { val: farm.number_of_farmers || '—', label: 'Farmers' },
              { val: farm.area ? `${farm.area} ha` : '—', label: 'Area' },
            ].map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', borderLeft: i > 0 ? '1px solid #D8E8D0' : 'none' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1C2B1C', display: 'block' }}>{m.val}</span>
                <span style={{ fontSize: 10, color: '#4A6741', display: 'block', marginTop: 1, textTransform: 'uppercase', letterSpacing: '.4px' }}>{m.label}</span>
              </div>
            ))}
          </div>

          {/* CO2 + Verification */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ background: '#D6EDCC', color: '#1C4A18', fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20 }}>
              {co2.toLocaleString()} tons CO₂/yr
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: isGold ? '#8a6310' : '#185FA5' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isGold ? '#c9a961' : '#378ADD', display: 'inline-block' }} />
              {isGold ? 'Gold Standard' : 'VCS Verified'}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4A6741', marginBottom: 5 }}>
              <span>Credits sold</span>
              <span>{soldPct}%</span>
            </div>
            <div style={{ height: 5, background: '#D8E8D0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 10, background: '#3A8A2A', width: `${soldPct}%`, transition: 'width .6s ease' }} />
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {tags.slice(0, 3).map(tag => (
              <span key={tag} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: '#E2EED9', color: '#2D5A27', fontWeight: 500 }}>
                {tag}
              </span>
            ))}
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: isGold ? '#fdf3dc' : '#e6f1fb', color: isGold ? '#7a5c10' : '#185FA5', fontWeight: 500 }}>
              {isGold ? 'Gold Standard' : 'VCS Verified'}
            </span>
            {farm.is_verified && (
              <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: '#E2EED9', color: '#2D5A27', fontWeight: 500 }}>
                ✓ Verified
              </span>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ padding: '12px 16px 16px', display: 'flex', gap: 8, marginTop: 'auto', borderTop: '1px solid #D8E8D0' }}>
          <button className="cu-btn-primary" style={{ flex: 1, padding: '9px 0', background: '#2D5A27', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background .18s', fontFamily: 'inherit' }}>
            View Details
          </button>
          <button className="cu-btn-secondary" style={{ padding: '9px 14px', background: 'transparent', color: '#2D5A27', border: '1px solid #3A8A2A', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .18s', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Buy Credits
          </button>
        </div>
      </div>
    </Link>
  );
}