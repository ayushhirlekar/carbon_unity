import { useWeb3 } from '../../context/Web3Context';
import Button from '../common/Button';

export default function ConnectWallet({ onConnected }) {
  const { walletAddress, isConnected, isConnecting, connectWallet, isCorrectChain, switchToSepolia } = useWeb3();

  const truncateAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleConnect = async () => {
    try {
      await connectWallet();
      onConnected?.();
    } catch (err) {
      // error handled in context
    }
  };

  if (isConnected && !isCorrectChain) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-700 font-medium">
            Wrong network detected. Please switch to Sepolia.
          </p>
        </div>
        <Button onClick={switchToSepolia} variant="gold" id="btn-switch-network">
          Switch to Sepolia
        </Button>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl">
        <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
        <div>
          <p className="text-sm font-semibold text-brand-700">Wallet Connected</p>
          <p className="text-xs font-mono text-brand-500">{truncateAddress(walletAddress)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
        <svg className="w-10 h-10 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-bold text-surface-900 mb-1">Connect Your Wallet</h3>
        <p className="text-sm text-surface-500">Use MetaMask to authenticate securely</p>
      </div>
      <Button onClick={handleConnect} loading={isConnecting} size="lg" className="w-full" id="btn-connect-wallet">
        {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
      </Button>
      {!window.ethereum && (
        <p className="text-xs text-red-500">
          MetaMask not detected.{' '}
          <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="underline">
            Install MetaMask
          </a>
        </p>
      )}
    </div>
  );
}
