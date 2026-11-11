import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowLeftRight, Smartphone, Landmark, ChevronRight } from 'lucide-react';
import { AccountIcon, UpiIcon } from '../components/ui/AccountIcon';
import SmartSelect from '../components/ui/SmartSelect';
import UpiAppModal from '../components/transactions/UpiAppModal';
import {
  PageHeader, Segmented, Modal, Field, TextInput, AmountInput, Spinner, Skeleton, EmptyState,
} from '../components/ui';
import useFinanceLookups from '../hooks/useFinanceLookups';
import { accountService, transactionService } from '../services/financeService';
import { useToast } from '../context/ToastContext';
import { ACCOUNT_TYPES } from '../utils/constants';
import { formatINR, toISODate, cx } from '../utils/format';

const TABS = [
  { value: 'ALL', label: 'All' }, { value: 'Bank', label: 'Bank' }, { value: 'UPI', label: 'UPI' },
  { value: 'Cards', label: 'Cards' }, { value: 'Cash', label: 'Cash' },
];
const groupOf = (type) => ACCOUNT_TYPES.find((t) => t.value === type)?.group;

export default function Accounts() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { accounts, apps, loading, reload } = useFinanceLookups();
  const [tab, setTab] = useState('ALL');
  const [addOpen, setAddOpen] = useState(params.get('add') === '1');
  const [upiOpen, setUpiOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const totals = useMemo(() => {
    const liquid = accounts.filter((a) => a.type !== 'CREDIT_CARD').reduce((s, a) => s + a.balance, 0);
    const due = accounts.filter((a) => a.type === 'CREDIT_CARD').reduce((s, a) => s + Math.max(-a.balance, 0), 0);
    return { liquid, due };
  }, [accounts]);

  const shownAccounts = accounts.filter((a) => tab === 'ALL' || groupOf(a.type) === tab);
  const showApps = tab === 'ALL' || tab === 'UPI';

  const closeAdd = () => { setAddOpen(false); if (params.get('add')) setParams({}, { replace: true }); };

  return (
    <div className="animate-fade-up max-w-3xl">
      <PageHeader title="Accounts & Cards" subtitle="Balances are calculated from opening balance and every recorded entry."
        actions={<button type="button" className="btn-soft" onClick={() => setTransferOpen(true)}><ArrowLeftRight size={17} /><span className="hidden sm:inline">Transfer</span></button>} />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4"><p className="text-xs text-navy-muted">Cash & Bank</p><p className="text-xl font-bold text-navy">{formatINR(totals.liquid)}</p></div>
        <div className="card p-4"><p className="text-xs text-navy-muted">Credit Card Due</p><p className="text-xl font-bold text-expense">{formatINR(totals.due)}</p></div>
      </div>

      <Segmented options={TABS} value={tab} onChange={setTab} className="mb-4" size="sm" />

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[76px]" />)}</div>
      ) : (
        <div className="space-y-3">
          {tab !== 'UPI' && shownAccounts.map((a) => (
            <button key={a.id} type="button" onClick={() => navigate(`/transactions?accountId=${a.id}&label=${encodeURIComponent(a.name)}`)}
              className="card w-full p-4 flex items-center gap-3 text-left hover:shadow-md transition">
              <AccountIcon type={a.type} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy truncate">{a.name}</p>
                <p className="text-xs text-navy-muted truncate">{[a.typeLabel, a.maskedNumber].filter(Boolean).join(' · ')}</p>
                {a.type === 'CREDIT_CARD' && a.creditLimit && (
                  <div className="mt-1.5">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden w-40 max-w-full">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, (Math.max(-a.balance, 0) / a.creditLimit) * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-navy-muted mt-1">Available {formatINR(a.availableCredit)} of {formatINR(a.creditLimit)}</p>
                  </div>
                )}
              </div>
              <p className={cx('font-bold', a.balance < 0 ? 'text-expense' : 'text-navy')}>{formatINR(a.balance)}</p>
              <ChevronRight size={18} className="text-navy-muted" />
            </button>
          ))}

          {showApps && apps.map((p) => (
            <div key={`app-${p.id}`} className="card p-4 flex items-center gap-3">
              <UpiIcon provider={p.provider} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy">{p.name} <span className="text-xs font-normal text-navy-muted">(UPI)</span></p>
                <p className="text-xs text-navy-muted truncate">{p.upiId || 'No UPI ID'}{p.linkedAccountName && ` · Linked to ${p.linkedAccountName}`}</p>
              </div>
              <span className="chip bg-lavender text-primary-700">Interface</span>
            </div>
          ))}

          {!shownAccounts.length && !(showApps && apps.length) && <div className="card"><EmptyState icon={Landmark} title="Nothing here yet" /></div>}

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={() => setAddOpen(true)} className="btn-soft h-12"><Plus size={18} />Add Account / Card</button>
            <button type="button" onClick={() => setUpiOpen(true)} className="btn-ghost h-12 border border-dashed border-primary-300 text-primary-700"><Smartphone size={18} />Add UPI App</button>
          </div>
        </div>
      )}

      <AddAccountModal open={addOpen} onClose={closeAdd} onSaved={reload} />
      <UpiAppModal open={upiOpen} accounts={accounts} onClose={() => setUpiOpen(false)} onSaved={reload} />
      <TransferModal open={transferOpen} accounts={accounts} onClose={() => setTransferOpen(false)} onSaved={reload} />
    </div>
  );
}

