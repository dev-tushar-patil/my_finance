import { cx } from '../../utils/format';

export default function Logo({ light = false, compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cx('h-10 w-10 rounded-full grid place-items-center shrink-0', light ? 'bg-white/15 ring-1 ring-white/25' : 'bg-gradient-to-br from-primary-500 to-primary-800')}>
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path d="M7 24c2-8 8-14 18-16-1 9-8 15-18 16z" fill={light ? '#C5F0D0' : '#fff'} />
          <path d="M8.5 23c4-4 8-7.5 13.5-11" stroke={light ? '#4A2591' : '#673AB7'} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className={cx('font-bold text-[17px]', light ? 'text-white' : 'text-navy')}>My Finance</p>
          <p className={cx('text-xs', light ? 'text-white/65' : 'text-navy-muted')}>Expense Tracker</p>
        </div>
      )}
    </div>
  );
}
