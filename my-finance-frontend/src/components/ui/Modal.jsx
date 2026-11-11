import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../utils/format';

/** Small elegant modal: centred card on desktop, bottom sheet on mobile. */
export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', icon: Icon }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'md:max-w-sm', md: 'md:max-w-md', lg: 'md:max-w-2xl' }[size];

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-[2px] animate-[fade-up_.2s_ease-out]" onClick={onClose} />
      <div className={cx('relative w-full bg-white rounded-t-3xl md:rounded-2xl shadow-pop max-h-[92vh] flex flex-col animate-slide-up md:animate-scale-in', width)}>
        <div className="md:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200" />
        <div className="flex items-start gap-3 px-5 pt-4 md:pt-5 pb-3">
          {Icon && <div className="h-10 w-10 rounded-xl bg-lavender text-primary-600 grid place-items-center shrink-0"><Icon size={20} /></div>}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-navy leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-navy-muted mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 -mr-1 grid place-items-center rounded-full hover:bg-slate-100 text-navy-muted" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-5 pb-4 overflow-y-auto scrollbar-thin">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 flex gap-2 justify-end pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
