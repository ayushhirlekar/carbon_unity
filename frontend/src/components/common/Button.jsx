const variants = {
  primary:
    'bg-[#639922] hover:bg-[#2d5016] text-white shadow-md focus:ring-[#639922]',
  secondary:
    'bg-[#1a1a2e] hover:bg-white/10 text-white border border-white/10 focus:ring-[#639922]',
  gold: 'bg-[#c9a961] hover:bg-[#b59550] text-[#0f0f1a] shadow-md focus:ring-[#c9a961]',
  danger: 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-400',
  ghost: 'bg-transparent hover:bg-white/5 text-gray-400 hover:text-white focus:ring-[#639922]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
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
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f0f1a]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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
