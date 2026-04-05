import { ethers } from 'ethers';
import ContractABI from '../../../smart-contracts/CarbonCreditMarketplace.abi.json';



const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
// ADD THIS DEBUG LINE
console.log('🔍 CONTRACT_ADDRESS loaded:', CONTRACT_ADDRESS);
console.log('🔍 All Vite env vars:', import.meta.env);

/**
 * Get ethers BrowserProvider (MetaMask)
 */
export const getProvider = () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  return new ethers.BrowserProvider(window.ethereum);
};

/**
 * Get contract instance (read-only or with signer)
 */
export const getContract = async (withSigner = false) => {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured');
  }

  const provider = getProvider();

  if (withSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, ContractABI, signer);
  }

  return new ethers.Contract(CONTRACT_ADDRESS, ContractABI, provider);
};

/**
 * Purchase credits via smart contract
 * @param {number} listingId - On-chain listing ID
 * @param {number} credits - Number of credits
 * @param {string} totalEthPrice - Total ETH price as string
 * @returns {object} { txHash, receipt }
 */
export const purchaseCreditsOnChain = async (listingId, credits, totalEthPrice) => {
  const contract = await getContract(true);

  const tx = await contract.purchaseCredits(
    listingId,
    credits,
    { value: ethers.parseEther(totalEthPrice) }
  );

  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    receipt
  };
};

/**
 * Get credit balance for an address
 */
export const getBalanceOnChain = async (address) => {
  const contract = await getContract(false);
  const balance = await contract.balanceOf(address);
  return Number(balance);
};

/**
 * Retire credits on-chain
 */
export const retireCreditsOnChain = async (amount) => {
  const contract = await getContract(true);
  const tx = await contract.retireCredits(amount);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
};

/**
 * Transfer credits on-chain
 */
export const transferCreditsOnChain = async (to, amount) => {
  const contract = await getContract(true);
  const tx = await contract.transfer(to, amount);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
};

/**
 * Get contract stats
 */
export const getContractStats = async () => {
  const contract = await getContract(false);
  const [totalSupply, totalRetired, nextListingId] = await contract.getStats();
  return {
    totalSupply: Number(totalSupply),
    totalRetired: Number(totalRetired),
    nextListingId: Number(nextListingId)
  };
};

export default {
  getProvider,
  getContract,
  purchaseCreditsOnChain,
  getBalanceOnChain,
  retireCreditsOnChain,
  transferCreditsOnChain,
  getContractStats
};
