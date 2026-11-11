import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, Cell,
} from 'recharts';
import { FileSpreadsheet, FileText, SlidersHorizontal, BarChart3, X } from 'lucide-react';
import CategoryCascade from '../components/categories/CategoryCascade';
import SmartSelect from '../components/ui/SmartSelect';
import MonthPicker from '../components/ui/MonthPicker';
import {
  PageHeader, Segmented, SectionCard, LoadingBlock, EmptyState, Field, TextInput,
} from '../components/ui';
import { MoneyTooltip, axisProps, yMoney } from '../components/charts/ChartParts';
import useAsync from '../hooks/useAsync';
import useFinanceLookups from '../hooks/useFinanceLookups';
import { reportService } from '../services/financeService';
import { useCategories } from '../context/CategoryContext';
import { PAYMENT_METHODS, CHART_COLORS, OTHER_COLOR, SERIES } from '../utils/constants';
import { downloadCSV, printReport } from '../utils/export';
import {
  formatINR, monthRange, currentYM, toISODate, cx, formatDate,
} from '../utils/format';

const TABS = [
  { value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'investment', label: 'Investment' },
  { value: 'accounts', label: 'Accounts' }, { value: 'networth', label: 'Net Worth' }, { value: 'debts', label: 'Borrow/Give' },
];

const PERIODS = [
  { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'custom', label: 'Custom' },
];

const GROUPS = {
  expense: [
    { value: 'category', label: 'Main Type-wise' }, { value: 'subcategory', label: 'Subtype-wise' }, { value: 'item', label: 'Item-wise' },
    { value: 'account', label: 'Bank / Cash / Card-wise' }, { value: 'paymentMethod', label: 'Payment Method-wise' }, { value: 'paymentApp', label: 'UPI App-wise' },
    { value: 'day', label: 'Day-wise' }, { value: 'week', label: 'Week-wise' }, { value: 'month', label: 'Month-wise' },
  ],
  income: [
    { value: 'category', label: 'Income Type-wise' }, { value: 'customer', label: 'Customer-wise' }, { value: 'account', label: 'Account-wise' }, { value: 'month', label: 'Month-wise' },
  ],
  investment: [
    { value: 'category', label: 'Investment Type-wise' }, { value: 'account', label: 'Account-wise' }, { value: 'provider', label: 'Provider-wise' }, { value: 'month', label: 'Month-wise' },
  ],
};
const TIME_GROUPS = ['day', 'week', 'month'];
const DRILL_PARAM = { category: 'categoryId', subcategory: 'subcategoryId', item: 'itemId', account: 'accountId', paymentMethod: 'paymentMethod', paymentApp: 'paymentAppId', customer: 'customerId' };

function periodRange(period, ym, custom) {
  const today = new Date();
  if (period === 'daily') { const d = toISODate(today); return { from: d, to: d }; }
  if (period === 'weekly') {
    const mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return { from: toISODate(mon), to: toISODate(today) };
  }
  if (period === 'custom') return custom;
  return monthRange(ym);
}

export default function Reports() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'expense';
  const setTab = (t) => setParams(t === 'expense' ? {} : { tab: t }, { replace: true });

  return (
    <div className="animate-fade-up">
      <PageHeader title="Reports" subtitle="Every report is aggregated live from your records, including newly created categories."
        actions={<button type="button" className="btn-ghost border border-slate-200 bg-white no-print" onClick={printReport}><FileText size={17} /><span className="hidden sm:inline">PDF</span></button>} />
      <Segmented options={TABS} value={tab} onChange={setTab} className="mb-4 no-print" size="sm" />
      {['expense', 'income', 'investment'].includes(tab) && <BreakdownReport key={tab} kind={tab} />}
      {tab === 'accounts' && <AccountsReport />}
      {tab === 'networth' && <NetWorthReport />}
      {tab === 'debts' && <DebtsReport />}
    </div>
  );
}

