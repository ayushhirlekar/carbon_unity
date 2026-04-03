export default function ErrorAlert({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 animate-slide-down">
      <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <div className="flex-1">
        <p className="text-sm text-red-700">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-red-600 hover:text-red-800 shrink-0">
          Retry
        </button>
      )}
    </div>
  );
}
