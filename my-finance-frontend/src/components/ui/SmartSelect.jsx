import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus, Search, Loader2, Lock } from 'lucide-react';
import { cx } from '../../utils/format';
import useMediaQuery from '../../hooks/useMediaQuery';

/**
 * Dropdown with optional search and a pinned "+ Add New …" action at the bottom.
 *
 * options: [{ value, label, hint?, icon?: ReactNode }]
 */
export default function SmartSelect({
  label, value, options = [], onChange, placeholder = 'Select', disabled = false, disabledHint,
  loading = false, error, onAddNew, addNewLabel = 'Add new', required = false, icon, id, searchThreshold = 7,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const selected = options.find((o) => String(o.value) === String(value));
  const searchable = options.length > searchThreshold;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const totalRows = filtered.length + (onAddNew ? 1 : 0);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActive(Math.max(0, options.findIndex((o) => String(o.value) === String(value))));
    const onDoc = (e) => {
      if (isDesktop && rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    if (searchable) setTimeout(() => searchRef.current?.focus(), 30);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (o) => { onChange?.(o.value, o); setOpen(false); };
  const addNew = () => { setOpen(false); onAddNew?.(query.trim()); };

  const onKeyDown = (e) => {
    if (!open && ['ArrowDown', 'Enter', ' '].includes(e.key) && e.target.tagName === 'BUTTON') { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, totalRows - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (active < filtered.length) choose(filtered[active]); else if (onAddNew) addNew();
    }
  };

  const list = (
    <>
      {searchable && (
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-muted" />
            <input ref={searchRef} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKeyDown}
              placeholder="Search…" className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary-100" />
          </div>
        </div>
      )}
      <ul ref={listRef} role="listbox" className="max-h-64 md:max-h-60 overflow-y-auto scrollbar-thin py-1">
        {filtered.length === 0 && <li className="px-4 py-6 text-center text-sm text-navy-muted">{query ? `No match for “${query}”` : 'Nothing here yet'}</li>}
        {filtered.map((o, idx) => {
          const isSel = String(o.value) === String(value);
          return (
            <li key={o.value} data-idx={idx} role="option" aria-selected={isSel}
              onMouseEnter={() => setActive(idx)} onClick={() => choose(o)}
              className={cx('mx-1 px-3 py-2.5 md:py-2 rounded-lg flex items-center gap-3 cursor-pointer text-sm', active === idx ? 'bg-lavender' : '', isSel && 'font-semibold text-primary-700')}>
              {o.icon && <span className="shrink-0">{o.icon}</span>}
              <span className="flex-1 min-w-0">
                <span className="block truncate">{o.label}</span>
                {o.hint && <span className="block text-xs text-navy-muted truncate font-normal">{o.hint}</span>}
              </span>
              {isSel && <Check size={16} className="text-primary-600 shrink-0" />}
            </li>
          );
        })}
      </ul>
      {onAddNew && (
        <button type="button" data-idx={filtered.length} onMouseEnter={() => setActive(filtered.length)} onClick={addNew}
          className={cx('w-full flex items-center gap-2 px-4 py-3 border-t border-slate-100 text-sm font-semibold text-primary-600 rounded-b-xl', active === filtered.length ? 'bg-lavender' : 'hover:bg-lavender')}>
          <span className="h-6 w-6 rounded-md bg-primary-600 text-white grid place-items-center"><Plus size={14} /></span>
          {addNewLabel}{query && <span className="font-normal text-navy-muted truncate">“{query}”</span>}
        </button>
      )}
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      {label && <label htmlFor={id} className="label">{label}{required && <span className="text-expense"> *</span>}</label>}
      <button id={id} type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} onKeyDown={onKeyDown}
        aria-haspopup="listbox" aria-expanded={open}
        className={cx('field flex items-center gap-3 text-left', error && 'field-error', open && 'border-primary-500 ring-4 ring-primary-100')}>
        {disabled ? <Lock size={16} className="text-navy-muted shrink-0" /> : (selected?.icon || icon) && <span className="shrink-0">{selected?.icon || icon}</span>}
        <span className={cx('flex-1 truncate', !selected && 'text-navy-muted')}>
          {disabled && disabledHint ? disabledHint : selected?.label || placeholder}
        </span>
        {loading ? <Loader2 size={18} className="animate-spin text-primary-500" /> : <ChevronDown size={18} className={cx('text-navy-muted transition', open && 'rotate-180')} />}
      </button>
      {error && <p className="text-xs text-expense mt-1.5">{error}</p>}

      {open && isDesktop && (
        <div className="absolute z-40 mt-2 w-full bg-white rounded-xl shadow-pop border border-slate-100 animate-scale-in origin-top">{list}</div>
      )}
      {open && !isDesktop && createPortal(
        <div className="fixed inset-0 z-[90] flex items-end">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setOpen(false)} />
          <div className="relative w-full bg-white rounded-t-3xl shadow-pop animate-slide-up pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200" />
            <p className="px-5 pt-3 pb-2 font-bold text-navy">{label || placeholder}</p>
            {list}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
