const { ethers } = require('ethers');
const crypto = require('crypto');

/**
 * Generate a random nonce for wallet authentication
 * @returns {string} Random nonce
 */
const generateNonce = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create authentication message for user to sign
 * @param {string} walletAddress - User's wallet address
 * @param {string} nonce - Random nonce
 * @returns {string} Message to sign
 */
const createAuthMessage = (walletAddress, nonce) => {
  return `Welcome to CarbonUnity!\n\nSign this message to authenticate your wallet.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;
};

/**
 * Verify wallet signature
 * @param {string} message - Original message that was signed
 * @param {string} signature - Signature from MetaMask
 * @param {string} expectedAddress - Expected wallet address
 * @returns {boolean} True if signature is valid
 */
const verifySignature = (message, signature, expectedAddress) => {
  try {
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    // Compare addresses (case-insensitive)
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

/**
 * Validate Ethereum address format
 * @param {string} address - Wallet address to validate
 * @returns {boolean} True if valid Ethereum address
 */
const isValidAddress = (address) => {
  return ethers.isAddress(address);
};

/**
 * Normalize Ethereum address to checksum format
 * @param {string} address - Wallet address
 * @returns {string} Checksummed address
 */
const normalizeAddress = (address) => {
  if (!isValidAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }
  return ethers.getAddress(address);
};

module.exports = {
  generateNonce,
  createAuthMessage,
  verifySignature,
  isValidAddress,
  normalizeAddress
};