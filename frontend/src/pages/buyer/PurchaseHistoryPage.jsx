import { useState, useEffect } from 'react';
import marketplaceService from '../../services/marketplaceService';

export default function PurchaseHistoryPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPurchases(); }, []);

  const loadPurchases = async () => {
    try {
      const res = await marketplaceService.getPurchaseHistory();
      setPurchases(res.data || []);
    } catch (err) {
      console.error('Load purchases error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#639922] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Purchase History</h1>
        <p className="text-gray-500 text-sm mt-1">{purchases.length} transaction(s)</p>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-20 bg-[#1a1a2e] border border-white/5 rounded-2xl">
          <span className="text-5xl mb-4 block">📋</span>
          <h3 className="text-xl text-white mb-2">No purchases yet</h3>
          <p className="text-gray-500">Visit the marketplace to purchase carbon credits</p>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map(tx => (
            <div key={tx.transaction_id} className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-medium mb-1">
                    {tx.marketplace_listings?.title || `Listing #${tx.listing_id?.slice(0, 8)}`}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {tx.marketplace_listings?.location || ''}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${
                  tx.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                  tx.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {tx.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-xs text-gray-500">Credits</p>
                  <p className="text-white font-medium">{parseFloat(tx.credits_purchased).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Price Paid</p>
                  <p className="text-[#c9a961] font-medium">{parseFloat(tx.price_paid).toFixed(6)} ETH</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Block</p>
                  <p className="text-white font-medium">{tx.block_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-white font-medium">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {tx.blockchain_tx_hash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${tx.blockchain_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline mt-3 inline-block"
                >
                  View on Etherscan →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
