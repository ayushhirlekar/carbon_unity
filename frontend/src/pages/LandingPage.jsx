import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/layout/Footer';

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
const IconShield = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

const IconLeaf = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);

const IconChain = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

const IconEthereum = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#3dbc6a">
    <path d="M12 1.75l-6.25 10.5L12 16l6.25-3.75L12 1.75zM5.75 13.5L12 22.25l6.25-8.75L12 17.25 5.75 13.5z"/>
  </svg>
);

const IconGlobe = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

// ── Floating particle component ───────────────────────────────────────────────
const particles = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 4.3) % 90}%`,
  delay: `${(i * 0.37) % 5}s`,
  dur: `${4 + (i % 4)}s`,
  size: i % 3 === 0 ? 8 : i % 3 === 1 ? 5 : 4,
}));

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const dashboardPath = user?.role === 'admin' ? '/admin' : '/buyer';

  const ff = '"DM Sans", "Outfit", -apple-system, BlinkMacSystemFont, sans-serif';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f5f0', color: '#1C2B1C', fontFamily: ff }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '110px', paddingBottom: '100px' }}>

        {/* Background blobs */}
        <div style={{ position: 'absolute', top: '40px',  left: '-80px',  width: '500px', height: '500px', background: 'radial-gradient(circle, #639922 0%, transparent 70%)', opacity: 0.09, filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '440px', height: '440px', background: 'radial-gradient(circle, #2d5016 0%, transparent 70%)', opacity: 0.08, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '900px', height: '900px', background: 'radial-gradient(circle, rgba(99,153,34,0.04) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* Dot-grid texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, #2d5016 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          opacity: 0.04,
        }} />

        <div style={{
          position: 'relative',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 32px',
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          alignItems: 'center',
          gap: '48px',
        }}>

          {/* LEFT COPY */}
          <div>
            {/* Live badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '7px 16px', background: '#fff', border: '1px solid #c8ddc0', borderRadius: '24px', marginBottom: '36px', boxShadow: '0 2px 12px rgba(45,80,22,0.08)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3dbc6a', flexShrink: 0, boxShadow: '0 0 8px rgba(61,188,106,0.8)', animation: 'pulse 2s infinite' }} />
              <IconEthereum />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A6741', letterSpacing: '0.01em' }}>Live on Ethereum Sepolia Testnet</span>
            </div>

            <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 66px)', fontWeight: 800, color: '#1C2B1C', lineHeight: 1.08, marginBottom: '24px', letterSpacing: '-2px' }}>
              Verified Carbon Credits,<br />
              <span style={{
                color: '#639922',
                position: 'relative',
                display: 'inline-block',
              }}>On-Chain.
                <svg style={{ position: 'absolute', bottom: '-6px', left: 0, width: '100%', overflow: 'visible' }} height="8" viewBox="0 0 200 8" preserveAspectRatio="none">
                  <path d="M0 6 Q50 0 100 5 Q150 9 200 3" stroke="#639922" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
                </svg>
              </span>
            </h1>

            <p style={{ fontSize: '17px', color: '#5a7a5e', lineHeight: 1.75, marginBottom: '44px', maxWidth: '540px' }}>
              An institutional-grade marketplace connecting verified sustainable farming initiatives with corporate and individual buyers seeking transparent carbon offsets.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
              {isAuthenticated ? (
                <Link to={dashboardPath}>
                  <button className="btn-primary">
                    Go to Dashboard <IconArrow />
                  </button>
                </Link>
              ) : (
                <>
                  <Link to="/marketplace">
                    <button className="btn-primary">
                      Browse Marketplace <IconArrow />
                    </button>
                  </Link>
                  <Link to="/auth">
                    <button className="btn-secondary">Sign In to Purchase</button>
                  </Link>
                </>
              )}
            </div>

            {/* Trust line */}
            <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              {['SOC Verified', 'Non-Custodial', 'Audited'].map((tag, i) => (
                <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {i > 0 && <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#b8d4b0' }} />}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#7a9a7e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — animated plant card */}
          <div style={{ position: 'relative', height: '480px' }}>

            {/* Card frame */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(232,245,224,0.6) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              border: '1px solid rgba(200,221,192,0.7)',
              boxShadow: '0 24px 64px rgba(45,80,22,0.12), 0 4px 16px rgba(45,80,22,0.06)',
              overflow: 'hidden',
            }}>

              {/* Video layer */}
              <video autoPlay muted loop playsInline style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', opacity: 0.18,
              }} src="https://cdn.coverr.co/videos/coverr-young-plant-growing-1584/1080p.mp4" />

              {/* Floating particles */}
              {particles.map(p => (
                <span key={p.id} style={{
                  position: 'absolute',
                  width: `${p.size}px`, height: `${p.size}px`,
                  borderRadius: '50%',
                  background: p.id % 4 === 0 ? '#3dbc6a' : '#639922',
                  opacity: 0,
                  left: p.left,
                  bottom: '-12px',
                  animation: `floatUp ${p.dur} ${p.delay} infinite ease-out`,
                }} />
              ))}

              {/* Plant SVG */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="220" height="260" viewBox="0 0 200 260">
                  {/* Pot */}
                  <rect x="70" y="210" width="60" height="10" rx="5" fill="#2d5016" opacity="0.5"/>
                  <path d="M65 220 Q65 240 75 240 L125 240 Q135 240 135 220 Z" fill="#2d5016" opacity="0.3"/>
                  {/* Soil */}
                  <ellipse cx="100" cy="210" rx="34" ry="8" fill="#1C2B1C" opacity="0.15"/>
                  {/* Stem */}
                  <path d="M100 210 C100 185 98 160 100 120" stroke="#2d5016" strokeWidth="4" fill="transparent" strokeLinecap="round" className="stem"/>
                  {/* Left leaf */}
                  <ellipse cx="76" cy="150" rx="22" ry="11" fill="#639922" transform="rotate(-20, 76, 150)" className="leaf" opacity="0.9"/>
                  {/* Right leaf */}
                  <ellipse cx="124" cy="136" rx="22" ry="11" fill="#4a7c1f" transform="rotate(15, 124, 136)" className="leaf leaf-delay" opacity="0.9"/>
                  {/* Top bud */}
                  <circle cx="100" cy="118" r="10" fill="#3dbc6a" className="bud" opacity="0.85"/>
                  <circle cx="100" cy="118" r="6" fill="#2d5016" className="bud" opacity="0.5"/>
                </svg>
              </div>

              {/* Floating stat chips */}
              <div className="chip chip-tl">
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2d5016' }}>+2,400 tCO₂</span>
                <span style={{ fontSize: '10px', color: '#639922' }}>Verified this month</span>
              </div>
              <div className="chip chip-br">
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2d5016' }}>Sepolia Chain</span>
                <span style={{ fontSize: '10px', color: '#639922' }}>Settlement live</span>
              </div>

            </div>

            {/* Decorative ring */}
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '120px', height: '120px',
              border: '1.5px dashed #c8ddc0',
              borderRadius: '50%',
              animation: 'spin 18s linear infinite',
              opacity: 0.6,
            }} />
          </div>
        </div>

        {/* Bottom divider */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 0%, #d4e8d4 40%, #d4e8d4 60%, transparent 100%)' }} />
      </section>


      {/* ── STATS STRIP ── */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e8f0e4' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { value: 'Atomic',      label: 'Project Creation',  icon: '⬡' },
              { value: 'Sepolia',     label: 'Network',           icon: '◈' },
              { value: 'Idempotent',  label: 'Verification',      icon: '◎' },
              { value: 'Audited',     label: 'Credits',           icon: '◆' },
            ].map((stat, i) => (
              <div key={stat.label} style={{
                textAlign: 'center',
                padding: '32px 20px',
                borderRight: i < 3 ? '1px solid #e8f0e4' : 'none',
                position: 'relative',
              }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#639922', fontWeight: 700, marginBottom: '8px' }}>{stat.icon} {stat.label}</p>
                <p style={{ fontSize: '26px', fontWeight: 800, color: '#1C2B1C', letterSpacing: '-0.5px', margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '104px 32px', background: '#f0f5f0', position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99,153,34,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Section header */}
          <div style={{ maxWidth: '560px', marginBottom: '72px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#639922', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '14px' }}>How it works</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#1C2B1C', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: '18px' }}>
              Institutional Trust Model
            </h2>
            <p style={{ fontSize: '16px', color: '#5a7a5e', lineHeight: 1.7 }}>
              CarbonUnity v2 utilizes a centralized verification approach paired with decentralized settlement.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {[
              {
                Icon: IconShield,
                step: '01',
                title: 'Admin Verification',
                desc: 'Projects undergo rigorous offline auditing before being securely onboarded to the platform.',
                color: '#2d5016',
                light: '#e4f0dc',
              },
              {
                Icon: IconLeaf,
                step: '02',
                title: 'Scientific Calculation',
                desc: 'Credits are minted using verified soil organic carbon (SOC), bulk density, and depth equations.',
                color: '#639922',
                light: '#ecf5e0',
              },
              {
                Icon: IconChain,
                step: '03',
                title: 'Immutable Settlement',
                desc: 'Decentralized purchase execution via smart contracts ensures non-custodial and transparent settlement.',
                color: '#3dbc6a',
                light: '#e0f5e9',
              },
            ].map(f => (
              <div key={f.title} className="feature-card" style={{ '--card-color': f.color, '--card-light': f.light }}>
                <div className="feature-card-inner">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
                    <div style={{
                      width: '56px', height: '56px',
                      background: f.light,
                      border: `1.5px solid ${f.color}28`,
                      borderRadius: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: f.color,
                    }}>
                      <f.Icon />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: f.color, opacity: 0.3, letterSpacing: '-0.5px' }}>{f.step}</span>
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#1C2B1C', marginBottom: '12px', letterSpacing: '-0.3px' }}>{f.title}</h3>
                  <p style={{ fontSize: '14px', color: '#5a7a5e', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>

                  <div className="card-hover-line" style={{ '--line-color': f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── CTA ── */}
      <section style={{ padding: '104px 32px', background: '#fff', position: 'relative', overflow: 'hidden' }}>

        {/* Decorative background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #2d5016 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.025 }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(99,153,34,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: '#e8f5e0', border: '1px solid #c8ddc0', borderRadius: '20px', marginBottom: '28px' }}>
            <IconGlobe />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A6741' }}>Open to everyone</span>
          </div>

          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#1C2B1C', marginBottom: '20px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            Offset Your Footprint Today
          </h2>
          <p style={{ fontSize: '17px', color: '#5a7a5e', marginBottom: '44px', lineHeight: 1.7 }}>
            Discover verified projects and purchase carbon credits directly on-chain using cryptocurrency.
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/marketplace">
              <button className="btn-primary btn-lg">
                Explore Active Projects <IconArrow />
              </button>
            </Link>
          </div>

          {/* Decorative dashed ring */}
          <div style={{
            position: 'absolute', bottom: '-120px', right: '-80px',
            width: '260px', height: '260px',
            border: '1.5px dashed #d4e8d4',
            borderRadius: '50%',
            animation: 'spin 24s linear infinite',
            opacity: 0.7,
            pointerEvents: 'none',
          }} />
        </div>
      </section>

      <Footer />

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Animations */
        @keyframes pulse {
          0%,100% { opacity:1; transform: scale(1); }
          50%      { opacity:0.4; transform: scale(0.85); }
        }

        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);   opacity: 0; }
          10%  { opacity: 0.55; }
          90%  { opacity: 0.3; }
          100% { transform: translateY(-300px) scale(0.4); opacity: 0; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes growStem {
          to { stroke-dashoffset: 0; }
        }

        @keyframes leafGrow {
          0%   { transform: scale(0) rotate(-10deg); }
          60%  { transform: scale(1.08) rotate(2deg); }
          100% { transform: scale(1)  rotate(0deg); }
        }

        @keyframes budPop {
          0%   { transform: scale(0); opacity:0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity:1; }
        }

        @keyframes chipFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }

        /* Stem */
        .stem {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: growStem 1.6s ease forwards 0.4s;
        }

        /* Leaves */
        .leaf {
          transform-origin: 100px 200px;
          transform: scale(0);
          animation: leafGrow 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards 1.4s;
        }
        .leaf-delay {
          animation-delay: 1.8s;
        }

        /* Bud */
        .bud {
          transform-origin: 100px 118px;
          transform: scale(0);
          opacity: 0;
          animation: budPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards 2.2s;
        }

        /* Stat chips */
        .chip {
          position: absolute;
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(200,221,192,0.8);
          border-radius: 12px;
          padding: 10px 14px;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 16px rgba(45,80,22,0.08);
          animation: chipFloat 4s ease-in-out infinite;
        }
        .chip-tl { top: 24px; left: 20px; animation-delay: 0s; }
        .chip-br { bottom: 24px; right: 20px; animation-delay: 1.5s; }

        /* Buttons */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #2d5016;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 14px 26px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          letter-spacing: -0.2px;
          box-shadow: 0 4px 16px rgba(45,80,22,0.25);
        }
        .btn-primary:hover {
          background: #1a3a0d;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(45,80,22,0.35);
        }
        .btn-primary.btn-lg {
          padding: 16px 36px;
          font-size: 16px;
          border-radius: 14px;
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          color: #2d5016;
          border: 1.5px solid #c8ddc0;
          border-radius: 12px;
          padding: 14px 26px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          letter-spacing: -0.2px;
        }
        .btn-secondary:hover {
          background: #f0f7ec;
          border-color: #2d5016;
          transform: translateY(-2px);
        }

        /* Feature cards */
        .feature-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          cursor: default;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 48px rgba(45,80,22,0.14);
        }
        .feature-card-inner {
          background: #fff;
          border: 1px solid #e4eede;
          border-radius: 20px;
          padding: 36px 32px 32px;
          height: 100%;
          position: relative;
          overflow: hidden;
          transition: border-color 0.25s;
        }
        .feature-card:hover .feature-card-inner {
          border-color: var(--card-color, #2d5016);
        }

        .card-hover-line {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          background: var(--line-color, #2d5016);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
          border-radius: 0 0 3px 3px;
        }
        .feature-card:hover .card-hover-line {
          transform: scaleX(1);
        }
      `}</style>
    </div>
  );
}