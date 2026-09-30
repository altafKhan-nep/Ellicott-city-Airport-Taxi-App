export function Input({ label, icon, error, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-accent-400">
            {icon}
          </span>
        )}
        <input
          className={`input-pill w-full border bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-accent-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 ${
            icon ? 'pl-10' : ''
          } ${error ? 'border-signal-400' : 'border-accent-300'}`}
          {...props}
        />
      </div>
      {error && <span className="mt-1 block text-xs text-signal-600">{error}</span>}
    </label>
  );
}