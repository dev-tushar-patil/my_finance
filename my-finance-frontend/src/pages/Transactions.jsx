import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Pencil, Trash2, ListOrdered, Plus } from 'lucide-react';
import TransactionRow, { txnTitle } from '../components/transactions/TransactionRow';
import CategoryCascade from '../components/categories/CategoryCascade';
import SmartSelect from '../components/ui/SmartSelect';
import {
  PageHeader, Segmented, Skeleton, EmptyState, Modal, ConfirmDialog, Field, TextInput,
} from '../components/ui';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import useFinanceLookups from '../hooks/useFinanceLookups';
import { transactionService } from '../services/financeService';
import { useToast } from '../context/ToastContext';
import { PAYMENT_METHODS, TXN_TYPE_META, paymentMethodLabel } from '../utils/constants';
import { formatINR, formatDate, cx } from '../utils/format';

const TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'INVESTMENT', label: 'Investment' },
  { value: 'BORROW,GIVE,REPAYMENT,COLLECTION', label: 'Borrow/Give' },
  { value: 'TRANSFER', label: 'Transfers' },
];

const FILTER_KEYS = ['from', 'to', 'categoryId', 'subcategoryId', 'itemId', 'accountId', 'paymentMethod', 'paymentAppId', 'customerId'];
const PAGE_SIZE = 20;

