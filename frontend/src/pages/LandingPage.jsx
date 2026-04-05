import { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/layout/Footer';

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
const IconShield = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconLeaf = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

const IconChain = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconEthereum = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#3dbc6a">
    <path d="M12 1.75l-6.25 10.5L12 16l6.25-3.75L12 1.75zM5.75 13.5L12 22.25l6.25-8.75L12 17.25 5.75 13.5z" />
  </svg>
);

const IconGlobe = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_FRAMES = 68;
const NAV_HEIGHT = 60;

function framePath(i) {
  return `/carbonunity-frames/frame_${String(i).padStart(3, '0')}.jpg`;
}

function calcOpacity(frame, fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd) {
  if (frame < fadeInStart || frame > fadeOutEnd) return 0;
  if (frame >= fadeInEnd && frame <= fadeOutStart) return 1;
  if (frame < fadeInEnd) return (frame - fadeInStart) / (fadeInEnd - fadeInStart);
  if (frame > fadeOutStart) return 1 - (frame - fadeOutStart) / (fadeOutEnd - fadeOutStart);
  return 0;
}

// ── Info Box Component ────────────────────────────────────────────────────────
const InfoBox = ({ id, title, subtitle, desc, style, boxRef }) => (
  <div
    id={id}
    ref={boxRef}
    style={{
      position: 'fixed',
      width: '300px',
      background: 'rgba(0,0,0,0.75)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '12px',
      padding: '20px',
      color: '#ffffff',
      lineHeight: 1.6,
      zIndex: 50,
      opacity: 0,
      display: 'none',
      pointerEvents: 'none',
      transition: 'opacity 0.5s ease-in-out',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      ...style,
    }}
  >
    <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>{title}</h3>
    <p style={{ color: '#c9a961', fontWeight: 500, margin: '0 0 12px', fontSize: '14px' }}>{subtitle}</p>
    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'rgba(255,255,255,0.9)' }}>{desc}</p>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const dashboardPath = user?.role === 'admin' ? '/admin' : '/buyer';

  // Refs
  const animImgRef = useRef(null);
  const scrollWrapperRef = useRef(null);
  const box1Ref = useRef(null);
  const box2Ref = useRef(null);
  const box3Ref = useRef(null);
  const box4Ref = useRef(null);
  const currentFrameRef = useRef(0);
  const lazyLoadedRef = useRef(false);
  const tickingRef = useRef(false);

  // Preload frames
  useEffect(() => {
    // Preload frames 1–28 immediately
    for (let i = 1; i <= 28; i++) {
      const img = new Image();
      img.src = framePath(i);
    }
  }, []);

  const lazyLoadRemaining = useCallback(() => {
    if (lazyLoadedRef.current) return;
    lazyLoadedRef.current = true;
    for (let i = 29; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = framePath(i);
    }
  }, []);

  const updateBoxes = useCallback((f) => {
    const boxes = [box1Ref, box2Ref, box3Ref, box4Ref];
    const configs = [
      [4, 8, 26, 28],
      [15, 19, 26, 28],
      [45, 50, 68, 68],
      [45, 50, 68, 68],
    ];
    boxes.forEach((boxRef, idx) => {
      if (boxRef.current) {
        boxRef.current.style.opacity = calcOpacity(f, ...configs[idx]);
      }
    });
  }, []);

  const getProgress = useCallback(() => {
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return 0;
    const wrapperTop = wrapper.offsetTop;
    const wrapperH = wrapper.offsetHeight;
    const viewH = window.innerHeight;
    const scrollable = wrapperH - viewH;
    if (scrollable <= 0) return 0;
    const scrolled = window.scrollY - wrapperTop;
    const p = scrolled / scrollable;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }, []);

  const onScroll = useCallback(() => {
    const progress = getProgress();
    let frameIndex = Math.round(progress * (TOTAL_FRAMES - 1)) + 1;
    if (frameIndex < 1) frameIndex = 1;
    if (frameIndex > TOTAL_FRAMES) frameIndex = TOTAL_FRAMES;

    if (frameIndex >= 25) lazyLoadRemaining();

    if (frameIndex !== currentFrameRef.current) {
      currentFrameRef.current = frameIndex;
      if (animImgRef.current) {
        animImgRef.current.src = framePath(frameIndex);
      }
      updateBoxes(frameIndex);
    }

    // Show/hide boxes only while inside the scroll-wrapper zone
    const inZone = progress > 0 && progress < 1;
    const display = inZone ? 'block' : 'none';
    [box1Ref, box2Ref, box3Ref, box4Ref].forEach(ref => {
      if (ref.current) ref.current.style.display = display;
    });
  }, [getProgress, lazyLoadRemaining, updateBoxes]);

  useEffect(() => {
    const handleScroll = () => {
      if (!tickingRef.current) {
        requestAnimationFrame(() => {
          onScroll();
          tickingRef.current = false;
        });
        tickingRef.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    onScroll(); // initial render

    return () => window.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  const ff = '"DM Sans", "Outfit", -apple-system, BlinkMacSystemFont, sans-serif';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f5f0', color: '#1C2B1C', fontFamily: ff }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: `${NAV_HEIGHT}px`,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e8f0e4',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {/* Logo */}
          <a href="#" style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#1C2B1C',
            textDecoration: 'none',
            letterSpacing: '-0.5px',
            fontFamily: ff,
          }}>
            Carbon<span style={{ color: '#639922' }}>Unity</span>
          </a>

          {/* Right side: live badge + nav links + CTA buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>


            {/* Nav links */}
            {[
              { label: 'Features', href: '#features' },
              { label: 'How it Works', href: '#how-it-works' },
              { label: 'Marketplace', href: '#marketplace' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{ textDecoration: 'none', color: '#4a6741', fontWeight: 500, fontSize: '0.9rem', fontFamily: ff, whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.target.style.color = '#2d5016'}
                onMouseLeave={e => e.target.style.color = '#4a6741'}
              >
                {label}
              </a>
            ))}

            {/* CTA buttons */}
            {isAuthenticated ? (
              <Link to={dashboardPath}>
                <button className="cu-btn-primary" style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '9px' }}>
                  Dashboard <IconArrow />
                </button>
              </Link>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to="/marketplace">
                  <button className="cu-btn-primary" style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '9px' }}>
                    Browse Credits
                  </button>
                </Link>
                <Link to="/auth">
                  <button className="cu-btn-secondary" style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '9px' }}>
                    Sign In
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── SCROLL ANIMATION SECTION ── */}
      {/*
       * scroll-wrapper is 500vh — creates the scrollable zone.
       * marginTop equals NAV_HEIGHT so content starts right below navbar.
       * sticky top = NAV_HEIGHT so the frame fills the remaining viewport.
       */}
      <div
        id="how-it-works"
        ref={scrollWrapperRef}
        style={{
          position: 'relative',
          height: '500vh',
          marginTop: 0,
        }}
      >
        <div style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,

            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            <img
              ref={animImgRef}
              src="/carbonunity-frames/frame_001.jpg"
              alt="CarbonUnity Animation"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', inset: 0 }}
            />
          </div>
        </div>
      </div>

      {/* ── FLOATING INFO BOXES (fixed to viewport) ── */}
      <InfoBox
        id="box-1"
        boxRef={box1Ref}
        title="CarbonUnity"
        subtitle="Empower Farmers to Generate Carbon Credits"
        desc="Using AI + satellite data to verify carbon sequestration and unlock value for farmers."
        style={{
          left: '20px',
          top: `calc(${NAV_HEIGHT}px + 50vh)`,
          transform: 'translateY(-50%)',
        }}
      />
      <InfoBox
        id="box-2"
        boxRef={box2Ref}
        title="Marketplace"
        subtitle="Buy Verified Carbon Credits"
        desc="Access verified, transparent carbon credits from farmers globally. Trade with confidence."
        style={{
          right: '20px',
          top: `calc(${NAV_HEIGHT}px + 50vh)`,
          transform: 'translateY(-50%)',
        }}
      />
      <InfoBox
        id="box-3"
        boxRef={box3Ref}
        title="AI MRV System"
        subtitle="Satellite + AI Analysis"
        desc="Accurate biomass estimation, carbon calculations, and automated verification using machine learning."
        style={{
          left: '20px',
          top: '50vh',
          transform: 'translateY(-50%)',
        }}
      />
      <InfoBox
        id="box-4"
        boxRef={box4Ref}
        title="Global Marketplace"
        subtitle="Instant Credit Settlement"
        desc="Blockchain-verified credits, transparent pricing, and instant settlement across the globe."
        style={{
          right: '20px',
          top: '50vh',
          transform: 'translateY(-50%)',
        }}
      />

      {/* ── STATS STRIP ── */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e8f0e4' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { value: 'Atomic', label: 'Project Creation', icon: '⬡' },
              { value: 'Sepolia', label: 'Network', icon: '◈' },
              { value: 'Idempotent', label: 'Verification', icon: '◎' },
              { value: 'Audited', label: 'Credits', icon: '◆' },
            ].map((stat, i) => (
              <div key={stat.label} style={{
                textAlign: 'center',
                padding: '32px 20px',
                borderRight: i < 3 ? '1px solid #e8f0e4' : 'none',
              }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#639922', fontWeight: 700, marginBottom: '8px' }}>
                  {stat.icon} {stat.label}
                </p>
                <p style={{ fontSize: '26px', fontWeight: 800, color: '#1C2B1C', letterSpacing: '-0.5px', margin: 0 }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES / HOW IT WORKS ── */}
      <section id="features" style={{ padding: '104px 32px', background: '#f0f5f0', position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99,153,34,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ maxWidth: '560px', marginBottom: '72px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#639922', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '14px' }}>Why CarbonUnity</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#1C2B1C', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: '18px' }}>
              Institutional Trust Model
            </h2>
            <p style={{ fontSize: '16px', color: '#5a7a5e', lineHeight: 1.7 }}>
              CarbonUnity utilizes a centralized verification approach paired with decentralized settlement.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {[
              { Icon: IconShield, step: '01', title: 'Admin Verification', desc: 'Projects undergo rigorous offline auditing before being securely onboarded to the platform.', color: '#2d5016', light: '#e4f0dc' },
              { Icon: IconLeaf, step: '02', title: 'Scientific Calculation', desc: 'Credits are minted using verified soil organic carbon (SOC), bulk density, and depth equations.', color: '#639922', light: '#ecf5e0' },
              { Icon: IconChain, step: '03', title: 'Immutable Settlement', desc: 'Decentralized purchase execution via smart contracts ensures non-custodial and transparent settlement.', color: '#3dbc6a', light: '#e0f5e9' },
            ].map(f => (
              <div
                key={f.title}
                style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', cursor: 'default', transition: 'transform 0.25s ease, box-shadow 0.25s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 48px rgba(45,80,22,0.14)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ background: '#fff', border: `1px solid #e4eede`, borderRadius: '20px', padding: '36px 32px 32px', height: '100%', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
                    <div style={{ width: '56px', height: '56px', background: f.light, border: `1.5px solid ${f.color}28`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color }}>
                      <f.Icon />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: f.color, opacity: 0.3, letterSpacing: '-0.5px' }}>{f.step}</span>
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#1C2B1C', marginBottom: '12px', letterSpacing: '-0.3px' }}>{f.title}</h3>
                  <p style={{ fontSize: '14px', color: '#5a7a5e', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="marketplace" style={{ padding: '104px 32px', background: '#fff', position: 'relative', overflow: 'hidden' }}>
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
            {isAuthenticated ? (
              <Link to={dashboardPath}>
                <button className="cu-btn-primary cu-btn-lg">Go to Dashboard <IconArrow /></button>
              </Link>
            ) : (
              <>
                <Link to="/marketplace">
                  <button className="cu-btn-primary cu-btn-lg">Explore Active Projects <IconArrow /></button>
                </Link>
                <Link to="/auth">
                  <button className="cu-btn-secondary">Sign In to Purchase</button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .cu-btn-primary {
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
          font-family: "DM Sans", sans-serif;
          letter-spacing: -0.2px;
          box-shadow: 0 4px 16px rgba(45,80,22,0.25);
        }
        .cu-btn-primary:hover {
          background: #1a3a0d;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(45,80,22,0.35);
        }
        .cu-btn-primary.cu-btn-lg {
          padding: 16px 36px;
          font-size: 16px;
          border-radius: 14px;
        }

        .cu-btn-secondary {
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
          font-family: "DM Sans", sans-serif;
          letter-spacing: -0.2px;
        }
        .cu-btn-secondary:hover {
          background: #f0f7ec;
          border-color: #2d5016;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .cu-info-box { width: 180px !important; padding: 12px !important; }
        }
        @media (max-width: 1024px) {
          .cu-info-box { width: 240px !important; padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}