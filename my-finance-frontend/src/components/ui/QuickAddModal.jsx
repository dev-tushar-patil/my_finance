import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import Modal from './Modal';
import { Field, TextInput, Spinner } from './index';
import { useToast } from '../../context/ToastContext';

/** Tiny "name (+ phone)" creator used for customers and persons. */
export default function QuickAddModal({ open, title, noun, initialName = '', onClose, onCreate, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setName(initialName); setPhone(''); setError(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      const created = await onCreate({ name: name.trim(), phone: phone.trim() || null });
      toast.success(`${noun} “${created.name}” added`);
      onSaved?.(created);
      onClose();
    } catch (err) {
      setError(err.errors?.name || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} icon={UserPlus} size="sm"
      footer={(
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="quick-add" className="btn-primary" disabled={saving}>{saving && <Spinner size={16} className="text-white" />}Save</button>
        </>
      )}>
      <form id="quick-add" onSubmit={submit} className="space-y-4">
        <Field label="Name" required error={error}>
          <TextInput autoFocus value={name} maxLength={60} onChange={(e) => { setName(e.target.value); setError(null); }} error={error} />
        </Field>
        <Field label="Phone" hint="Optional">
          <TextInput value={phone} inputMode="tel" maxLength={15} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
