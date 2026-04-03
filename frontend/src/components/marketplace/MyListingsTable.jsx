import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

export default function MyListingsTable({ listings, onCancel, cancellingId }) {
  if (!listings || listings.length === 0) {
    return <p className="text-sm text-surface-500 text-center py-8">No listings yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-200">
            <th className="text-left py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Date</th>
            <th className="text-right py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Credits</th>
            <th className="text-right py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Price/Credit</th>
            <th className="text-right py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Total (ETH)</th>
            <th className="text-center py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Status</th>
            <th className="text-center py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {listings.map((listing) => (
            <tr key={listing.listing_id} className="hover:bg-surface-50 transition-colors">
              <td className="py-3 px-4 text-surface-600">
                {new Date(listing.created_at).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-right font-bold text-surface-900">
                {parseFloat(listing.credits_amount).toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-surface-700">
                {parseFloat(listing.price_per_credit).toFixed(8)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-gold-600 font-semibold">
                {parseFloat(listing.total_price).toFixed(8)}
              </td>
              <td className="py-3 px-4 text-center">
                <StatusBadge status={listing.status} />
              </td>
              <td className="py-3 px-4 text-center">
                {listing.status === 'active' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onCancel?.(listing.listing_id)}
                    loading={cancellingId === listing.listing_id}
                    id={`btn-cancel-${listing.listing_id}`}
                  >
                    Cancel
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
