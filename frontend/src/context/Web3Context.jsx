import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum;

  const connectWallet = useCallback(async () => {
    if (!hasMetaMask) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return null;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        const addr = accounts[0].toLowerCase();
        setAccount(addr);

        const chain = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(chain, 16));

        return addr;
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
    return null;
  }, [hasMetaMask]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setChainId(null);
  }, []);

  const signMessage = useCallback(async (message) => {
    if (!hasMetaMask || !account) {
      throw new Error('No wallet connected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(message);
    return signature;
  }, [hasMetaMask, account]);

  const switchToSepolia = useCallback(async () => {
    if (!hasMetaMask) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }] // Sepolia chain ID
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }]
        });
      }
    }
  }, [hasMetaMask]);

  // Listen for account/chain changes
  useEffect(() => {
    if (!hasMetaMask) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
      } else {
        setAccount(accounts[0].toLowerCase());
      }
    };

    const handleChainChanged = (chain) => {
      setChainId(parseInt(chain, 16));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Check if already connected
    window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
      if (accounts.length > 0) {
        setAccount(accounts[0].toLowerCase());
        window.ethereum.request({ method: 'eth_chainId' }).then(chain => {
          setChainId(parseInt(chain, 16));
        });
      }
    });

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [hasMetaMask]);

  const isSepolia = chainId === 11155111;

  return (
    <Web3Context.Provider value={{
      account,
      chainId,
      isSepolia,
      isConnecting,
      error,
      hasMetaMask,
      connectWallet,
      disconnectWallet,
      signMessage,
      switchToSepolia
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) throw new Error('useWeb3 must be used within Web3Provider');
  return context;
};

export default Web3Context;
