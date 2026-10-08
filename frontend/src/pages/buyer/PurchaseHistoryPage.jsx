import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import marketplaceService from '../../services/marketplaceService';
import StatusBadge from '../../components/common/StatusBadge';
import Skeleton from '../../components/common/Skeleton';
import Button from '../../components/common/Button';

const ExternalLinkIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

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
      <div className="space-y-4 animate-fade-in font-sans">
        <div className="h-8 w-60"><Skeleton className="h-8 w-full" /></div>
        <div className="h-4 w-40 mb-6"><Skeleton className="h-4 w-full" /></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36"><Skeleton className="h-full w-full rounded-2xl" /></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          On-Chain Ledger
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
          Purchase History & Settlements
        </h1>
        <p className="text-sm text-surface-600 mt-1">
          {purchases.length} cryptographic transaction receipt(s) recorded on Sepolia
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="bg-white rounded-3xl border border-surface-200 p-12 text-center max-w-lg mx-auto shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 text-surface-500 flex items-center justify-center mx-auto mb-3 shadow-subtle">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-surface-900">No transactions recorded yet</h2>
          <p className="text-xs text-surface-500 mt-1 mb-6">
            You haven't purchased any carbon credits yet. Explore active farm listings on the marketplace.
          </p>
          <Link to="/marketplace">
            <Button variant="primary" size="md">
              Browse Marketplace
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((tx) => (
            <div
              key={tx.transaction_id}
              className="bg-white rounded-2xl border border-surface-200 p-5 shadow-card hover:shadow-card-hover transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-100">
                <div>
                  <h3 className="text-base font-bold text-surface-900 tracking-tight">
                    {tx.marketplace_listings?.title || `Listing #${tx.listing_id?.slice(0, 8)}`}
                  </h3>
                  <span className="text-xs text-surface-500 flex items-center gap-1.5 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span>{tx.marketplace_listings?.location || tx.marketplace_listings?.farms?.location || 'Maharashtra, India'}</span>
                  </span>
                </div>
                <StatusBadge status={tx.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
                    Credits Retired
                  </span>
                  <span className="text-sm font-bold text-brand-900">
                    {parseFloat(tx.credits_purchased).toLocaleString()} Tons
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
                    Settlement Amount
                  </span>
                  <span className="text-sm font-mono font-bold text-surface-900">
                    {parseFloat(tx.price_paid).toFixed(6)} ETH
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
                    Block Number
                  </span>
                  <span className="text-xs font-mono font-semibold text-surface-700">
                    {tx.block_number ? `#${tx.block_number}` : 'Pending Confirmation'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
                    Timestamp
                  </span>
                  <span className="text-xs font-semibold text-surface-700">
                    {new Date(tx.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {tx.blockchain_tx_hash && (
                <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
                  <span className="text-xs font-mono text-surface-400">
                    Tx: {tx.blockchain_tx_hash.slice(0, 16)}...
                  </span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.blockchain_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900 transition-colors"
                  >
                    <span>Inspect on Etherscan</span>
                    <ExternalLinkIcon />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}