function BreakdownReport({ kind }) {
  const navigate = useNavigate();
  const { version } = useCategories();
  const { accounts, apps, customers } = useFinanceLookups();
  const [period, setPeriod] = useState('monthly');
  const [ym, setYm] = useState(currentYM());
  const [custom, setCustom] = useState(() => ({ from: toISODate(new Date(Date.now() - 29 * 864e5)), to: toISODate() }));
  const [groupBy, setGroupBy] = useState('category');
  const [cat, setCat] = useState({ categoryId: null, subcategoryId: null, itemId: null });
  const [extra, setExtra] = useState({ accountId: '', paymentMethod: '', paymentAppId: '', customerId: '' });
  const [showFilters, setShowFilters] = useState(false);

  const range = periodRange(period, ym, custom);
  const query = { ...range, groupBy, ...cat, ...extra };
  const fetcher = { expense: reportService.expenses, income: reportService.income, investment: reportService.investments }[kind];
  const { data, loading } = useAsync(() => fetcher(query), [JSON.stringify(query), version]);

  const type = kind.toUpperCase();
  const levels = kind === 'expense' ? 3 : kind === 'income' ? 2 : 1;
  const isTime = TIME_GROUPS.includes(groupBy);
  const color = SERIES[kind];
  const rows = data?.rows || [];
  const activeFilters = [cat.categoryId, extra.accountId, extra.paymentMethod, extra.paymentAppId, extra.customerId].filter(Boolean).length;

  const openRow = (r) => {
    if (r.id == null && !isTime) return;
    const p = new URLSearchParams({ type, from: range.from, to: range.to, label: r.label });
    if (isTime) {
      if (groupBy === 'day') { p.set('from', r.key); p.set('to', r.key); }
      if (groupBy === 'month') { const m = monthRange(r.key); p.set('from', m.from); p.set('to', m.to); }
    } else p.set(DRILL_PARAM[groupBy] || 'q', r.id);
    Object.entries({ ...cat, ...extra }).forEach(([k, v]) => { if (v && !p.has(k)) p.set(k, v); });
    navigate(`/transactions?${p}`);
  };

  const exportCsv = () => downloadCSV(`my-finance-${kind}-${groupBy}-${range.from}_${range.to}`, [
    { label: GROUPS[kind].find((g) => g.value === groupBy).label.replace('-wise', ''), key: 'label' },
    ...(rows.some((r) => r.parent) ? [{ label: 'Parent', key: 'parent' }] : []),
    { label: 'Transactions', key: 'count' }, { label: 'Amount (INR)', key: 'amount' }, { label: 'Share %', key: 'percent' },
  ], [...rows, { label: 'TOTAL', count: data?.count, amount: data?.total, percent: 100 }]);

  return (
    <div className="space-y-4">
      <div className="card p-4 no-print">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <Segmented options={PERIODS} value={period} onChange={setPeriod} className="lg:w-80" size="sm" />
          {period === 'monthly' && <MonthPicker value={ym} onChange={setYm} months={24} />}
          {period === 'custom' && (
            <div className="flex gap-2">
              <TextInput type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="h-11" />
              <TextInput type="date" value={custom.to} min={custom.from} max={toISODate()} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="h-11" />
            </div>
          )}
          <div className="lg:w-60"><SmartSelect value={groupBy} options={GROUPS[kind]} onChange={setGroupBy} searchThreshold={99} /></div>
          <div className="flex gap-2 lg:ml-auto">
            <button type="button" onClick={() => setShowFilters((v) => !v)} className={cx('btn border', activeFilters ? 'border-primary-300 bg-lavender text-primary-700' : 'border-slate-200 bg-white text-navy-light')}>
              <SlidersHorizontal size={16} />Filters{activeFilters > 0 && ` (${activeFilters})`}
            </button>
            <button type="button" onClick={exportCsv} disabled={!rows.length} className="btn-soft"><FileSpreadsheet size={16} />Excel</button>
          </div>
        </div>
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-up">
            <CategoryCascade type={type} value={cat} onChange={setCat} levels={levels} requiredLevels={0} allowAdd={false} className="grid sm:grid-cols-3 gap-3" />
            <div className="grid sm:grid-cols-3 gap-3 mt-3">
              <SmartSelect label={kind === 'income' ? 'Received In' : 'Bank / Card / Cash'} value={extra.accountId || null} placeholder="All accounts"
                options={[{ value: '', label: 'All accounts' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} onChange={(v) => setExtra((x) => ({ ...x, accountId: v }))} />
              {kind === 'expense' && (
                <>
                  <SmartSelect label="Payment Method" value={extra.paymentMethod || null} placeholder="All methods"
                    options={[{ value: '', label: 'All methods' }, ...PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))]} onChange={(v) => setExtra((x) => ({ ...x, paymentMethod: v }))} />
                  <SmartSelect label="UPI App" value={extra.paymentAppId || null} placeholder="All UPI apps"
                    options={[{ value: '', label: 'All UPI apps' }, ...apps.map((a) => ({ value: a.id, label: a.name }))]} onChange={(v) => setExtra((x) => ({ ...x, paymentAppId: v }))} />
                </>
              )}
              {kind === 'income' && (
                <SmartSelect label="Customer" value={extra.customerId || null} placeholder="All customers"
                  options={[{ value: '', label: 'All customers' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} onChange={(v) => setExtra((x) => ({ ...x, customerId: v }))} />
              )}
            </div>
            {activeFilters > 0 && (
              <button type="button" className="btn-ghost mt-3 -ml-2" onClick={() => { setCat({ categoryId: null, subcategoryId: null, itemId: null }); setExtra({ accountId: '', paymentMethod: '', paymentAppId: '', customerId: '' }); }}>
                <X size={16} />Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-xs text-navy-muted">Total {kind}</p><p className="text-xl md:text-2xl font-bold" style={{ color }}>{formatINR(data?.total)}</p></div>
        <div className="card p-4"><p className="text-xs text-navy-muted">Transactions</p><p className="text-xl md:text-2xl font-bold">{data?.count ?? '—'}</p></div>
        <div className="card p-4 col-span-2 md:col-span-1"><p className="text-xs text-navy-muted">Period</p><p className="font-semibold mt-1">{formatDate(range.from)} – {formatDate(range.to)}</p></div>
      </div>

      <SectionCard title={GROUPS[kind].find((g) => g.value === groupBy).label}>
        {loading && !data ? <LoadingBlock className="h-64" /> : !rows.length ? <EmptyState icon={BarChart3} title="No data for this period" message="Change the period or filters." /> : (
          <>
            <div style={{ height: isTime ? 240 : Math.min(48 + rows.slice(0, 12).length * 34, 440) }}>
              <ResponsiveContainer>
                {isTime ? (
                  <AreaChart data={rows}>
                    <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.25} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid vertical={false} stroke="#EEF0F6" />
                    <XAxis dataKey="key" {...axisProps} tickFormatter={(k) => (groupBy === 'month' ? k : k.slice(5))} />
                    <YAxis {...yMoney} />
                    <Tooltip content={<MoneyTooltip />} cursor={{ stroke: '#B39DDB', strokeDasharray: 4 }} />
                    <Area type="monotone" dataKey="amount" name="Amount" stroke={color} strokeWidth={2} fill="url(#rg)" activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                ) : (
                  <BarChart data={rows.slice(0, 12)} layout="vertical" margin={{ left: 4, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="#EEF0F6" />
                    <XAxis type="number" {...yMoney} />
                    <YAxis type="category" dataKey="label" {...axisProps} width={120} />
                    <Tooltip content={<MoneyTooltip />} cursor={{ fill: '#F5F0FC' }} />
                    <Bar dataKey="amount" name="Amount" radius={4} maxBarSize={18} onClick={(d) => openRow(d)} className="cursor-pointer">
                      {rows.slice(0, 12).map((r, i) => <Cell key={r.key} fill={i < CHART_COLORS.length ? CHART_COLORS[i] : OTHER_COLOR} />)}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto mt-4 -mx-1">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="text-left text-xs text-navy-muted border-b border-slate-100">
                    <th className="py-2 px-1 font-medium">Name</th><th className="px-1 font-medium text-right">Txns</th><th className="px-1 font-medium text-right">Amount</th><th className="px-1 font-medium text-right w-32">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} onClick={() => openRow(r)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                      <td className="py-2.5 px-1"><p className="font-medium text-navy">{r.label}</p>{r.parent && <p className="text-xs text-navy-muted">{r.parent}</p>}</td>
                      <td className="px-1 text-right text-navy-muted">{r.count}</td>
                      <td className="px-1 text-right font-semibold">{formatINR(r.amount)}</td>
                      <td className="px-1">
                        <div className="flex items-center gap-2 justify-end"><div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.percent}%`, background: color }} /></div><span className="text-xs text-navy-muted w-11 text-right">{r.percent}%</span></div>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold"><td className="py-2.5 px-1">Total</td><td className="px-1 text-right">{data.count}</td><td className="px-1 text-right">{formatINR(data.total)}</td><td /></tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function AccountsReport() {
  const [ym, setYm] = useState(currentYM());
  const range = monthRange(ym);
  const { data, loading } = useAsync(() => reportService.accounts(range), [ym]);
  const exportCsv = () => downloadCSV(`my-finance-accounts-${ym}`, [
    { label: 'Account', key: 'name' }, { label: 'Type', key: 'type' }, { label: 'Opening', key: 'opening' }, { label: 'Inflow', key: 'inflow' }, { label: 'Outflow', key: 'outflow' }, { label: 'Closing', key: 'closing' },
  ], data || []);
  return (
    <SectionCard title="Account Balance Report" action={<div className="flex gap-2 no-print"><MonthPicker value={ym} onChange={setYm} months={24} /><button type="button" className="btn-soft" onClick={exportCsv}><FileSpreadsheet size={16} /></button></div>}>
      {loading ? <LoadingBlock /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead><tr className="text-left text-xs text-navy-muted border-b border-slate-100"><th className="py-2 font-medium">Account</th><th className="font-medium text-right">Opening</th><th className="font-medium text-right">Inflow</th><th className="font-medium text-right">Outflow</th><th className="font-medium text-right">Closing</th></tr></thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id} className="border-b border-slate-50">
                  <td className="py-3 font-medium">{a.name}</td>
                  <td className="text-right text-navy-light">{formatINR(a.opening)}</td>
                  <td className="text-right text-income">+{formatINR(a.inflow)}</td>
                  <td className="text-right text-expense">-{formatINR(a.outflow)}</td>
                  <td className={cx('text-right font-bold', a.closing < 0 && 'text-expense')}>{formatINR(a.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function NetWorthReport() {
  const { data, loading } = useAsync(() => reportService.netWorth(), []);
  if (loading || !data) return <LoadingBlock />;
  const List = ({ title, items, total, tone }) => (
    <SectionCard title={title} action={<span className={cx('font-bold', tone)}>{formatINR(total)}</span>}>
      {items.map((i) => (
        <div key={i.label} className="flex justify-between py-2 border-b border-slate-50 last:border-0 text-sm">
          <span><span className="text-navy">{i.label}</span><span className="block text-[11px] text-navy-muted">{i.group}</span></span>
          <span className="font-semibold">{formatINR(i.amount)}</span>
        </div>
      ))}
    </SectionCard>
  );
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-6 text-white bg-gradient-to-br from-primary-500 to-primary-900">
        <p className="text-white/80 text-sm">Net Worth = Total Assets − Total Liabilities</p>
        <p className="text-4xl font-extrabold mt-1">{formatINR(data.netWorth)}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <List title="Assets" items={data.assets} total={data.totalAssets} tone="text-income" />
        <List title="Liabilities" items={data.liabilities} total={data.totalLiabilities} tone="text-expense" />
      </div>
    </div>
  );
}

function DebtsReport() {
  const { data, loading } = useAsync(() => reportService.debts(), []);
  const totals = useMemo(() => {
    if (!data) return null;
    const s = (l) => l.reduce((a, r) => a + r.outstanding, 0);
    return { borrowed: s(data.borrowed), given: s(data.given) };
  }, [data]);
  if (loading || !data) return <LoadingBlock />;
  const Table = ({ title, rows, total }) => (
    <SectionCard title={title} action={<span className="font-bold">{formatINR(total)}</span>}>
      {!rows.length ? <p className="text-sm text-navy-muted">No records.</p> : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-navy-muted border-b border-slate-100"><th className="py-2 font-medium">Person</th><th className="font-medium text-right">Amount</th><th className="font-medium text-right">Settled</th><th className="font-medium text-right">Outstanding</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.personId} className="border-b border-slate-50"><td className="py-2.5 font-medium">{r.label}</td><td className="text-right">{formatINR(r.amount)}</td><td className="text-right text-income">{formatINR(r.settled)}</td><td className="text-right font-bold">{formatINR(r.outstanding)}</td></tr>
          ))}</tbody>
        </table>
      )}
    </SectionCard>
  );
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Table title="Borrowed (liability)" rows={data.borrowed} total={totals.borrowed} />
      <Table title="Given (receivable)" rows={data.given} total={totals.given} />
    </div>
  );
}
