import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowDownCircle, ArrowUpCircle, TrendingUp, HandCoins, HandHeart, CheckCircle2, ExternalLink, ArrowLeft, Info,
} from 'lucide-react';
import CategoryCascade from '../components/categories/CategoryCascade';
import SmartSelect from '../components/ui/SmartSelect';
import QuickAddModal from '../components/ui/QuickAddModal';
import UpiAppModal from '../components/transactions/UpiAppModal';
import RecentTransactions from '../components/transactions/RecentTransactions';
import { AccountIcon, UpiIcon } from '../components/ui/AccountIcon';
import {
  Field, TextInput, TextArea, AmountInput, Segmented, Spinner, Modal, LoadingBlock,
} from '../components/ui';
import useFinanceLookups from '../hooks/useFinanceLookups';
import { transactionService, customerService, personService } from '../services/financeService';
import { useToast } from '../context/ToastContext';
import { PAYMENT_METHODS, UPI_PROVIDERS } from '../utils/constants';
import { formatINR, toISODate, cx } from '../utils/format';

const TYPES = [
  { value: 'EXPENSE', label: 'Expense', icon: ArrowUpCircle },
  { value: 'INCOME', label: 'Income', icon: ArrowDownCircle },
  { value: 'INVESTMENT', label: 'Investment', icon: TrendingUp },
  { value: 'BORROW', label: 'Borrow', icon: HandCoins },
  { value: 'GIVE', label: 'Give', icon: HandHeart },
];

const blank = (type, keep = {}) => ({
  type, amount: '', date: toISODate(), narration: '',
  categoryId: null, subcategoryId: null, itemId: null,
  paymentMethod: keep.paymentMethod ?? (type === 'EXPENSE' ? 'UPI' : null),
  paymentAppId: keep.paymentAppId ?? null, accountId: keep.accountId ?? null,
  customerId: null, project: '', personId: null, dueDate: '', units: '', provider: '',
});

