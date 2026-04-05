import { Link } from 'react-router-dom';

const LeafIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);

const BlockchainIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

export default function Footer() {
  return (
    <footer style={{
      background: '#2d5016',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '40px 0 24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '32px' }}>
          {/* Brand */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '8px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '7px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}>
                <LeafIcon />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                Carbon<span style={{ color: '#a3d46f' }}>Unity</span>
              </span>
            </Link>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>v2.0 Admin-Managed Release</p>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { to: '/marketplace', label: 'Marketplace' },
              { to: '/auth', label: 'Sign In' },
              { href: '#', label: 'Terms' },
              { href: '#', label: 'Privacy' },
            ].map((item) =>
              item.to ? (
                <Link key={item.label} to={item.to} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.65)'}
                >
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.href} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.65)'}
                >
                  {item.label}
                </a>
              )
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            © {new Date().getFullYear()} CarbonUnity. All rights reserved.
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex' }}><BlockchainIcon /></span>
            Built on <span style={{ color: 'rgba(255,255,255,0.7)', marginLeft: '4px', fontWeight: 500 }}>Sepolia Testnet</span>
          </p>
        </div>
      </div>
    </footer>
  );
}