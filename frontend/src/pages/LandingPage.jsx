import { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/layout/Footer';
import Button from '../components/common/Button';

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
const IconShield = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconLeaf = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

const IconChain = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconGlobe = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_FRAMES = 68;
const NAV_HEIGHT = 64;

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

// ── Modern Floating HUD Info Box Component ────────────────────────────────────
const InfoBox = ({ id, title, subtitle, desc, style, boxRef }) => (
  <div
    id={id}
    ref={boxRef}
    className="fixed z-30 w-72 sm:w-80 p-5 rounded-2xl bg-surface-950/85 backdrop-blur-xl border border-emerald-500/30 text-white shadow-2xl transition-all duration-500 pointer-events-none"
    style={{
      opacity: 0,
      display: 'none',
      ...style,
    }}
  >
    <div className="flex items-center gap-2 mb-1.5">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">{subtitle}</span>
    </div>
    <h3 className="text-lg font-bold tracking-tight text-white mb-2">{title}</h3>
    <p className="text-xs text-surface-300 leading-relaxed m-0">{desc}</p>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'farmer' ? '/farmer' : '/buyer';

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

    const inZone = progress > 0 && progress < 1;
    const display = inZone ? 'block' : 'none';
    [box1Ref, box2Ref, box3Ref, box4Ref].forEach((ref) => {
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
    onScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 font-sans selection:bg-brand-500/20">

      {/* ── SCROLL-CONTROLLED ANIMATION HERO ── */}
      <div
        id="how-it-works"
        ref={scrollWrapperRef}
        className="relative"
        style={{ height: '480vh' }}
      >
        <div className="sticky top-0 w-full h-screen overflow-hidden bg-surface-950">
          <div className="w-full h-full relative flex items-center justify-center">
            <img
              ref={animImgRef}
              src="/carbonunity-frames/frame_001.jpg"
              alt="CarbonUnity MRV Engine Visualizer"
              className="w-full h-full object-cover absolute inset-0 filter brightness-95"
            />
            {/* Ambient vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-950/80 via-transparent to-surface-950/40 pointer-events-none" />

            {/* Scroll Indicator Prompt */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-white/80 pointer-events-none">
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold animate-pulse">
                Scroll to explore MRV protocol
              </span>
              <div className="w-5 h-8 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
                <div className="w-1 h-2 rounded-full bg-emerald-400 animate-slide-down" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FLOATING HUD BOXES (Viewport Positioned) ── */}
      <InfoBox
        id="box-1"
        boxRef={box1Ref}
        title="Decentralized MRV"
        subtitle="Step 01 • Satellite Sensing"
        desc="Sentinel-2 multispectral imagery measures vegetation index (NDVI) and biomass changes on agricultural parcels."
        style={{
          left: '24px',
          top: `calc(${NAV_HEIGHT}px + 45vh)`,
          transform: 'translateY(-50%)',
        }}
      />
      <InfoBox
        id="box-2"
        boxRef={box2Ref}
        title="Verified Soil Carbon"
        subtitle="Step 02 • Lab Ground-Truth"
        desc="Integrates government Soil Health Card baselines (SOC, bulk density, depth) into physical carbon stock math."
        style={{
          right: '24px',
          top: `calc(${NAV_HEIGHT}px + 45vh)`,
          transform: 'translateY(-50%)',
        }}
      />
      <InfoBox
        id="box-3"
        boxRef={box3Ref}
        title="Idempotent Minting"
        subtitle="Step 03 • Blockchain Protocol"
        desc="Deterministic smart contracts prevent double-minting and establish immutable audit trails on Sepolia."
        style={{
          left: '24px',
          top: '50vh',
          transform: 'translateY(-50%)',
        }}
      />
      <InfoBox
        id="box-4"
        boxRef={box4Ref}
        title="Direct Payouts"
        subtitle="Step 04 • Transparent Settlement"
        desc="Buyers purchase verified credits non-custodially, routing funds directly to smallholder farmers."
        style={{
          right: '24px',
          top: '50vh',
          transform: 'translateY(-50%)',
        }}
      />

      {/* ── IMPACT PROOF STRIP ── */}
      <section className="bg-white border-y border-surface-200/90 shadow-subtle py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Blockchain Network', val: 'Sepolia Testnet', badge: 'Active Contract' },
              { label: 'MRV Methodology', val: 'SOC & Bulk Density', badge: 'Scientific Depth' },
              { label: 'Settlement Speed', val: 'Instant On-Chain', badge: 'Non-Custodial' },
              { label: 'Verification Standard', val: 'Audit-Enforced', badge: 'Deterministic' },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-surface-50 border border-surface-200/70">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-mono uppercase text-brand-700 font-semibold tracking-wider">
                    {stat.badge}
                  </span>
                </div>
                <p className="text-xl font-bold text-surface-900 tracking-tight">{stat.val}</p>
                <p className="text-xs text-surface-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENTO-GRID ARCHITECTURE SHOWCASE ── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/80 text-brand-800 text-xs font-bold uppercase tracking-wider mb-3">
            System Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-surface-950 tracking-tight">
            Institutional Trust & Verification Model
          </h2>
          <p className="text-surface-600 mt-3 text-base leading-relaxed">
            Pairing verifiable offline soil sample science with automated blockchain settlement guarantees transparent, high-integrity carbon credits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-white border border-surface-200 shadow-card hover:shadow-card-hover transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 border border-brand-200/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
              <IconShield />
            </div>
            <span className="text-xs font-mono font-bold text-brand-600">PILLAR 01</span>
            <h3 className="text-xl font-bold text-surface-900 tracking-tight mt-1 mb-2">Offline Audit Gating</h3>
            <p className="text-sm text-surface-600 leading-relaxed">
              Every project undergoes verification of land ownership and farmer identity before on-chain registration to prevent phantom credit issuance.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-white border border-surface-200 shadow-card hover:shadow-card-hover transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
              <IconLeaf />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600">PILLAR 02</span>
            <h3 className="text-xl font-bold text-surface-900 tracking-tight mt-1 mb-2">Scientific Soil Formulas</h3>
            <p className="text-sm text-surface-600 leading-relaxed">
              Calculates carbon credits from verified Soil Health Cards using Soil Organic Carbon (SOC %), bulk density, and depth stratification.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-white border border-surface-200 shadow-card hover:shadow-card-hover transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
              <IconChain />
            </div>
            <span className="text-xs font-mono font-bold text-sky-600">PILLAR 03</span>
            <h3 className="text-xl font-bold text-surface-900 tracking-tight mt-1 mb-2">Non-Custodial Settlement</h3>
            <p className="text-sm text-surface-600 leading-relaxed">
              Smart contracts handle peer-to-peer cryptocurrency purchases, executing trustless atomic retirement and instant receipts.
            </p>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-12 sm:p-16 rounded-3xl bg-gradient-to-b from-surface-900 to-surface-950 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-brand-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-emerald-400 text-xs font-semibold mb-6">
              <IconGlobe />
              <span>Decentralized Climate Capital</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
              Accelerate Global Carbon Sequestration
            </h2>
            <p className="text-surface-300 text-base sm:text-lg mb-8 leading-relaxed">
              Whether you are an institution offsetting emissions or a farmer generating high-permanence credits, CarbonUnity provides the verified protocol.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link to={dashboardPath}>
                  <Button variant="primary" size="lg" className="px-8 shadow-glow-brand">
                    <span>Open Dashboard</span>
                    <IconArrow />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/marketplace">
                    <Button variant="primary" size="lg" className="px-8 shadow-glow-brand">
                      <span>Explore Verified Credits</span>
                      <IconArrow />
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="secondary" size="lg" className="px-8 bg-surface-800 text-white border-surface-700 hover:bg-surface-700">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}