export default function AddTransaction() {
  const { id: editId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { accounts, apps, customers, persons, setCustomers, setPersons, setApps, loading: lookupsLoading } = useFinanceLookups();

  const initialType = TYPES.some((t) => t.value === params.get('type')) ? params.get('type') : 'EXPENSE';
  const [form, setForm] = useState(() => blank(initialType));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [saved, setSaved] = useState(null);
  const [quickAdd, setQuickAdd] = useState(null); // 'customer' | 'person'
  const [upiModal, setUpiModal] = useState(false);
  const [recentKey, setRecentKey] = useState(0);

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; }); };

  /* ---------- edit mode */
  useEffect(() => {
    if (!editId) return;
    transactionService.get(editId).then((t) => {
      setForm({
        ...blank(t.type), ...t, amount: String(t.amount), date: t.date.slice(0, 10),
        project: t.project || '', dueDate: t.dueDate || '', units: t.units ?? '', provider: t.provider || '', narration: t.narration || '',
      });
    }).catch((e) => toast.error(e.message)).finally(() => setLoadingEdit(false));
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- payment source options depend on method */
  const method = PAYMENT_METHODS.find((m) => m.value === form.paymentMethod);
  const sourceAccounts = useMemo(() => {
    if (form.type === 'EXPENSE') return method ? accounts.filter((a) => method.accountTypes.includes(a.type)) : [];
    if (['INCOME', 'BORROW'].includes(form.type)) return accounts.filter((a) => a.type !== 'CREDIT_CARD');
    if (form.type === 'INVESTMENT') return accounts;
    return accounts.filter((a) => a.type !== 'CREDIT_CARD');
  }, [accounts, form.type, method]);

  // Keep the selected source valid for the chosen method; preselect sensible defaults.
  useEffect(() => {
    if (lookupsLoading || editId) return;
    if (form.accountId && sourceAccounts.some((a) => a.id === form.accountId)) return;
    const app = apps.find((a) => a.id === form.paymentAppId);
    const preferred = (form.paymentMethod === 'UPI' && app?.linkedAccountId && sourceAccounts.find((a) => a.id === app.linkedAccountId)) || sourceAccounts[0];
    set({ accountId: preferred?.id ?? null });
  }, [sourceAccounts, lookupsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default UPI app (and its linked bank) for new expense forms.
  useEffect(() => {
    if (lookupsLoading || editId || form.paymentMethod !== 'UPI' || form.paymentAppId || !apps[0]) return;
    const app = apps[0];
    set({ paymentAppId: app.id, ...(app.linkedAccountId ? { accountId: app.linkedAccountId } : {}) });
  }, [lookupsLoading, form.type, form.paymentAppId]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeType = (type) => { setForm(blank(type)); setErrors({}); };

  const changeMethod = (pm) => {
    const patch = { paymentMethod: pm };
    if (pm !== 'UPI') patch.paymentAppId = null;
    else if (!form.paymentAppId && apps[0]) {
      patch.paymentAppId = apps[0].id;
      if (apps[0].linkedAccountId) patch.accountId = apps[0].linkedAccountId;
    }
    set(patch);
  };

  const changeApp = (appId) => {
    const app = apps.find((a) => a.id === appId);
    set({ paymentAppId: appId, ...(app?.linkedAccountId ? { accountId: app.linkedAccountId } : {}) });
  };

  /* ---------- client validation (server validates again) */
  const validate = () => {
    const e = {};
    if (!(Number(form.amount) > 0)) e.amount = 'Enter an amount greater than zero';
    if (!form.date) e.date = 'Date is required';
    if (['EXPENSE', 'INCOME', 'INVESTMENT'].includes(form.type) && !form.categoryId) e.categoryId = 'Please select';
    if (form.type === 'EXPENSE') {
      if (!form.subcategoryId) e.subcategoryId = 'Please select a subtype';
      if (!form.itemId) e.itemId = 'Please select an item';
      if (!form.narration.trim()) e.narration = 'Narration is required';
      if (!form.paymentMethod) e.paymentMethod = 'Select payment method';
      if (form.paymentMethod === 'UPI' && !form.paymentAppId) e.paymentAppId = 'Select UPI app';
    }
    if (['BORROW', 'GIVE'].includes(form.type) && !form.personId) e.personId = 'Select a person';
    if (!form.accountId) e.accountId = 'Select an account';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) { toast.error('Please fix the highlighted fields'); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount), units: form.units === '' ? null : Number(form.units) };
      const result = editId ? await transactionService.update(editId, payload) : await transactionService.create(payload);
      if (editId) {
        toast.success('Transaction updated');
        navigate(-1);
        return;
      }
      setRecentKey((k) => k + 1);
      if (result.type === 'EXPENSE' && result.paymentMethod === 'UPI') setSaved(result);
      else toast.success(`${TYPES.find((t) => t.value === result.type).label} of ${formatINR(result.amount)} saved`);
      setForm(blank(form.type, { paymentMethod: form.paymentMethod, paymentAppId: form.paymentAppId, accountId: form.accountId }));
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingEdit) return <LoadingBlock className="h-80" />;

  const accountOption = (a) => ({ value: a.id, label: a.name, hint: [a.maskedNumber, `Bal ${formatINR(a.balance)}`].filter(Boolean).join(' · '), icon: <AccountIcon type={a.type} size="sm" /> });
  const personOptions = persons.map((p) => ({ value: p.id, label: p.name }));
  const accountLabel = { EXPENSE: 'Actual Payment Source', INCOME: 'Received In', INVESTMENT: 'Payment Source', BORROW: 'Received In', GIVE: 'Given From' }[form.type];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
      <form onSubmit={submit} className="card p-4 md:p-6 animate-fade-up min-w-0" noValidate>
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => navigate(-1)} className="h-10 w-10 -ml-2 grid place-items-center rounded-full hover:bg-slate-100 lg:hidden" aria-label="Back"><ArrowLeft size={20} /></button>
          <h1 className="page-title">{editId ? 'Edit Transaction' : 'Add Transaction'}</h1>
        </div>

        {!editId && <Segmented options={TYPES} value={form.type} onChange={changeType} className="mb-6" />}

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Amount" required error={errors.amount}>
            <AmountInput value={form.amount} onChange={(v) => set({ amount: v })} error={errors.amount} autoFocus={!editId} />
          </Field>
          <Field label={form.type === 'INVESTMENT' ? 'Purchase Date' : 'Date'} required error={errors.date}>
            <TextInput type="date" value={form.date} max={toISODate()} onChange={(e) => set({ date: e.target.value })} error={errors.date} />
          </Field>
        </div>

        <div className="mt-4 space-y-4">
          {/* ---------------- EXPENSE ---------------- */}
          {form.type === 'EXPENSE' && (
            <>
              <CategoryCascade type="EXPENSE" value={form} onChange={set} errors={errors} />
              <Field label="Narration" required error={errors.narration}>
                <TextArea value={form.narration} maxLength={255} placeholder="e.g. Breakfast at office" onChange={(e) => set({ narration: e.target.value })} error={errors.narration} />
              </Field>
              <PaymentMethodPicker value={form.paymentMethod} onChange={changeMethod} error={errors.paymentMethod} />
              <div className={cx('grid gap-4', form.paymentMethod === 'UPI' && 'md:grid-cols-2')}>
                {form.paymentMethod === 'UPI' && (
                  <SmartSelect label="Payment Application" required value={form.paymentAppId} error={errors.paymentAppId}
                    options={apps.map((a) => ({ value: a.id, label: a.name, hint: a.upiId, icon: <UpiIcon provider={a.provider} size="sm" /> }))}
                    onChange={changeApp} placeholder="Select UPI app" addNewLabel="Add UPI App" onAddNew={() => setUpiModal(true)} />
                )}
                <SmartSelect label={accountLabel} required value={form.accountId} error={errors.accountId}
                  options={sourceAccounts.map(accountOption)} onChange={(v) => set({ accountId: v })}
                  disabled={!form.paymentMethod} disabledHint="Select payment method first" placeholder="Select account"
                  addNewLabel="Add Account / Card" onAddNew={() => navigate('/accounts?add=1')} />
              </div>
              {form.paymentMethod === 'UPI' && (
                <p className="flex gap-2 text-xs text-navy-muted bg-lavender/50 rounded-lg p-3">
                  <Info size={14} className="shrink-0 mt-0.5 text-primary-500" />
                  The UPI app is only the payment interface. The amount is debited from the selected source account.
                </p>
              )}
            </>
          )}

          {/* ---------------- INCOME ---------------- */}
          {form.type === 'INCOME' && (
            <>
              <CategoryCascade type="INCOME" value={form} onChange={set} errors={errors} levels={2} requiredLevels={1}
                labels={{ main: 'Income Type', sub: 'Income Source', item: 'Item' }} className="grid md:grid-cols-2 gap-4" />
              <div className="grid md:grid-cols-2 gap-4">
                <SmartSelect label="Customer" value={form.customerId} placeholder="Select customer (optional)"
                  options={customers.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => set({ customerId: v })}
                  addNewLabel="Add New Customer" onAddNew={(q) => setQuickAdd({ kind: 'customer', name: q })} />
                <Field label="Project" hint="Optional">
                  <TextInput value={form.project} maxLength={120} placeholder="e.g. Jayashree Construction Website" onChange={(e) => set({ project: e.target.value })} />
                </Field>
              </div>
              <SmartSelect label={accountLabel} required value={form.accountId} error={errors.accountId} options={sourceAccounts.map(accountOption)} onChange={(v) => set({ accountId: v })} />
              <Field label="Narration"><TextArea value={form.narration} maxLength={255} placeholder="Notes" onChange={(e) => set({ narration: e.target.value })} /></Field>
            </>
          )}

          {/* ---------------- INVESTMENT ---------------- */}
          {form.type === 'INVESTMENT' && (
            <>
              <CategoryCascade type="INVESTMENT" value={form} onChange={set} errors={errors} levels={1} labels={{ main: 'Investment Type' }} />
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Quantity / Units" hint="Grams for metals, units for funds">
                  <TextInput type="number" inputMode="decimal" min="0" step="0.0001" value={form.units} onChange={(e) => set({ units: e.target.value })} />
                </Field>
                <Field label="Provider" hint="e.g. Axis Bluechip Fund, Tanishq">
                  <TextInput value={form.provider} maxLength={120} onChange={(e) => set({ provider: e.target.value })} />
                </Field>
              </div>
              <SmartSelect label={accountLabel} required value={form.accountId} error={errors.accountId} options={sourceAccounts.map(accountOption)} onChange={(v) => set({ accountId: v })} />
              <Field label="Narration"><TextArea value={form.narration} maxLength={255} placeholder="Notes" onChange={(e) => set({ narration: e.target.value })} /></Field>
              <p className="text-xs text-navy-muted">Investments move money from your account into an investment asset. They are not counted as expenses.</p>
            </>
          )}

          {/* ---------------- BORROW / GIVE ---------------- */}
          {['BORROW', 'GIVE'].includes(form.type) && (
            <>
              <SmartSelect label={form.type === 'BORROW' ? 'Borrowed From' : 'Given To'} required value={form.personId} error={errors.personId}
                options={personOptions} onChange={(v) => set({ personId: v })} placeholder="Select person"
                addNewLabel="Add New Person" onAddNew={(q) => setQuickAdd({ kind: 'person', name: q })} />
              <div className="grid md:grid-cols-2 gap-4">
                <SmartSelect label={accountLabel} required value={form.accountId} error={errors.accountId} options={sourceAccounts.map(accountOption)} onChange={(v) => set({ accountId: v })} />
                <Field label={form.type === 'BORROW' ? 'Due Date' : 'Expected Return Date'}>
                  <TextInput type="date" value={form.dueDate} min={form.date} onChange={(e) => set({ dueDate: e.target.value })} />
                </Field>
              </div>
              <Field label="Narration"><TextArea value={form.narration} maxLength={255} placeholder="Reason / notes" onChange={(e) => set({ narration: e.target.value })} /></Field>
            </>
          )}
        </div>

        <button type="submit" className="btn-primary w-full h-12 mt-6 text-base" disabled={saving}>
          {saving && <Spinner size={18} className="text-white" />}{saving ? 'Saving…' : editId ? 'Update Transaction' : 'Save Transaction'}
        </button>
      </form>

      <aside className="hidden lg:block space-y-4">
        <RecentTransactions refreshKey={recentKey} />
      </aside>

      <QuickAddModal open={!!quickAdd} initialName={quickAdd?.name}
        title={quickAdd?.kind === 'customer' ? 'Add Customer' : 'Add Person'} noun={quickAdd?.kind === 'customer' ? 'Customer' : 'Person'}
        onCreate={quickAdd?.kind === 'customer' ? customerService.create : personService.create}
        onSaved={(c) => {
          if (quickAdd.kind === 'customer') { setCustomers((l) => [...l, c]); set({ customerId: c.id }); } else { setPersons((l) => [...l, c]); set({ personId: c.id }); }
        }}
        onClose={() => setQuickAdd(null)} />

      <UpiAppModal open={upiModal} accounts={accounts} onClose={() => setUpiModal(false)}
        onSaved={(a) => { setApps((l) => [...l, a]); changeApp(a.id); }} />

      <SavedUpiModal txn={saved} apps={apps} onClose={() => setSaved(null)} />
    </div>
  );
}

