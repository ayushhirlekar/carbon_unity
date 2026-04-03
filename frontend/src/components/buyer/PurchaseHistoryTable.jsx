export default function PurchaseHistoryTable({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return <p className="text-sm text-surface-500 text-center py-8">No purchases yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-200">
            <th className="text-left py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Date</th>
            <th className="text-left py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Seller</th>
            <th className="text-right py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Credits</th>
            <th className="text-right py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Paid (ETH)</th>
            <th className="text-center py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wider">TX</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {transactions.map((tx) => (
            <tr key={tx.tx_id} className="hover:bg-surface-50 transition-colors">
              <td className="py-3 px-4 text-surface-600">
                {new Date(tx.timestamp).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-surface-700 font-medium">
                {tx.seller?.display_name || `${tx.seller_wallet?.slice(0, 6)}...${tx.seller_wallet?.slice(-4)}`}
              </td>
              <td className="py-3 px-4 text-right font-bold text-brand-600">
                {parseFloat(tx.credits_purchased).toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-surface-700">
                {parseFloat(tx.total_paid_eth).toFixed(8)}
              </td>
              <td className="py-3 px-4 text-center">
                {tx.blockchain_tx_hash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.blockchain_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-500 hover:text-brand-600"
                  >
                    <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
