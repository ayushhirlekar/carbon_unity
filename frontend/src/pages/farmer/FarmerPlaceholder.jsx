export default function FarmerPlaceholder({ title, body }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans animate-fade-in py-8">
      <h1 className="text-2xl font-extrabold text-surface-950 tracking-tight">{title}</h1>
      <div className="bg-white rounded-3xl border border-surface-200 p-12 text-center shadow-card">
        <div className="w-14 h-14 rounded-2xl bg-surface-100 text-surface-500 flex items-center justify-center mx-auto mb-3 shadow-subtle">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.32l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.32 4.486c.118.58.094 1.193-.07 1.742" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-surface-900 mb-1">Module In Development</h2>
        <p className="text-xs text-surface-500 max-w-sm mx-auto leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