function PaymentMethodPicker({ value, onChange, error }) {
  return (
    <div>
      <p className="label">Payment Method <span className="text-expense">*</span></p>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {PAYMENT_METHODS.map((m) => (
          <button key={m.value} type="button" onClick={() => onChange(m.value)}
            className={cx('h-11 rounded-xl border text-sm font-medium transition', value === m.value ? 'border-primary-600 bg-primary-600 text-white shadow-sm' : 'border-slate-200 bg-white text-navy-light hover:border-primary-300')}>
            {m.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-expense mt-1.5">{error}</p>}
    </div>
  );
}

/** After saving a UPI expense: offer to open the UPI app. Never claims the payment happened. */
function SavedUpiModal({ txn, apps, onClose }) {
  if (!txn) return null;
  const app = apps.find((a) => a.id === txn.paymentAppId);
  const provider = UPI_PROVIDERS.find((p) => p.value === app?.provider) || UPI_PROVIDERS[3];
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  return (
    <Modal open onClose={onClose} title="Transaction recorded" size="sm"
      footer={(
        <>
          <Link to="/transactions" className="btn-ghost">View all</Link>
          <button type="button" className="btn-primary" onClick={onClose}>Add another</button>
        </>
      )}>
      <div className="text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-income-soft text-income grid place-items-center mb-3"><CheckCircle2 size={30} /></div>
        <p className="text-2xl font-bold">{formatINR(txn.amount, { decimals: true })}</p>
        <p className="text-sm text-navy-muted mt-1">{txn.itemName} · {txn.subcategoryName} · {txn.categoryName}</p>
        <p className="text-sm text-navy-light mt-1">via {txn.paymentAppName} → {txn.accountName}</p>
        <p className="text-xs text-navy-muted bg-slate-50 rounded-lg p-3 mt-4 text-left">
          This saves an entry in My Finance only. It does <b>not</b> make or confirm a payment. Complete the payment in your UPI app.
        </p>
        <a href={provider.deepLink} className={cx('btn-soft w-full mt-3', !isMobile && 'opacity-90')}>
          <ExternalLink size={16} />Open {app?.name || 'UPI app'}
        </a>
        {!isMobile && <p className="text-[11px] text-navy-muted mt-2">Opening apps works on phones where the app is installed.</p>}
      </div>
    </Modal>
  );
}
