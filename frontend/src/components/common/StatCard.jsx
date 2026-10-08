export default function StatCard({ icon, label, value, sub, trend, className = '' }) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-surface-200/80 p-5
        shadow-card hover:shadow-card-hover hover:-translate-y-0.5 hover:border-brand-300/60
        transition-all duration-300 group ${className}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100/70 text-brand-700 flex items-center justify-center border border-brand-200/60 shadow-subtle group-hover:scale-105 transition-transform duration-200">
          {icon || (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          )}
        </div>
        {trend !== undefined && trend !== null && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              Number(trend) >= 0
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/70'
                : 'text-rose-700 bg-rose-50 border border-rose-200/70'
            }`}
          >
            <span>{Number(trend) >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(Number(trend))}%</span>
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-surface-900 tracking-tight mb-1">{value}</p>
      <p className="text-xs font-medium uppercase tracking-wider text-surface-500">{label}</p>
      {sub && <p className="text-xs text-brand-700/80 mt-1 font-medium">{sub}</p>}
    </div>
  );
}
