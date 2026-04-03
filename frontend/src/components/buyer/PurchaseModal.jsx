import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import ErrorAlert from '../common/ErrorAlert';
import { useWeb3 } from '../../context/Web3Context';
import { marketplaceService } from '../../services/marketplaceService';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';

const STEPS = {
  CONFIRM: 'confirm',
  PAYING: 'paying',
  VERIFYING: 'verifying',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function PurchaseModal({ isOpen, onClose, listing, onSuccess }) {
  const [step, setStep] = useState(STEPS.CONFIRM);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const { sendTransaction, isCorrectChain, switchToSepolia } = useWeb3();
  const { refreshUser } = useAuth();
  const toast = useToast();

  const handlePurchase = async () => {
    setError('');

    if (!isCorrectChain) {
      await switchToSepolia();
      return;
    }

    try {
      // Step 1: Send ETH via MetaMask
      setStep(STEPS.PAYING);
      const hash = await sendTransaction(listing.seller_wallet, listing.total_price);
      setTxHash(hash);

      // Step 2: Verify with backend
      setStep(STEPS.VERIFYING);
      await marketplaceService.purchaseCredits({
        listingId: listing.listing_id,
        blockchainTxHash: hash,
      });

      // Step 3: Success
      setStep(STEPS.SUCCESS);
      toast.success('Credits purchased successfully!');
      await refreshUser();
      onSuccess?.();
    } catch (err) {
      setError(err?.message || err?.reason || 'Transaction failed');
      setStep(STEPS.ERROR);
    }
  };

  const handleClose = () => {
    setStep(STEPS.CONFIRM);
    setError('');
    setTxHash('');
    onClose();
  };

  if (!listing) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Purchase Carbon Credits" size="md">
      <div className="space-y-6">
        {/* Listing Summary */}
        <div className="p-4 bg-surface-50 rounded-xl space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Credits</span>
            <span className="font-bold text-surface-900">{parseFloat(listing.credits_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Price per Credit</span>
            <span className="text-surface-700">{parseFloat(listing.price_per_credit).toFixed(8)} ETH</span>
          </div>
          <div className="h-px bg-surface-200" />
          <div className="flex justify-between">
            <span className="text-sm font-semibold text-surface-700">You Pay</span>
            <span className="text-lg font-bold text-gold-500">{parseFloat(listing.total_price).toFixed(8)} ETH</span>
          </div>
        </div>

        {/* Steps */}
        {step === STEPS.CONFIRM && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700">
                This will open MetaMask to send {parseFloat(listing.total_price).toFixed(8)} ETH to the seller's wallet.
                The transaction will be verified on the Sepolia blockchain.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button variant="gold" onClick={handlePurchase} className="flex-1" id="btn-confirm-purchase">
                Confirm Purchase
              </Button>
            </div>
          </div>
        )}

        {step === STEPS.PAYING && (
          <div className="text-center py-4 space-y-3 animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-gold-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gold-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
            <p className="font-semibold text-surface-900">Approve in MetaMask</p>
            <p className="text-sm text-surface-500">Please confirm the transaction in your wallet</p>
          </div>
        )}

        {step === STEPS.VERIFYING && (
          <div className="text-center py-4 space-y-3 animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-brand-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
            <p className="font-semibold text-surface-900">Verifying Transaction</p>
            <p className="text-sm text-surface-500">Confirming on the Sepolia blockchain...</p>
          </div>
        )}

        {step === STEPS.SUCCESS && (
          <div className="text-center py-4 space-y-4 animate-scale-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-bold text-surface-900">Purchase Complete!</p>
            <p className="text-sm text-surface-500">
              You received <span className="font-bold text-brand-600">{parseFloat(listing.credits_amount).toFixed(2)}</span> carbon credits
            </p>
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600"
              >
                View on Etherscan
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            )}
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}

        {step === STEPS.ERROR && (
          <div className="space-y-4 animate-fade-in">
            <ErrorAlert message={error} />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handlePurchase} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
