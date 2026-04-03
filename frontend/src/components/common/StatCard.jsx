export default function StatCard({ icon, label, value, sub, trend, className = '' }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-surface-200 p-5 shadow-card hover:shadow-card-hover transition-all duration-300 ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
          {icon || (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          )}
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-surface-900 mb-1">{value}</p>
      <p className="text-sm text-surface-500">{label}</p>
      {sub && <p className="text-xs text-surface-400 mt-1">{sub}</p>}
    </div>
  );
}