function AddAccountModal({ open, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setF({ type: 'SAVINGS', name: '', bankName: '', accountNumber: '', openingBalance: '', openingBalanceDate: toISODate(), creditLimit: '' }); setErrors({}); } }, [open]);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const isCard = f.type === 'CREDIT_CARD';

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name?.trim()) errs.name = 'Account name is required';
    if (isCard && !(Number(f.creditLimit) > 0)) errs.creditLimit = 'Enter the credit limit';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const a = await accountService.create({ ...f, openingBalance: Number(f.openingBalance) || 0, creditLimit: isCard ? Number(f.creditLimit) : null });
      toast.success(`${a.name} added`);
      onSaved?.(a); onClose();
    } catch (err) {
      setErrors(err.errors || {}); toast.error(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Account / Card" icon={Landmark}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" form="acc-form" className="btn-primary" disabled={saving}>{saving && <Spinner size={16} className="text-white" />}Save</button></>}>
      <form id="acc-form" onSubmit={submit} className="space-y-4">
        <SmartSelect label="Account Type" required value={f.type} options={ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label, icon: <AccountIcon type={t.value} size="sm" /> }))} onChange={(v) => set('type', v)} />
        <Field label="Account Name" required error={errors.name}><TextInput value={f.name || ''} placeholder="e.g. SBI Savings" onChange={(e) => set('name', e.target.value)} error={errors.name} /></Field>
        {f.type !== 'CASH' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bank Name"><TextInput value={f.bankName || ''} onChange={(e) => set('bankName', e.target.value)} /></Field>
            <Field label="Account / Card No." hint="Only last 4 digits are kept"><TextInput value={f.accountNumber || ''} inputMode="numeric" maxLength={19} onChange={(e) => set('accountNumber', e.target.value.replace(/[^\d ]/g, ''))} /></Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={isCard ? 'Outstanding Due' : 'Opening Balance'}><AmountInput value={f.openingBalance || ''} onChange={(v) => set('openingBalance', v)} /></Field>
          <Field label="As of Date"><TextInput type="date" value={f.openingBalanceDate || ''} max={toISODate()} onChange={(e) => set('openingBalanceDate', e.target.value)} /></Field>
        </div>
        {isCard && <Field label="Credit Limit" required error={errors.creditLimit}><AmountInput value={f.creditLimit || ''} onChange={(v) => set('creditLimit', v)} error={errors.creditLimit} /></Field>}
      </form>
    </Modal>
  );
}

function TransferModal({ open, accounts, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setF({ amount: '', accountId: null, toAccountId: null, date: toISODate(), narration: '' }); setErrors({}); } }, [open]);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const opt = (a) => ({ value: a.id, label: a.name, hint: `Bal ${formatINR(a.balance)}`, icon: <AccountIcon type={a.type} size="sm" /> });
  const to = accounts.find((a) => a.id === f.toAccountId);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await transactionService.transfer({ ...f, amount: Number(f.amount), paymentMethod: 'NET_BANKING', narration: f.narration || (to?.type === 'CREDIT_CARD' ? `${to.name} bill payment` : 'Account transfer') });
      toast.success('Transfer recorded');
      onSaved?.(); onClose();
    } catch (err) {
      setErrors(err.errors || {}); toast.error(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Transfer / Pay Card Bill" subtitle="Moves money between your accounts. Not counted as income or expense." icon={ArrowLeftRight}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" form="tr-form" className="btn-primary" disabled={saving}>{saving && <Spinner size={16} className="text-white" />}Transfer</button></>}>
      <form id="tr-form" onSubmit={submit} className="space-y-4">
        <Field label="Amount" required error={errors.amount}><AmountInput value={f.amount} onChange={(v) => set('amount', v)} error={errors.amount} /></Field>
        <SmartSelect label="From" required value={f.accountId} options={accounts.filter((a) => a.type !== 'CREDIT_CARD').map(opt)} onChange={(v) => set('accountId', v)} error={errors.accountId} />
        <SmartSelect label="To" required value={f.toAccountId} options={accounts.filter((a) => a.id !== f.accountId).map(opt)} onChange={(v) => set('toAccountId', v)} error={errors.toAccountId} />
        {to?.type === 'CREDIT_CARD' && <p className="text-xs text-navy-muted bg-lavender/50 rounded-lg p-3">Card bill payment reduces your bank balance and the card due. The purchases were already counted as expenses.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><TextInput type="date" value={f.date} max={toISODate()} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Note"><TextInput value={f.narration} onChange={(e) => set('narration', e.target.value)} /></Field>
        </div>
      </form>
    </Modal>
  );
}
