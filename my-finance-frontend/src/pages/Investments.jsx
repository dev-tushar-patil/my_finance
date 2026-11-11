import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Plus, TrendingUp } from 'lucide-react';
import TransactionRow from '../components/transactions/TransactionRow';
import { PageHeader, SectionCard, LoadingBlock, EmptyState } from '../components/ui';
import { MoneyTooltip } from '../components/charts/ChartParts';
import useAsync from '../hooks/useAsync';
import { reportService, transactionService } from '../services/financeService';
import { foldOther } from '../utils/constants';
import { formatINR } from '../utils/format';

export default function Investments() {
  const navigate = useNavigate();
  const { data: byType } = useAsync(() => reportService.investments({ groupBy: 'category' }), []);
  const { data: byAccount } = useAsync(() => reportService.investments({ groupBy: 'account' }), []);
  const { data: byProvider } = useAsync(() => reportService.investments({ groupBy: 'provider' }), []);
  const { data: history, loading } = useAsync(() => transactionService.list({ type: 'INVESTMENT', size: 50 }), []);
  const rows = foldOther(byType?.rows || []);

  return (
    <div className="animate-fade-up space-y-4">
      <PageHeader title="Investments" subtitle="Purchases move money into assets. They are not counted as expenses."
        actions={<button type="button" className="btn-primary" onClick={() => navigate('/add?type=INVESTMENT')}><Plus size={18} /><span className="hidden sm:inline">Add Investment</span></button>} />

      <div className="grid lg:grid-cols-3 gap-4">
        <SectionCard title="Distribution" className="lg:col-span-2">
          {!byType ? <LoadingBlock /> : !rows.length ? <EmptyState icon={TrendingUp} title="No investments yet" /> : (
            <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-center">
              <div className="relative h-[200px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={rows} dataKey="amount" nameKey="label" innerRadius="65%" outerRadius="100%" stroke="#fff" strokeWidth={2} paddingAngle={1.5}>
                      {rows.map((r) => <Cell key={r.key} fill={r.color} />)}
                    </Pie>
                    <Tooltip content={<MoneyTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
                  <div><p className="text-lg font-bold">{formatINR(byType.total)}</p><p className="text-[11px] text-navy-muted">Total invested</p></div>
                </div>
              </div>
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.key} className="flex items-center gap-3 text-sm">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                    <span className="flex-1 text-navy-light">{r.label}</span>
                    <span className="text-xs text-navy-muted">{r.count} entries</span>
                    <span className="font-semibold w-24 text-right">{formatINR(r.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
        <div className="space-y-4">
          <SectionCard title="By Payment Account">
            {(byAccount?.rows || []).map((r) => (
              <div key={r.key} className="flex justify-between text-sm py-1.5"><span className="text-navy-light">{r.label}</span><span className="font-semibold">{formatINR(r.amount)}</span></div>
            ))}
          </SectionCard>
          <SectionCard title="By Provider">
            {(byProvider?.rows || []).map((r) => (
              <div key={r.key} className="flex justify-between text-sm py-1.5"><span className="text-navy-light truncate pr-2">{r.label}</span><span className="font-semibold">{formatINR(r.amount)}</span></div>
            ))}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Investment History" bodyClass="px-4 md:px-5 pb-2">
        {loading ? <LoadingBlock /> : !history?.content.length ? <EmptyState icon={TrendingUp} title="No history" /> : (
          <div className="divide-y divide-slate-100">
            {history.content.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0"><TransactionRow t={t} compact /></div>
                {t.units != null && <span className="chip bg-invest-soft text-invest hidden sm:inline-flex">{t.units} {['Gold', 'Silver', 'Platinum'].includes(t.categoryName) ? 'g' : 'units'}</span>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
