import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronRight, PieChart as PieIcon, Table2 } from 'lucide-react';
import { SectionCard, EmptyState, LoadingBlock } from '../ui';
import { MoneyTooltip } from './ChartParts';
import useAsync from '../../hooks/useAsync';
import { dashboardService } from '../../services/financeService';
import { useCategories } from '../../context/CategoryContext';
import { foldOther } from '../../utils/constants';
import { formatINR, cx } from '../../utils/format';

const NEXT = { category: 'subcategory', subcategory: 'item' };
const PARAM = { category: 'categoryId', subcategory: 'subcategoryId', item: 'itemId' };

/**
 * Expense by Main Type → Subtype → Item, entirely from the aggregation API (no hardcoded categories).
 * Clicking an item opens the matching transactions.
 */
export default function CategoryDrilldown({ from, to, title = 'Expense by Category', className }) {
  const navigate = useNavigate();
  const { version } = useCategories();
  const [path, setPath] = useState([{ level: 'category', label: 'All' }]);
  const [asTable, setAsTable] = useState(false);
  const [hover, setHover] = useState(null);
  const current = path[path.length - 1];

  const { data, loading } = useAsync(
    () => dashboardService.categorySummary({ from, to, type: 'EXPENSE', level: current.level, parentId: current.parentId }),
    [from, to, current.level, current.parentId, version],
  );
  const rows = useMemo(() => foldOther(data?.rows || []), [data]);

  const drill = (row) => {
    if (row.folded || row.id == null) return;
    const scope = { from, to, [PARAM[current.level]]: row.id };
    if (current.level === 'item') {
      navigate(`/transactions?${new URLSearchParams({ ...scope, type: 'EXPENSE', label: [...path.slice(1).map((p) => p.label), row.label].join(' › ') })}`);
      return;
    }
    setPath((p) => [...p, { level: NEXT[current.level], parentId: row.id, label: row.label }]);
  };

  const levelName = { category: 'main type', subcategory: 'subtype', item: 'item' }[current.level];

  return (
    <SectionCard className={className} title={title}
      action={(
        <button type="button" onClick={() => setAsTable((v) => !v)} className="text-xs text-primary-600 font-semibold inline-flex items-center gap-1" aria-label="Toggle table view">
          {asTable ? <PieIcon size={14} /> : <Table2 size={14} />}{asTable ? 'Chart' : 'Table'}
        </button>
      )}>
      <nav className="flex items-center flex-wrap gap-1 text-xs mb-3 -mt-1">
        {path.map((p, i) => (
          <span key={`${p.level}-${p.parentId ?? 'root'}`} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="text-navy-muted" />}
            <button type="button" disabled={i === path.length - 1} onClick={() => setPath(path.slice(0, i + 1))}
              className={cx('px-2 py-0.5 rounded-md', i === path.length - 1 ? 'bg-lavender text-primary-700 font-semibold' : 'text-navy-muted hover:text-primary-600')}>
              {p.label}
            </button>
          </span>
        ))}
      </nav>

      {loading && !data ? <LoadingBlock className="h-56" /> : !rows.length ? (
        <EmptyState icon={PieIcon} title="No expenses in this period" />
      ) : asTable ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-navy-muted"><th className="py-1.5 font-medium">Name</th><th className="font-medium text-right">Txns</th><th className="font-medium text-right">Amount</th><th className="font-medium text-right">%</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} onClick={() => drill(r)} className={cx('border-t border-slate-100', !r.folded && 'cursor-pointer hover:bg-slate-50')}>
                <td className="py-2"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />{r.label}</span></td>
                <td className="text-right text-navy-muted">{r.count}</td><td className="text-right font-semibold">{formatINR(r.amount)}</td><td className="text-right text-navy-muted">{r.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="grid sm:grid-cols-[180px_1fr] gap-4 items-center">
          <div className="relative h-[180px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={rows} dataKey="amount" nameKey="label" innerRadius="66%" outerRadius="100%" paddingAngle={1.5} stroke="#fff" strokeWidth={2}
                  onClick={(_, i) => drill(rows[i])} onMouseEnter={(_, i) => setHover(i)} onMouseLeave={() => setHover(null)} cornerRadius={4}>
                  {rows.map((r, i) => <Cell key={r.key} fill={r.color} opacity={hover == null || hover === i ? 1 : 0.45} className={r.folded ? '' : 'cursor-pointer outline-none'} />)}
                </Pie>
                <Tooltip content={<MoneyTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
              <div><p className="text-lg font-bold">{formatINR(data.total)}</p><p className="text-[11px] text-navy-muted">Total {current.level === 'category' ? 'expense' : current.label}</p></div>
            </div>
          </div>
          <ul className="space-y-1">
            {rows.map((r, i) => (
              <li key={r.key}>
                <button type="button" onClick={() => drill(r)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} disabled={r.folded}
                  className={cx('w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg text-left', !r.folded && 'hover:bg-slate-50', hover === i && 'bg-slate-50')}>
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: r.color }} />
                  <span className="flex-1 truncate text-navy-light">{r.label}</span>
                  <span className="font-semibold text-navy">{formatINR(r.amount)}</span>
                  <span className="w-11 text-right text-xs text-navy-muted">{r.percent}%</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {rows.length > 0 && <p className="text-[11px] text-navy-muted mt-3">Tap a {levelName} to {current.level === 'item' ? 'see its transactions' : 'drill down'}.</p>}
    </SectionCard>
  );
}
