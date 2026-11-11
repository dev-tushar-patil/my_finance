import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import {
  Wallet, Eye, EyeOff, ArrowDownLeft, ArrowUpRight, TrendingUp, Landmark, HandCoins, HandHeart, Plus, CreditCard,
} from 'lucide-react';
import CategoryDrilldown from '../components/charts/CategoryDrilldown';
import RecentTransactions from '../components/transactions/RecentTransactions';
import MonthPicker from '../components/ui/MonthPicker';
import { SectionCard, Skeleton, LoadingBlock, EmptyState } from '../components/ui';
import { MoneyTooltip, axisProps, yMoney, Legend } from '../components/charts/ChartParts';
import useAsync from '../hooks/useAsync';
import { dashboardService, reportService, profileService } from '../services/financeService';
import { useCategories } from '../context/CategoryContext';
import { SERIES, foldOther } from '../utils/constants';
import { formatINR, monthRange, currentYM, monthLabel, cx } from '../utils/format';

function StatCard({ label, value, icon: Icon, tone, sub, to }) {
  const tones = {
    income: 'bg-income-soft text-income', expense: 'bg-expense-soft text-expense', invest: 'bg-invest-soft text-invest',
    primary: 'bg-lavender text-primary-600', sky: 'bg-sky-50 text-sky-600', orange: 'bg-orange-50 text-orange-600',
  };
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper to={to} className="card p-3.5 md:p-4 flex items-center gap-3 hover:shadow-md transition min-w-0">
      <span className={cx('h-10 w-10 md:h-11 md:w-11 rounded-xl grid place-items-center shrink-0', tones[tone])}><Icon size={20} /></span>
      <div className="min-w-0">
        <p className="text-xs text-navy-muted truncate">{label}</p>
        <p className="font-bold text-navy text-[15px] md:text-lg truncate">{value}</p>
        {sub && <p className="text-[11px] text-navy-muted truncate">{sub}</p>}
      </div>
    </Wrapper>
  );
}

