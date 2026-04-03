export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} relative`}>
        <div className={`${sizes[size]} rounded-full border-2 border-surface-200`} />
        <div
          className={`${sizes[size]} rounded-full border-2 border-transparent border-t-brand-500 animate-spin absolute top-0 left-0`}
        />
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-surface-500 font-medium">Loading...</p>
    </div>
  );
}
