import { useState, useEffect } from 'react';
import marketplaceService from '../../services/marketplaceService';
import StatusBadge from '../common/StatusBadge';
import Card from '../common/Card';
import Skeleton from '../common/Skeleton';

export default function PurchaseHistoryTable() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPurchases();
  }, []);

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
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card className="py-12 text-center">
        <p className="text-sm font-semibold text-surface-700">No purchases yet</p>
        <p className="text-xs text-surface-400 mt-1">Carbon offset receipts will appear here once confirmed.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {purchases.map((p) => (
        <Card key={p.purchase_id} hover className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-100">
            <div>
              <h4 className="font-bold text-surface-900 text-sm">
                {p.listing?.project?.name || 'Verified Soil Carbon Pool'}
              </h4>
              <p className="text-xs text-surface-500 mt-0.5">
                Purchased {new Date(p.created_at).toLocaleDateString()}
              </p>
            </div>
            <StatusBadge status={p.status || 'verified'} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-surface-400 block">Credits</span>
              <span className="text-sm font-bold text-surface-900">{parseFloat(p.credits_amount || 0).toFixed(2)} tCO₂e</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-surface-400 block">Price / Credit</span>
              <span className="text-sm font-mono text-surface-700">{parseFloat(p.price_per_credit || 0).toFixed(6)} ETH</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-surface-400 block">Total Settlement</span>
              <span className="text-sm font-mono font-bold text-gold-600">{parseFloat(p.total_price || 0).toFixed(6)} ETH</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-surface-400 block">Blockchain Hash</span>
              {p.blockchain_tx_hash ? (
                <a
                  href={`https://sepolia.etherscan.io/tx/${p.blockchain_tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-brand-600 hover:underline truncate block"
                >
                  {p.blockchain_tx_hash.slice(0, 10)}…
                </a>
              ) : (
                <span className="text-xs text-surface-400">Pending</span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}