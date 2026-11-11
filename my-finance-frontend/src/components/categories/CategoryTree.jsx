import { ChevronRight, Plus, Pencil, Power, RotateCcw } from 'lucide-react';
import { CategoryIcon } from '../ui';
import { cx } from '../../utils/format';

function Highlight({ text, term }) {
  if (!term) return text;
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark className="bg-yellow-200/80 rounded px-0.5">{text.slice(i, i + term.length)}</mark>{text.slice(i + term.length)}</>;
}

function IconBtn({ title, onClick, children, tone = 'default' }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cx('h-8 w-8 grid place-items-center rounded-lg transition shrink-0',
        tone === 'danger' ? 'text-navy-muted hover:text-expense hover:bg-expense-soft'
          : tone === 'success' ? 'text-income hover:bg-income-soft' : 'text-navy-muted hover:text-primary-600 hover:bg-lavender')}>
      {children}
    </button>
  );
}

function Actions({ node, level, onAction, canAdd }) {
  return (
    <div className="flex items-center gap-0.5">
      {canAdd && node.active && <IconBtn title={level === 'main' ? 'Add subtype' : 'Add item'} onClick={() => onAction('add', level, node)}><Plus size={16} /></IconBtn>}
      <IconBtn title="Edit" onClick={() => onAction('edit', level, node)}><Pencil size={15} /></IconBtn>
      {node.active
        ? <IconBtn title="Deactivate" tone="danger" onClick={() => onAction('deactivate', level, node)}><Power size={15} /></IconBtn>
        : <IconBtn title="Reactivate" tone="success" onClick={() => onAction('activate', level, node)}><RotateCcw size={15} /></IconBtn>}
    </div>
  );
}

const Inactive = () => <span className="chip bg-slate-100 text-navy-muted ml-2">Inactive</span>;
const Used = ({ n }) => (n ? <span className="text-[11px] text-navy-muted ml-2 hidden sm:inline">{n} txn{n > 1 ? 's' : ''}</span> : null);

/**
 * Expandable MAIN TYPE → SUBTYPE → ITEM tree.
 * expanded: Set of keys like "c12" / "s40"
 */
export default function CategoryTree({ tree, expanded, onToggle, onAction, term, levels = 3 }) {
  return (
    <div className="space-y-3">
      {tree.map((c) => {
        const cOpen = expanded.has(`c${c.id}`);
        return (
          <div key={c.id} className={cx('card overflow-hidden transition', !c.active && 'opacity-60')}>
            <div className="flex items-center gap-3 p-3 md:p-4 cursor-pointer hover:bg-slate-50/70" onClick={() => onToggle(`c${c.id}`)}>
              <ChevronRight size={18} className={cx('text-navy-muted transition shrink-0', cOpen && 'rotate-90')} />
              <CategoryIcon iconKey={c.icon} id={c.id} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy flex items-center"><span className="truncate"><Highlight text={c.name} term={term} /></span>{!c.active && <Inactive />}<Used n={c.usageCount} /></p>
                <p className="text-xs text-navy-muted truncate">{c.subcategories.length ? c.subcategories.map((s) => s.name).join(', ') : c.description || 'No subtypes yet'}</p>
              </div>
              <span className="chip bg-lavender text-primary-700 hidden sm:inline-flex">{c.subcategories.length} subtypes</span>
              <Actions node={c} level="main" onAction={onAction} canAdd={levels > 1} />
            </div>

            {cOpen && levels > 1 && (
              <div className="pl-6 md:pl-10 pr-3 md:pr-4 pb-3 animate-fade-up">
                {c.subcategories.length === 0 && (
                  <button type="button" onClick={() => onAction('add', 'main', c)} className="text-sm text-primary-600 font-medium py-2 inline-flex items-center gap-1"><Plus size={15} />Add the first subtype</button>
                )}
                <ul className="border-l-2 border-lavender">
                  {c.subcategories.map((s) => {
                    const sOpen = expanded.has(`s${s.id}`);
                    return (
                      <li key={s.id} className={cx('relative', !s.active && 'opacity-60')}>
                        <span className="absolute left-0 top-6 w-4 border-t-2 border-lavender" />
                        <div className="flex items-center gap-2 pl-6 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => levels > 2 && onToggle(`s${s.id}`)}>
                          {levels > 2 && <ChevronRight size={16} className={cx('text-navy-muted transition shrink-0', sOpen && 'rotate-90')} />}
                          <p className="flex-1 min-w-0 text-sm font-medium text-navy flex items-center">
                            <span className="truncate"><Highlight text={s.name} term={term} /></span>{!s.active && <Inactive />}<Used n={s.usageCount} />
                          </p>
                          {levels > 2 && <span className="text-xs text-navy-muted">{s.items.length}</span>}
                          <Actions node={s} level="sub" onAction={onAction} canAdd={levels > 2} />
                        </div>
                        {sOpen && levels > 2 && (
                          <ul className="ml-10 border-l-2 border-dashed border-slate-200 mb-2">
                            {s.items.length === 0 && <li className="pl-5 py-1.5 text-xs text-navy-muted">No items yet</li>}
                            {s.items.map((i) => (
                              <li key={i.id} className={cx('relative flex items-center gap-2 pl-5 py-1 rounded-lg hover:bg-slate-50', !i.active && 'opacity-60')}>
                                <span className="absolute left-0 top-1/2 w-3 border-t-2 border-dashed border-slate-200" />
                                <span className="h-1.5 w-1.5 rounded-full bg-primary-300 shrink-0" />
                                <p className="flex-1 min-w-0 text-sm text-navy-light flex items-center"><span className="truncate"><Highlight text={i.name} term={term} /></span>{!i.active && <Inactive />}<Used n={i.usageCount} /></p>
                                <Actions node={i} level="item" onAction={onAction} canAdd={false} />
                              </li>
                            ))}
                            {s.active && (
                              <li className="pl-5 py-1">
                                <button type="button" onClick={() => onAction('add', 'sub', s)} className="text-xs text-primary-600 font-semibold inline-flex items-center gap-1"><Plus size={13} />Add item</button>
                              </li>
                            )}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
