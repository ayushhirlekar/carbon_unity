import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Footer from '../components/layout/Footer';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const dashboardPath = user?.role === 'admin' ? '/admin' : '/buyer';

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e5e5e5]">
      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#2d5016]/20" />
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#639922] rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#c9a961]/50 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-8 mx-auto sm:mx-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              <span className="text-xs sm:text-sm font-medium text-gray-300">Live on Ethereum Sepolia Testnet</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">
              Verified Carbon Credits,<br/>
              <span className="gradient-text">On-Chain.</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 leading-relaxed mb-10 max-w-2xl mx-auto sm:mx-0">
              An institutional-grade marketplace connecting verified sustainable farming initiatives with corporate and individual buyers seeking transparent carbon offsets.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center sm:justify-start gap-4">
              {isAuthenticated ? (
                <Link to={dashboardPath}>
                  <Button size="lg" variant="primary">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/marketplace">
                    <Button size="lg" variant="primary">
                      Browse Marketplace
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="lg" variant="secondary">
                      Sign In to Purchase
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Decorative divider */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* How It Works */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Institutional Trust Model</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              CarbonUnity v2 utilizes a centralized verification approach paired with decentralized settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🛡️', title: 'Admin Verification', desc: 'Projects undergo rigorous offline auditing before being securely onboarded to the platform.' },
              { icon: '🌱', title: 'Scientific Calculation', desc: 'Credits are minted using verified soil organic carbon (SOC), bulk density, and depth equations.' },
              { icon: '⛓️', title: 'Immutable Settlement', desc: 'Decentralized purchase execution via smart contracts ensures non-custodial and transparent settlement.' },
            ].map((feature) => (
              <div key={feature.title} className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-8 hover:border-[#639922]/30 transition-colors card-glow transform hover:-translate-y-1 duration-300">
                <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-2xl mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[#1a1a2e] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
            {[
              { value: 'Atomic', label: 'Project Creation' },
              { value: 'Sepolia', label: 'Network' },
              { value: 'Idempotent', label: 'Verification' },
              { value: 'Audited', label: 'Credits' },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-4">
                <p className="text-2xl sm:text-3xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-sm text-[#639922] font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#639922]/5" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-extrabold text-white mb-6">
            Offset Your Footprint Today
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Discover verified projects and purchase carbon credits directly on-chain using cryptocurrency.
          </p>
          <Link to="/marketplace">
            <Button size="lg" variant="primary" className="px-10 py-4 text-lg">
              Explore Active Projects
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
