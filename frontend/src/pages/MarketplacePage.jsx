import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import marketplaceService from '../services/marketplaceService';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';

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
    setVerifyFilter((prev) =>
      prev.includes(type) ? prev.filter((v) => v !== type) : [...prev, type]
    );
  };

  const filteredListings = listings.filter((l) => {
    const tags = (l.practice_tags || []).map((t) => t.toLowerCase());
    const std = (l.verification_standard || '').toLowerCase();
    const practiceMatch = practiceFilter === 'all' || tags.includes(practiceFilter);
    const isGold = std.includes('gold');
    const isVcs = std.includes('vcs');
    const verifyMatch =
      verifyFilter.length === 0 ||
      (verifyFilter.includes('gold') && isGold) ||
      (verifyFilter.includes('vcs') && isVcs);
    return practiceMatch && verifyMatch;
  });

  // Aggregate stats
  const totalCO2 = listings.reduce(
    (s, l) => s + parseFloat(l.carbon_data?.carbon_data?.[0]?.co2_equivalent || 0),
    0
  );
  const totalCredits = listings.reduce(
    (s, l) => s + parseFloat(l.credits_available || 0),
    0
  );
  const avgPrice = listings.length
    ? listings.reduce((s, l) => s + parseFloat(l.price_per_credit || 0), 0) / listings.length
    : 0;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="h-10 w-72 mb-2"><Skeleton className="h-10 w-full" /></div>
        <div className="h-5 w-96 mb-8"><Skeleton className="h-5 w-full" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24"><Skeleton className="h-full w-full rounded-2xl" /></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96"><Skeleton className="h-full w-full rounded-3xl" /></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto animate-fade-in">

        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-surface-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Carbon Registry
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
              Verified Carbon Credit Projects
            </h1>
            <p className="text-sm text-surface-600 mt-1">
              Satellite-verified, smallholder soil carbon sequestration ready for on-chain retirement
            </p>
          </div>

          {isAdmin && (
            <Link to="/admin/create-project">
              <Button variant="primary" size="md" className="shadow-glow-brand">
                <span>+ Launch New Project</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Practice Tags Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-surface-500 uppercase tracking-wider mr-1">Practice:</span>
            {['all', 'agroforestry', 'regenerative', 'organic'].map((f) => (
              <button
                key={f}
                onClick={() => setPracticeFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  practiceFilter === f
                    ? 'bg-brand-800 text-white shadow-subtle'
                    : 'bg-white text-surface-600 border border-surface-200 hover:border-surface-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Verification Standards Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-surface-500 uppercase tracking-wider mr-1">Standards:</span>
            {[
              { key: 'gold', label: 'Gold Standard', color: 'bg-amber-500' },
              { key: 'vcs', label: 'VCS Verified', color: 'bg-sky-500' },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => toggleVerify(v.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  verifyFilter.includes(v.key)
                    ? 'bg-white text-surface-900 border-surface-300 shadow-subtle'
                    : 'bg-surface-100 text-surface-400 border-transparent opacity-60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${v.color}`} />
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Projects', value: listings.length, sub: 'Verified' },
            {
              label: 'Total CO₂ Offset',
              value: totalCO2 >= 1000 ? `${(totalCO2 / 1000).toFixed(1)}k` : Math.round(totalCO2),
              sub: 'Tons / yr',
            },
            {
              label: 'Available Credits',
              value: Math.round(totalCredits).toLocaleString(),
              sub: 'Ready to mint',
            },
            {
              label: 'Average Price',
              value: `${avgPrice.toFixed(6)}`,
              sub: 'ETH / credit',
            },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-2xl bg-white border border-surface-200/90 shadow-card">
              <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">{s.label}</span>
              <div className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight mt-1">
                {s.value} <span className="text-xs text-brand-700 font-medium">{s.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {/* Project Cards Grid */}
        {filteredListings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-surface-200 p-8 shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-surface-100 text-surface-500 flex items-center justify-center mx-auto mb-3 shadow-subtle">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-surface-900">No active projects match your filters</h3>
            <p className="text-xs text-surface-500 mt-1">Try resetting the practice tags or standards.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.listing_id} listing={listing} />
            ))}
          </div>
        )}

      </div>
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
  const soldPct =
    creditsGenerated > 0
      ? Math.round(((creditsGenerated - creditsAvailable) / creditsGenerated) * 100)
      : 0;

  return (
    <div className="bg-white rounded-3xl border border-surface-200 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
      {/* Cover Image & Badges */}
      <div className="relative h-48 overflow-hidden bg-surface-900">
        <img
          src={listing.cover_image_url || FALLBACK_IMAGE}
          alt={listing.title}
          loading="lazy"
          onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950/80 via-transparent to-transparent pointer-events-none" />

        {/* Price Chip */}
        <div className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-white/80 text-surface-900 text-xs font-mono font-bold shadow-subtle">
          {parseFloat(listing.price_per_credit).toFixed(6)} ETH
        </div>

        {/* Vintage & Standard Chips */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {listing.vintage_year && (
            <span className="px-2.5 py-0.5 rounded-lg bg-surface-900/80 backdrop-blur-md text-white text-[11px] font-mono font-medium">
              {listing.vintage_year}
            </span>
          )}
          <span className={`px-2.5 py-0.5 rounded-lg backdrop-blur-md text-white text-[11px] font-bold ${isGold ? 'bg-amber-600/90' : 'bg-sky-600/90'}`}>
            {isGold ? 'Gold Standard' : 'VCS'}
          </span>
        </div>

        {/* Bottom image overlay stats */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
          <span className="font-semibold">{farm.district || listing.location || 'Maharashtra, IN'}</span>
          <span className="text-emerald-300 font-mono font-bold">{co2.toLocaleString()} tCO₂e/yr</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-base font-bold text-surface-900 tracking-tight group-hover:text-brand-700 transition-colors line-clamp-1 mb-1">
          {listing.title}
        </h3>
        {listing.subtitle && (
          <p className="text-xs text-surface-500 line-clamp-2 leading-relaxed mb-4">
            {listing.subtitle}
          </p>
        )}

        {/* Specs Table */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-surface-50 border border-surface-100 text-center mb-4">
          <div>
            <span className="block text-[10px] text-surface-400 uppercase font-semibold">Farmers</span>
            <span className="text-xs font-bold text-surface-900">{farm.number_of_farmers || '1'}</span>
          </div>
          <div>
            <span className="block text-[10px] text-surface-400 uppercase font-semibold">Area</span>
            <span className="text-xs font-bold text-surface-900">{farm.area ? `${farm.area} ha` : '—'}</span>
          </div>
          <div>
            <span className="block text-[10px] text-surface-400 uppercase font-semibold">Credits</span>
            <span className="text-xs font-bold text-brand-800">{creditsAvailable.toLocaleString()}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] font-semibold text-surface-500 mb-1">
            <span>Availability Status</span>
            <span>{soldPct}% Retired</span>
          </div>
          <div className="h-1.5 w-full bg-surface-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${soldPct}%` }}
            />
          </div>
        </div>

        {/* Practice Tags */}
        <div className="flex flex-wrap gap-1 mb-5">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-md bg-surface-100 text-surface-600 text-[10px] font-semibold">
              #{tag}
            </span>
          ))}
          {farm.is_verified && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              ✓ Ground-Audited
            </span>
          )}
        </div>

        {/* Card Actions */}
        <div className="mt-auto pt-3 border-t border-surface-100 flex items-center gap-2">
          <Link to={`/marketplace/${listing.listing_id}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              Details
            </Button>
          </Link>
          <Link to={`/marketplace/${listing.listing_id}`} className="flex-1">
            <Button variant="primary" size="sm" className="w-full shadow-subtle">
              Purchase
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}