export default function Skeleton({ className = '', variant = 'rect' }) {
  const baseClasses = 'shimmer-bg rounded-lg';
  const variantClasses = {
    rect: '',
    circle: 'rounded-full',
    text: 'h-4 rounded',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant] || ''} ${className}`}
      aria-hidden="true"
    />
  );
}
