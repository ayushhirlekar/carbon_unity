import { LISTING_STATUS } from '../../config/constants';

const styles = {
  [LISTING_STATUS.ACTIVE]: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  [LISTING_STATUS.SOLD]: 'bg-sky-50 text-sky-800 border-sky-200/80',
  [LISTING_STATUS.CANCELLED]: 'bg-surface-100 text-surface-600 border-surface-200',
  verified: 'bg-emerald-50 text-emerald-800 border-emerald-300/80',
  pending: 'bg-amber-50 text-amber-800 border-amber-300/80',
  completed: 'bg-teal-50 text-teal-800 border-teal-300/80',
  retired: 'bg-purple-50 text-purple-800 border-purple-300/80',
};

const dots = {
  [LISTING_STATUS.ACTIVE]: 'bg-emerald-500 ring-2 ring-emerald-400/30 animate-pulse',
  [LISTING_STATUS.SOLD]: 'bg-sky-500',
  [LISTING_STATUS.CANCELLED]: 'bg-surface-400',
  verified: 'bg-emerald-500 ring-2 ring-emerald-400/30 animate-pulse',
  pending: 'bg-amber-500 ring-2 ring-amber-400/30 animate-pulse',
  completed: 'bg-teal-500',
  retired: 'bg-purple-500',
};

export default function StatusBadge({ status = 'active', className = '' }) {
  const normalized = String(status || '').toLowerCase();
  const badgeStyle = styles[normalized] || styles[status] || styles.active;
  const dotStyle = dots[normalized] || dots[status] || dots.active;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-subtle ${badgeStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`} />
      <span>{status?.charAt(0).toUpperCase() + status?.slice(1)}</span>
    </span>
  );
}
