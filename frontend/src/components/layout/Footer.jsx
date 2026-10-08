import { Link } from 'react-router-dom';

const LeafIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);

const BlockchainIcon = () => (
  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-surface-950 text-surface-400 border-t border-surface-800/80 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-8 border-b border-surface-800/60">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center mb-2 group">
              <span className="text-xl font-black tracking-tight text-white font-display">
                CARBON<span className="text-brand-400 font-extrabold">UNITY</span>
              </span>
            </Link>
            <p className="text-xs text-surface-400">
              Institutional decentralized carbon verification & settlement protocol.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-6 text-sm font-medium">
            <Link to="/marketplace" className="hover:text-white transition-colors">
              Marketplace
            </Link>
            <Link to="/auth" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              Methodology
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Architecture
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-surface-400">
          <p>© {new Date().getFullYear()} CarbonUnity Foundation. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <BlockchainIcon />
            <span>Settled on <strong className="text-surface-200 font-mono">Sepolia Testnet</strong></span>
          </div>
        </div>
      </div>
    </footer>
  );
}