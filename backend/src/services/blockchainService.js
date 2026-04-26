/**
 * CarbonUnity v2 — Blockchain Verification Service
 *
 * Verifies Ethereum transactions on Sepolia testnet:
 * - Fetches transaction receipt
 * - Validates status (success/failure)
 * - Verifies contract target address
 * - Validates sender wallet
 */

const { ethers } = require('ethers');

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || 'https://rpc.sepolia.org';

let _provider = null;

/**
 * Get or create JSON-RPC provider (singleton)
 */
const getProvider = () => {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return _provider;
};

/**
 * Verify a blockchain transaction
 * @param {string} txHash - Transaction hash
 * @param {object} expected - Expected parameters
 * @param {string} expected.buyerWallet - Expected sender address
 * @param {string} [expected.recipientAddress] - Expected recipient (admin wallet for direct transfers)
 * @param {string} [expected.contractAddress] - Expected recipient contract (legacy, use recipientAddress)
 * @returns {object} { confirmed, blockNumber, from, to, value }
 */
const verifyTransaction = async (txHash, expected = {}) => {
  const provider = getProvider();

  // 1. Get transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    throw new Error('Transaction not found on blockchain. It may still be pending.');
  }

  // 2. Check transaction status (1 = success, 0 = reverted)
  if (receipt.status !== 1) {
    throw new Error('Transaction was reverted on blockchain');
  }

  // 3. Get full transaction data (for value and addresses)
  const tx = await provider.getTransaction(txHash);

  if (!tx) {
    throw new Error('Transaction data not found');
  }

  // 4. Verify sender matches buyer wallet
  if (expected.buyerWallet) {
    if (tx.from.toLowerCase() !== expected.buyerWallet.toLowerCase()) {
      throw new Error(
        `Sender mismatch. Expected: ${expected.buyerWallet}, Got: ${tx.from}`
      );
    }
  }

  // 5. Verify recipient address
  // Priority: explicit recipientAddress > contractAddress > CONTRACT_ADDRESS env var
  const expectedRecipient = expected.recipientAddress || expected.contractAddress || CONTRACT_ADDRESS;
  if (expectedRecipient) {
    if (tx.to && tx.to.toLowerCase() !== expectedRecipient.toLowerCase()) {
      throw new Error(
        `Recipient address mismatch. Expected: ${expectedRecipient}, Got: ${tx.to}`
      );
    }
  }

  return {
    confirmed: true,
    blockNumber: receipt.blockNumber,
    from: tx.from,
    to: tx.to,
    value: ethers.formatEther(tx.value),
    gasUsed: receipt.gasUsed.toString()
  };
};

/**
 * Check if a transaction hash has already been recorded
 * @param {object} supabase - Supabase client
 * @param {string} txHash - Transaction hash
 * @returns {boolean} true if already exists
 */
const isTransactionRecorded = async (supabase, txHash) => {
  const { data } = await supabase
    .from('transactions')
    .select('transaction_id')
    .eq('blockchain_tx_hash', txHash.toLowerCase())
    .maybeSingle();

  return !!data;
};

module.exports = {
  getProvider,
  verifyTransaction,
  isTransactionRecorded
};
