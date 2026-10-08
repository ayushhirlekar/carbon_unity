export default function Card({ children, className = '', hover = false, id }) {
  return (
    <div
      id={id}
      className={`
        bg-white rounded-2xl border border-surface-200/80
        shadow-card
        ${hover ? 'hover:shadow-card-hover hover:-translate-y-0.5 hover:border-brand-300/60 transition-all duration-300' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4.5 border-b border-surface-100 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-surface-100 bg-surface-50/70 rounded-b-2xl ${className}`}>
      {children}
    </div>
  );
}