export default function Dashboard() {
  const [ym, setYm] = useState(currentYM());
  const [hidden, setHidden] = useState(false);
  const { from, to } = monthRange(ym);
  const { version } = useCategories();

  const { data: me } = useAsync(() => profileService.me(), []);
  const { data: s, loading } = useAsync(() => dashboardService.summary({ from, to }), [from, to]);
  const { data: trends } = useAsync(() => dashboardService.monthlyTrends(6), [version]);
  const { data: balances } = useAsync(() => dashboardService.accountBalances(), []);
  const { data: inv } = useAsync(() => reportService.investments({ groupBy: 'category' }), [version]);

  const money = (v) => (hidden ? '₹ ••••' : formatINR(v));
  const invRows = foldOther(inv?.rows || []);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Hello, {me?.name || 'there'} <span aria-hidden>👋</span></h1>
          <p className="text-sm text-navy-muted">Here&apos;s your financial summary for {monthLabel(ym, true)}</p>
        </div>
        <MonthPicker value={ym} onChange={setYm} />
      </div>

      {/* Hero + stats */}
      <div className="grid lg:grid-cols-[1.1fr_2fr] gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 md:p-6 text-white bg-gradient-to-br from-primary-500 via-primary-600 to-primary-900 shadow-[0_16px_40px_-16px_rgba(103,58,183,.8)]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-16 h-44 w-44 rounded-full bg-white/5" />
          <div className="relative flex items-start gap-4">
            <span className="h-14 w-14 rounded-2xl bg-white/15 grid place-items-center"><Wallet size={28} /></span>
            <div className="flex-1">
              <p className="text-white/80 text-sm">Available Balance</p>
              {loading && !s ? <Skeleton className="h-9 w-40 mt-1 bg-white/20" /> : <p className="text-3xl md:text-4xl font-extrabold tracking-tight mt-0.5">{money(s?.availableBalance)}</p>}
              <p className="text-white/75 text-sm mt-2">Opening ({monthLabel(ym)}): {money(s?.openingBalance)}</p>
            </div>
            <button type="button" onClick={() => setHidden((h) => !h)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/15" aria-label={hidden ? 'Show amounts' : 'Hide amounts'}>
              {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          <div className="relative grid grid-cols-2 gap-2 mt-5">
            <Link to="/add" className="h-10 rounded-xl bg-white text-primary-700 font-semibold text-sm grid place-items-center"><span className="inline-flex items-center gap-1.5"><Plus size={16} />Add</span></Link>
            <Link to="/accounts" className="h-10 rounded-xl bg-white/15 font-semibold text-sm grid place-items-center"><span className="inline-flex items-center gap-1.5"><CreditCard size={16} />Accounts</span></Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
          <StatCard label="Total Income" value={money(s?.totalIncome)} icon={ArrowDownLeft} tone="income" to={`/transactions?type=INCOME&from=${from}&to=${to}`} />
          <StatCard label="Total Expense" value={money(s?.totalExpense)} icon={ArrowUpRight} tone="expense" to={`/transactions?type=EXPENSE&from=${from}&to=${to}`}
            sub={s?.expenseChangePercent != null ? `${s.expenseChangePercent > 0 ? '↑' : '↓'} ${Math.abs(s.expenseChangePercent)}% vs last month` : null} />
          <StatCard label="Investments" value={money(s?.totalInvestment)} icon={TrendingUp} tone="invest" to="/investments" sub={`All-time ${hidden ? '••••' : formatINR(s?.totalInvestmentAllTime)}`} />
          <StatCard label="Net Worth" value={money(s?.netWorth)} icon={Landmark} tone="primary" to="/reports?tab=networth" />
          <StatCard label="Borrowed (owed)" value={money(s?.totalBorrowed)} icon={HandCoins} tone="sky" to="/borrow-give" />
          <StatCard label="Given (to receive)" value={money(s?.totalGiven)} icon={HandHeart} tone="orange" to="/borrow-give?tab=GIVE" />
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Income vs Expense" action={<Legend items={[{ label: 'Income', color: SERIES.income }, { label: 'Expense', color: SERIES.expense }]} />}>
          {!trends ? <LoadingBlock className="h-64" /> : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={trends} barGap={2} barCategoryGap="28%">
                  <CartesianGrid vertical={false} stroke="#EEF0F6" />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...yMoney} />
                  <Tooltip content={<MoneyTooltip />} cursor={{ fill: '#F5F0FC' }} />
                  <Bar dataKey="income" name="Income" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="expense" name="Expense" fill={SERIES.expense} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
        <CategoryDrilldown from={from} to={to} />
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <SectionCard title="Monthly Expense Trend">
          {!trends ? <LoadingBlock className="h-52" /> : (
            <div className="h-52">
              <ResponsiveContainer>
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#673AB7" stopOpacity={0.25} /><stop offset="100%" stopColor="#673AB7" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#EEF0F6" />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...yMoney} />
                  <Tooltip content={<MoneyTooltip />} cursor={{ stroke: '#B39DDB', strokeDasharray: 4 }} />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#673AB7" strokeWidth={2} fill="url(#expGrad)" activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Account-wise Balance">
          {!balances ? <LoadingBlock className="h-52" /> : (
            <div className="h-52">
              <ResponsiveContainer>
                <BarChart data={balances} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid horizontal={false} stroke="#EEF0F6" />
                  <XAxis type="number" {...yMoney} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={96} />
                  <Tooltip content={<MoneyTooltip />} cursor={{ fill: '#F5F0FC' }} />
                  <Bar dataKey="balance" name="Balance" radius={4} maxBarSize={16}>
                    {balances.map((b) => <Cell key={b.id} fill={b.balance < 0 ? SERIES.expense : '#673AB7'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Investment Distribution" action={<Link to="/investments" className="text-xs font-semibold text-primary-600">Details</Link>}>
          {!inv ? <LoadingBlock className="h-52" /> : !invRows.length ? <EmptyState icon={TrendingUp} title="No investments yet" /> : (
            <div className="flex items-center gap-3 h-52">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={invRows} dataKey="amount" nameKey="label" innerRadius="60%" outerRadius="100%" stroke="#fff" strokeWidth={2} paddingAngle={1.5}>
                      {invRows.map((r) => <Cell key={r.key} fill={r.color} />)}
                    </Pie>
                    <Tooltip content={<MoneyTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 text-sm min-w-0">
                {invRows.map((r) => (
                  <li key={r.key} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: r.color }} /><span className="flex-1 truncate text-navy-light">{r.label}</span><span className="font-semibold">{formatINR(r.amount)}</span></li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>

      <RecentTransactions size={6} refreshKey={version} />
    </div>
  );
}
