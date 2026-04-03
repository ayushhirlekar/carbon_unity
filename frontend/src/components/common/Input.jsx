export default function Input({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  step,
  min,
  max,
  className = '',
  hint,
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-surface-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        step={step}
        min={min}
        max={max}
        className={`
          w-full px-4 py-2.5 rounded-xl border bg-white text-surface-900 text-sm
          placeholder:text-surface-400
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400
          disabled:bg-surface-100 disabled:text-surface-400 disabled:cursor-not-allowed
          ${error ? 'border-red-400 focus:ring-red-400/50' : 'border-surface-300 hover:border-surface-400'}
        `}
      />
      {hint && !error && <p className="text-xs text-surface-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
