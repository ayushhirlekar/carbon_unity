import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../config/constants';
import Card from '../common/Card';
import Button from '../common/Button';

export default function ListingCard({ listing, onPurchase }) {
  const { user } = useAuth();
  const isBuyer = user?.role === ROLES.BUYER;
  const isOwnListing = listing.seller_wallet?.toLowerCase() === user?.wallet_address?.toLowerCase();

  const sellerName = listing.users?.display_name || `${listing.seller_wallet?.slice(0, 6)}...${listing.seller_wallet?.slice(-4)}`;

  return (
    <Card hover id={`listing-${listing.listing_id}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{sellerName[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-800">{sellerName}</p>
              <p className="text-xs text-surface-400">Seller</p>
            </div>
          </div>
          {isOwnListing && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-surface-500 font-medium">Your listing</span>
          )}
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-surface-500">Credits</span>
            <span className="text-lg font-bold text-surface-900">{parseFloat(listing.credits_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-surface-500">Price per Credit</span>
            <span className="text-sm font-semibold text-surface-700">{parseFloat(listing.price_per_credit).toFixed(8)} ETH</span>
          </div>
          <div className="h-px bg-surface-100" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-surface-600">Total Price</span>
            <span className="text-base font-bold text-gold-500">{parseFloat(listing.total_price).toFixed(8)} ETH</span>
          </div>
        </div>

        {isBuyer && !isOwnListing && (
          <Button
            onClick={() => onPurchase?.(listing)}
            className="w-full"
            variant="gold"
            id={`btn-purchase-${listing.listing_id}`}
          >
            Purchase Credits
          </Button>
        )}
      </div>
    </Card>
  );
}
