import { LISTING_STATUS } from '../../config/constants';

const styles = {
  [LISTING_STATUS.ACTIVE]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [LISTING_STATUS.SOLD]: 'bg-blue-50 text-blue-700 border-blue-200',
  [LISTING_STATUS.CANCELLED]: 'bg-surface-100 text-surface-500 border-surface-200',
};

const dots = {
  [LISTING_STATUS.ACTIVE]: 'bg-emerald-500',
  [LISTING_STATUS.SOLD]: 'bg-blue-500',
  [LISTING_STATUS.CANCELLED]: 'bg-surface-400',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.active}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || dots.active}`} />
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}