export default function Transactions() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { accounts, apps } = useFinanceLookups();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const q = useDebounce(search.trim(), 350);

  const type = params.get('type') || '';
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']));
  const drillLabel = params.get('label');
  const activeCount = FILTER_KEYS.filter((k) => filters[k]).length;

  const query = { ...filters, type, q, page, size: PAGE_SIZE };
  const { data, loading, reload } = useAsync(() => transactionService.list(query), [JSON.stringify(query)]);

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v === '' || v == null) next.delete(k); else next.set(k, v); });
    if (!('label' in patch)) next.delete('label');
    setParams(next, { replace: true });
    setPage(0);
  };

  const clearAll = () => { setParams(new URLSearchParams(type ? { type } : {}), { replace: true }); setPage(0); };

  const groups = useMemo(() => {
    const out = [];
    (data?.content || []).forEach((t) => {
      const day = t.date.slice(0, 10);
      if (!out.length || out[out.length - 1].day !== day) out.push({ day, items: [] });
      out[out.length - 1].items.push(t);
    });
    return out;
  }, [data]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await transactionService.remove(confirmDelete.id);
      toast.success('Transaction deleted');
      setConfirmDelete(null); setSelected(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader title="All Transactions" subtitle={data ? `${data.totalElements} records · ${formatINR(data.totalAmount)}` : ' '}
        actions={<button type="button" className="btn-primary" onClick={() => navigate('/add')}><Plus size={18} /><span className="hidden sm:inline">Add</span></button>} />

      <Segmented options={TYPE_TABS} value={type} onChange={(v) => setParam({ type: v, categoryId: '', subcategoryId: '', itemId: '' })} className="mb-3" size="sm" />

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search narration, category, account, person…" className="field pl-11" />
        </div>
        <button type="button" onClick={() => setShowFilters((v) => !v)} className={cx('btn h-12 border', showFilters || activeCount ? 'border-primary-300 bg-lavender text-primary-700' : 'border-slate-200 bg-white text-navy-light')}>
          <SlidersHorizontal size={18} /><span className="hidden sm:inline">Filters</span>{activeCount > 0 && <span className="chip bg-primary-600 text-white px-1.5 py-0">{activeCount}</span>}
        </button>
      </div>

      {drillLabel && (
        <div className="flex items-center gap-2 mb-3">
          <span className="chip bg-primary-600 text-white">{drillLabel}</span>
          <button type="button" onClick={clearAll} className="text-xs text-navy-muted inline-flex items-center gap-1 hover:text-expense"><X size={13} />Clear</button>
        </div>
      )}

      {showFilters && (
        <div className="card p-4 mb-4 animate-fade-up">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="From"><TextInput type="date" value={filters.from} onChange={(e) => setParam({ from: e.target.value })} /></Field>
            <Field label="To"><TextInput type="date" value={filters.to} min={filters.from} onChange={(e) => setParam({ to: e.target.value })} /></Field>
            <SmartSelect label="Account" value={filters.accountId ? Number(filters.accountId) : null} placeholder="All accounts"
              options={[{ value: '', label: 'All accounts' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} onChange={(v) => setParam({ accountId: v })} />
            <SmartSelect label="Payment Method" value={filters.paymentMethod} placeholder="All methods"
              options={[{ value: '', label: 'All methods' }, ...PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))]} onChange={(v) => setParam({ paymentMethod: v })} />
            <SmartSelect label="UPI App" value={filters.paymentAppId ? Number(filters.paymentAppId) : null} placeholder="All UPI apps"
              options={[{ value: '', label: 'All UPI apps' }, ...apps.map((a) => ({ value: a.id, label: a.name }))]} onChange={(v) => setParam({ paymentAppId: v })} />
          </div>
          {['EXPENSE', 'INCOME', 'INVESTMENT'].includes(type) && (
            <CategoryCascade type={type} allowAdd={false} requiredLevels={0} levels={type === 'EXPENSE' ? 3 : type === 'INCOME' ? 2 : 1}
              className="grid sm:grid-cols-3 gap-3 mt-3"
              value={{ categoryId: Number(filters.categoryId) || null, subcategoryId: Number(filters.subcategoryId) || null, itemId: Number(filters.itemId) || null }}
              onChange={(v) => setParam({ categoryId: v.categoryId || '', subcategoryId: v.subcategoryId || '', itemId: v.itemId || '' })} />
          )}
          {type === '' && <p className="text-xs text-navy-muted mt-3">Choose Expense, Income or Investment above to filter by category.</p>}
          {activeCount > 0 && <button type="button" onClick={clearAll} className="btn-ghost mt-3 -ml-2"><X size={16} />Clear filters</button>}
        </div>
      )}

      <div className="card px-4 md:px-5 py-2">
        {loading && !data ? (
          <div className="space-y-3 py-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : !groups.length ? (
          <EmptyState icon={ListOrdered} title="No transactions found" message="Try a different filter or add a new transaction." />
        ) : (
          <div className={cx(loading && 'opacity-60 transition')}>
            {groups.map((g) => (
              <div key={g.day}>
                <p className="text-xs font-semibold text-navy-muted uppercase tracking-wide pt-4 pb-1">{formatDate(g.day, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <div className="divide-y divide-slate-100">{g.items.map((t) => <TransactionRow key={t.id} t={t} onClick={() => setSelected(t)} />)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button type="button" className="btn-ghost border border-slate-200 bg-white" disabled={data.first} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={16} />Prev</button>
          <span className="text-sm text-navy-muted">Page {data.page + 1} of {data.totalPages}</span>
          <button type="button" className="btn-ghost border border-slate-200 bg-white" disabled={data.last} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight size={16} /></button>
        </div>
      )}

      <TransactionDetail t={selected} onClose={() => setSelected(null)}
        onEdit={() => navigate(`/transactions/${selected.id}/edit`)} onDelete={() => setConfirmDelete(selected)} />

      <ConfirmDialog open={!!confirmDelete} danger busy={deleting} title="Delete transaction?" confirmLabel="Delete"
        message="This permanently removes the entry and reverses its effect on account balances." onConfirm={doDelete} onClose={() => setConfirmDelete(null)} />
    </div>
  );
}

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return <div className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0 text-sm"><span className="text-navy-muted">{label}</span><span className="text-navy font-medium text-right">{value}</span></div>;
}

function TransactionDetail({ t, onClose, onEdit, onDelete }) {
  if (!t) return null;
  const meta = TXN_TYPE_META[t.type];
  const editable = !['REPAYMENT', 'COLLECTION', 'TRANSFER'].includes(t.type);
  return (
    <Modal open onClose={onClose} title={txnTitle(t)} subtitle={formatDate(t.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      footer={(
        <>
          <button type="button" className="btn-ghost text-expense hover:bg-expense-soft mr-auto" onClick={onDelete}><Trash2 size={16} />Delete</button>
          {editable && <button type="button" className="btn-primary" onClick={onEdit}><Pencil size={16} />Edit</button>}
        </>
      )}>
      <div className="text-center mb-4">
        <span className={cx('chip', meta.bg, meta.color)}>{meta.label}</span>
        <p className="text-3xl font-extrabold mt-2">{formatINR(t.amount, { decimals: true })}</p>
      </div>
      <Row label="Main Type" value={t.categoryName} />
      <Row label="Subtype" value={t.subcategoryName} />
      <Row label="Item" value={t.itemName} />
      <Row label="Narration" value={t.narration} />
      <Row label="Payment Method" value={t.paymentMethod && paymentMethodLabel(t.paymentMethod)} />
      <Row label="UPI App" value={t.paymentAppName} />
      <Row label={['INCOME', 'BORROW', 'COLLECTION'].includes(t.type) ? 'Received In' : 'From Account'} value={t.accountName} />
      <Row label="To Account" value={t.toAccountName} />
      <Row label="Customer" value={t.customerName} />
      <Row label="Project" value={t.project} />
      <Row label="Person" value={t.personName} />
      <Row label="Units" value={t.units} />
      <Row label="Provider" value={t.provider} />
      <Row label="Due Date" value={t.dueDate && formatDate(t.dueDate)} />
    </Modal>
  );
}
