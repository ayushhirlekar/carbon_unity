export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-surface-800 mb-2">{title}</h3>
      {description && <p className="text-sm text-surface-500 max-w-sm mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
