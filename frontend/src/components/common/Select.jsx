export default function Select({ label, id, value, onChange, options, placeholder, error, required = false, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-surface-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        className={`
          w-full px-4 py-2.5 rounded-xl border bg-white text-surface-900 text-sm
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400
          ${error ? 'border-red-400' : 'border-surface-300 hover:border-surface-400'}
        `}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
