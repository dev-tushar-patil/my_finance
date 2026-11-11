import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import Modal from '../ui/Modal';
import SmartSelect from '../ui/SmartSelect';
import { Field, TextInput, Spinner } from '../ui';
import { paymentAppService } from '../../services/financeService';
import { useToast } from '../../context/ToastContext';
import { UPI_PROVIDERS } from '../../utils/constants';

export default function UpiAppModal({ open, accounts, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm({ provider: 'GPAY', name: 'Google Pay', upiId: '', linkedAccountId: null }); setErrors({}); } }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const banks = accounts.filter((a) => ['SAVINGS', 'CURRENT'].includes(a.type));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) { setErrors({ name: 'Name is required' }); return; }
    setSaving(true);
    try {
      const created = await paymentAppService.create(form);
      toast.success(`${created.name} added`);
      onSaved?.(created);
      onClose();
    } catch (err) {
      setErrors(err.errors || { name: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add UPI App" subtitle="The app is only the payment interface. Money is debited from the linked bank account." icon={Smartphone}
      footer={(
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="upi-form" className="btn-primary" disabled={saving}>{saving && <Spinner size={16} className="text-white" />}Save</button>
        </>
      )}>
      <form id="upi-form" onSubmit={submit} className="space-y-4">
        <SmartSelect label="Provider" value={form.provider} options={UPI_PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
          onChange={(v, o) => setForm((f) => ({ ...f, provider: v, name: v === 'OTHER' ? f.name : o.label }))} />
        <Field label="Display Name" required error={errors.name}>
          <TextInput value={form.name || ''} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        </Field>
        <Field label="UPI ID" hint="Optional, e.g. name@okhdfcbank">
          <TextInput value={form.upiId || ''} onChange={(e) => set('upiId', e.target.value)} />
        </Field>
        <SmartSelect label="Default Linked Bank Account" value={form.linkedAccountId} placeholder="Select account (optional)"
          options={banks.map((a) => ({ value: a.id, label: a.name, hint: a.maskedNumber }))} onChange={(v) => set('linkedAccountId', v)} />
      </form>
    </Modal>
  );
}
