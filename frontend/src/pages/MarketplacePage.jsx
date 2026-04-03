import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import marketplaceService from '../services/marketplaceService';

export default function MarketplacePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadListings();
  }, []);

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

  const filteredListings = listings.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'verified') return l.farms?.is_verified;
    return (l.practice_tags || []).includes(filter);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-[#639922] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Carbon Credit <span className="text-[#639922]">Marketplace</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Browse verified carbon offset projects. Purchase credits to offset your carbon footprint using cryptocurrency.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {['all', 'verified'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                filter === f
                  ? 'bg-[#639922] text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
              }`}
            >
              {f === 'all' ? 'All Projects' : '✓ Verified'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl text-center mb-8">
            {error}
          </div>
        )}

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">🌿</span>
            <h3 className="text-xl text-white mb-2">No listings available</h3>
            <p className="text-gray-500">Check back soon for new carbon offset projects.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map(listing => (
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

  return (
    <Link
      to={`/marketplace/${listing.listing_id}`}
      className="group bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden hover:border-[#639922]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#639922]/5"
    >
      {/* Image */}
      <div className="h-48 bg-gradient-to-br from-[#2d5016]/40 to-[#639922]/20 relative overflow-hidden">
        {listing.cover_image_url ? (
          <img
            src={listing.cover_image_url}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-30">🌱</span>
          </div>
        )}

        {/* Status badge */}
        {farm.is_verified && (
          <span className="absolute top-3 right-3 bg-emerald-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
            ✓ Verified
          </span>
        )}

        {/* Vintage */}
        {listing.vintage_year && (
          <span className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
            {listing.vintage_year}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#639922] transition-colors">
          {listing.title}
        </h3>
        {listing.subtitle && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{listing.subtitle}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <span>📍</span>
          <span>{listing.location || farm.location || 'Unknown'}</span>
        </div>

        {/* Tags */}
        {listing.practice_tags && listing.practice_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {listing.practice_tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="bg-[#639922]/10 text-[#639922] text-xs px-2 py-0.5 rounded-full border border-[#639922]/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Price & Credits */}
        <div className="flex items-end justify-between pt-3 border-t border-white/5">
          <div>
            <p className="text-xs text-gray-500">Credits Available</p>
            <p className="text-lg font-bold text-white">
              {parseFloat(listing.credits_available).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Price per Credit</p>
            <p className="text-lg font-bold text-[#c9a961]">
              {parseFloat(listing.price_per_credit).toFixed(6)} ETH
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
