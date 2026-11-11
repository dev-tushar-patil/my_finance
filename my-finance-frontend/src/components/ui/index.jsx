import { Loader2, Inbox } from 'lucide-react';
import { cx } from '../../utils/format';
import { getIcon, tintFor } from '../../utils/icons';
import Modal from './Modal';

export function Field({ label, required, error, hint, children, className }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}{required && <span className="text-expense"> *</span>}</label>}
      {children}
      {error ? <p className="text-xs text-expense mt-1.5">{error}</p> : hint && <p className="text-xs text-navy-muted mt-1.5">{hint}</p>}
    </div>
  );
}

export function TextInput({ error, className, ...props }) {
  return <input {...props} className={cx('field', error && 'field-error', className)} />;
}

export function TextArea({ error, className, ...props }) {
  return <textarea {...props} className={cx('field h-auto py-3 min-h-[84px] resize-none', error && 'field-error', className)} />;
}

export function AmountInput({ value, onChange, error, autoFocus, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-navy-light">₹</span>
      <input type="number" inputMode="decimal" min="0" step="0.01" autoFocus={autoFocus} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder="0" {...props}
        className={cx('field pl-9 text-lg font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none', error && 'field-error')} />
    </div>
  );
}

export function Segmented({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cx('flex p-1 bg-white border border-slate-200/80 rounded-xl gap-1 overflow-x-auto no-scrollbar', className)} role="tablist">
      {options.map((o) => {
        const Icon = o.icon;
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.value)}
            className={cx('flex-1 whitespace-nowrap inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-3 text-sm',
              on ? 'bg-primary-600 text-white shadow-sm' : 'text-navy-light hover:bg-lavender')}>
            {Icon && <Icon size={15} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Spinner({ className, size = 22 }) {
  return <Loader2 size={size} className={cx('animate-spin text-primary-500', className)} />;
}

export function LoadingBlock({ className = 'h-40' }) {
  return <div className={cx('grid place-items-center', className)}><Spinner /></div>;
}

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded-xl bg-slate-100', className)} />;
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="h-14 w-14 rounded-2xl bg-lavender text-primary-500 grid place-items-center mb-3"><Icon size={26} /></div>
      <p className="font-semibold text-navy">{title}</p>
      {message && <p className="text-sm text-navy-muted mt-1 max-w-xs">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CategoryIcon({ iconKey, id, size = 'md', className }) {
  const Icon = getIcon(iconKey);
  const { bg, fg } = tintFor(id);
  const dim = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-12 w-12 rounded-2xl' }[size];
  return (
    <span className={cx('grid place-items-center shrink-0', dim, className)} style={{ background: bg, color: fg }}>
      <Icon size={size === 'sm' ? 16 : size === 'lg' ? 22 : 19} />
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start md:items-center justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-sm text-navy-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={(
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} disabled={busy} onClick={onConfirm}>
            {busy && <Spinner size={16} className="text-white" />}{confirmLabel}
          </button>
        </>
      )}>
      <p className="text-sm text-navy-light">{message}</p>
    </Modal>
  );
}

export function SectionCard({ title, action, children, className, bodyClass = 'p-4 md:p-5' }) {
  return (
    <section className={cx('card', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 md:px-5 pt-4 md:pt-5">
          <h2 className="font-bold text-navy">{title}</h2>
          {action}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export { Modal };
