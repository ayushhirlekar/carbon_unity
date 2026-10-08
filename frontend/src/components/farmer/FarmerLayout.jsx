import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { setLanguage, LANGUAGES } from '../../i18n';

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
    <path d={d} />
  </svg>
);

const LeafIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 4-8 4s5-1 5 4c0 0-2-1-5-1 1 0-4 1-4 6 0 0-1-3-3-4 0 0 1 5 5 5 0 0-3 2-7 0 1.17 2.52 3.1 4.23 6 4.65C19.85 18.2 21 12 17 8z"/>
  </svg>
);

const TABS = [
  { to: '/farmer', end: true, labelKey: 'nav.home',
    d: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5' },
  { to: '/farmer/parcels', labelKey: 'nav.field',
    d: 'M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13' },
  { to: '/farmer/assistant', labelKey: 'nav.ask',
    d: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 20l1.3-4.2A8.4 8.4 0 1 1 21 11.5z' },
  { to: '/farmer/project', labelKey: 'nav.project',
    d: 'M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8' },
  { to: '/farmer/alerts', labelKey: 'nav.alerts',
    d: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0' },
];

export default function FarmerLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 h-16 glass-nav border-b border-surface-200/90 shadow-subtle">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-full flex items-center justify-between gap-4">

          <div className="flex items-center gap-6 min-w-0">
            {/* Brand Logo */}
            <div className="flex items-center shrink-0">
              <span className="text-lg font-black tracking-tight text-surface-900 font-display">
                CARBON<span className="text-brand-600 font-extrabold">UNITY</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {TABS.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-brand-50 text-brand-900 shadow-subtle border border-brand-200/70'
                        : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100/70'
                    }`
                  }
                >
                  {t(tab.labelKey)}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right section: Farmer ID code, language switch, logout */}
          <div className="flex items-center gap-2.5 shrink-0">
            {user?.farmer_code && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono font-medium tracking-wide
                           text-brand-800 bg-brand-50 border border-brand-200/80 rounded-full px-3 py-1 shadow-subtle"
                title="Share this code to join a carbon project"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {user.farmer_code}
              </span>
            )}

            {/* Language Switcher */}
            <div className="relative">
              <select
                value={i18n.language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Language"
                className="text-xs font-semibold border border-surface-200/90 rounded-xl px-2.5 py-1.5 bg-white text-surface-700 hover:border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-subtle cursor-pointer transition-all"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-surface-500 hover:text-rose-600 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content (with bottom padding for mobile dock) */}
      <main className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-6 pb-28 md:pb-12 flex-1 animate-fade-in">
        <Outlet />
      </main>

      {/* Mobile Floating Bottom Dock */}
      <nav
        className="md:hidden fixed bottom-3 inset-x-3 z-40 bg-white/95 backdrop-blur-xl
                   border border-surface-200/90 rounded-2xl shadow-lg grid grid-cols-5 p-1.5"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-900 font-bold shadow-subtle'
                  : 'text-surface-500 hover:text-surface-900 active:scale-95'
              }`
            }
          >
            <Icon d={tab.d} />
            <span className="text-[10px] tracking-tight leading-none">{t(tab.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
