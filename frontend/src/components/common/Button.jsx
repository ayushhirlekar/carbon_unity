const variants = {
  primary:
    'bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 hover:from-brand-900 hover:via-brand-800 hover:to-brand-700 text-white shadow-sm hover:shadow-glow-brand focus:ring-brand-500 border border-brand-500/30',
  secondary:
    'bg-white hover:bg-surface-50 text-surface-800 border border-surface-200 shadow-subtle hover:border-surface-300 focus:ring-brand-500',
  gold:
    'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm focus:ring-amber-500',
  outline:
    'bg-transparent hover:bg-brand-50 text-brand-700 border border-brand-300 hover:border-brand-500 focus:ring-brand-500',
  danger:
    'bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-red-500',
  ghost:
    'bg-transparent hover:bg-surface-100 text-surface-600 hover:text-surface-900 focus:ring-brand-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg font-medium tracking-tight',
  md: 'px-4 py-2 text-sm rounded-xl font-semibold',
  lg: 'px-6 py-3 text-base rounded-xl font-semibold',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  id,
}) {
  return (
    <button
      id={id}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2
        transition-all duration-150 ease-out active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100
        ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
