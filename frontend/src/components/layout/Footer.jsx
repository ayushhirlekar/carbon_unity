import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#0f0f1a] border-t border-white/5 py-12 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🌱</span>
              <span className="text-xl font-bold text-white tracking-tight">
                Carbon<span className="text-[#639922]">Unity</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 mt-2">v2.0 Admin-Managed Release</p>
          </div>

          <div className="flex gap-6 text-sm text-gray-400">
            <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link to="/auth" className="hover:text-white transition-colors">Sign In</Link>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600">
          <p>© {new Date().getFullYear()} CarbonUnity. All rights reserved.</p>
          <p className="mt-2 md:mt-0 flex items-center gap-1">
            Built on <span className="text-white">Sepolia Testnet</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
