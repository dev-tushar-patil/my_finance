import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, HandCoins, HandHeart, ChevronDown, CalendarClock } from 'lucide-react';
import SmartSelect from '../components/ui/SmartSelect';
import { AccountIcon } from '../components/ui/AccountIcon';
import {
  PageHeader, Segmented, Modal, Field, TextInput, AmountInput, Spinner, Skeleton, EmptyState,
} from '../components/ui';
import useAsync from '../hooks/useAsync';
import useFinanceLookups from '../hooks/useFinanceLookups';
import { debtService } from '../services/financeService';
import { useToast } from '../context/ToastContext';
import { formatINR, formatDate, toISODate, cx } from '../utils/format';

const STATUS = {
  OPEN: 'bg-sky-50 text-sky-700', PARTIAL: 'bg-invest-soft text-amber-700', SETTLED: 'bg-income-soft text-income', OVERDUE: 'bg-expense-soft text-expense',
};

export default function BorrowGive() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const kind = params.get('tab') === 'GIVE' ? 'GIVE' : 'BORROW';
  const { data, loading, reload } = useAsync(() => debtService.list(kind), [kind]);
  const { accounts } = useFinanceLookups();
  const [open, setOpen] = useState(null);
  const [settle, setSettle] = useState(null);

  const outstanding = (data || []).reduce((s, d) => s + Math.max(d.outstanding, 0), 0);
  const isBorrow = kind === 'BORROW';

  return (
    <div className="animate-fade-up max-w-3xl">
      <PageHeader title="Borrow / Give" subtitle="Track money you owe and money owed to you, with partial settlements."
        actions={<button type="button" className="btn-primary" onClick={() => navigate(`/add?type=${kind}`)}><Plus size={18} /><span className="hidden sm:inline">{isBorrow ? 'Borrow' : 'Give'}</span></button>} />

      <Segmented options={[{ value: 'BORROW', label: 'Borrowed', icon: HandCoins }, { value: 'GIVE', label: 'Given', icon: HandHeart }]} value={kind}
        onChange={(v) => setParams(v === 'GIVE' ? { tab: 'GIVE' } : {}, { replace: true })} className="mb-4" />

      <div className={cx('rounded-2xl p-5 mb-4 text-white', isBorrow ? 'bg-gradient-to-br from-sky-500 to-sky-700' : 'bg-gradient-to-br from-orange-400 to-orange-600')}>
        <p className="text-sm text-white/85">{isBorrow ? 'Outstanding liability (you owe)' : 'Outstanding receivable (owed to you)'}</p>
        <p className="text-3xl font-extrabold mt-1">{formatINR(outstanding)}</p>
        <p className="text-xs text-white/80 mt-1">{(data || []).filter((d) => d.outstanding > 0).length} open record(s)</p>
      </div>

      {loading && !data ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        : !data?.length ? <div className="card"><EmptyState icon={isBorrow ? HandCoins : HandHeart} title={isBorrow ? 'No borrowings' : 'Nothing given'} /></div>
          : (
            <div className="space-y-3">
              {data.map((d) => {
                const pct = Math.min(100, (d.settled / d.amount) * 100);
                const expanded = open === d.id;
                return (
                  <div key={d.id} className="card overflow-hidden">
                    <button type="button" onClick={() => setOpen(expanded ? null : d.id)} className="w-full p-4 text-left">
                      <div className="flex items-start gap-3">
                        <span className="h-11 w-11 rounded-full bg-lavender text-primary-700 font-bold grid place-items-center shrink-0">{d.personName?.[0]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-navy flex items-center gap-2">{d.personName}<span className={cx('chip', STATUS[d.status])}>{d.status.toLowerCase()}</span></p>
                          <p className="text-xs text-navy-muted truncate">{formatDate(d.date)} · {d.narration || (isBorrow ? 'Borrowed' : 'Given')}</p>
                          {d.dueDate && <p className="text-xs text-navy-muted inline-flex items-center gap-1 mt-0.5"><CalendarClock size={12} />{isBorrow ? 'Due' : 'Expected'} {formatDate(d.dueDate)}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-navy">{formatINR(d.outstanding)}</p>
                          <p className="text-[11px] text-navy-muted">of {formatINR(d.amount)}</p>
                        </div>
                        <ChevronDown size={18} className={cx('text-navy-muted transition mt-1', expanded && 'rotate-180')} />
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 mt-3 overflow-hidden"><div className="h-full bg-income rounded-full" style={{ width: `${pct}%` }} /></div>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 border-t border-slate-100 animate-fade-up">
                        <p className="text-xs font-semibold text-navy-muted uppercase tracking-wide mt-3 mb-2">{isBorrow ? 'Repayment history' : 'Collection history'}</p>
                        {d.history.length === 0 ? <p className="text-sm text-navy-muted">No {isBorrow ? 'repayments' : 'collections'} yet.</p> : (
                          <ul className="space-y-2">
                            {d.history.map((h) => (
                              <li key={h.id} className="flex items-center gap-3 text-sm">
                                <AccountIcon type={h.accountType} size="sm" />
                                <span className="flex-1 min-w-0"><span className="block text-navy">{h.narration}</span><span className="text-xs text-navy-muted">{formatDate(h.date)} · {h.accountName}</span></span>
                                <span className="font-semibold text-income">{formatINR(h.amount)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {d.outstanding > 0 && (
                          <button type="button" className="btn-soft w-full mt-4" onClick={() => setSettle(d)}>
                            <Plus size={16} />Record {isBorrow ? 'Repayment' : 'Collection'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

      <SettleModal record={settle} kind={kind} accounts={accounts} onClose={() => setSettle(null)} onSaved={reload} />
    </div>
  );
}

function SettleModal({ record, kind, accounts, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (record) { setF({ amount: String(record.outstanding), date: toISODate(), accountId: record.accountId, narration: '' }); setErrors({}); } }, [record]);
  if (!record) return null;
  const isBorrow = kind === 'BORROW';
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const amt = Number(f.amount);
    if (!(amt > 0) || amt > record.outstanding) { setErrors({ amount: `Enter between ₹1 and ${formatINR(record.outstanding)}` }); return; }
    setSaving(true);
    try {
      await debtService.settle(record.id, { ...f, amount: amt });
      toast.success(`${isBorrow ? 'Repayment' : 'Collection'} of ${formatINR(amt)} recorded`);
      onSaved(); onClose();
    } catch (err) {
      setErrors(err.errors || {}); toast.error(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={isBorrow ? `Repay ${record.personName}` : `Collect from ${record.personName}`}
      subtitle={`Outstanding ${formatINR(record.outstanding)}. Partial amounts are allowed.`}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" form="settle-form" className="btn-primary" disabled={saving}>{saving && <Spinner size={16} className="text-white" />}Save</button></>}>
      <form id="settle-form" onSubmit={submit} className="space-y-4">
        <Field label="Amount" required error={errors.amount}><AmountInput value={f.amount} onChange={(v) => set('amount', v)} error={errors.amount} /></Field>
        <SmartSelect label={isBorrow ? 'Paid From' : 'Received In'} required value={f.accountId} error={errors.accountId}
          options={accounts.filter((a) => a.type !== 'CREDIT_CARD').map((a) => ({ value: a.id, label: a.name, icon: <AccountIcon type={a.type} size="sm" /> }))} onChange={(v) => set('accountId', v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><TextInput type="date" value={f.date} max={toISODate()} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Note"><TextInput value={f.narration} onChange={(e) => set('narration', e.target.value)} /></Field>
        </div>
      </form>
    </Modal>
  );
}
