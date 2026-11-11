import { useEffect, useState } from 'react';
import { User, Database, RotateCcw, Trash2, Info, FolderTree, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, SectionCard, Field, TextInput, Spinner, ConfirmDialog } from '../components/ui';
import { profileService } from '../services/financeService';
import { USE_MOCK_API } from '../services/apiClient';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const toast = useToast();
  const { invalidateAll } = useCategories();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'demo' | 'empty'
  const [busy, setBusy] = useState(false);

  useEffect(() => { profileService.me().then((u) => setName(u.name)).catch(() => {}); }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await profileService.update({ name }); toast.success('Profile updated'); } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await profileService.resetDemo(confirm === 'demo');
      invalidateAll();
      toast.success(confirm === 'demo' ? 'Demo data restored' : 'Started fresh with default categories');
      setConfirm(null);
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-up max-w-2xl space-y-4">
      <PageHeader title="Settings" />

      <SectionCard title={<span className="inline-flex items-center gap-2"><User size={18} className="text-primary-600" />Profile</span>}>
        <form onSubmit={saveProfile} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <Field label="Display Name" className="flex-1"><TextInput value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></Field>
          <button type="submit" className="btn-primary h-12" disabled={saving || !name.trim()}>{saving && <Spinner size={16} className="text-white" />}Save</button>
        </form>
      </SectionCard>

      <SectionCard title={<span className="inline-flex items-center gap-2"><FolderTree size={18} className="text-primary-600" />Manage</span>} bodyClass="p-2">
        <Link to="/categories" className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50"><span>Categories (Main Type → Subtype → Item)</span><span className="text-navy-muted">›</span></Link>
        <Link to="/accounts" className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50"><span className="inline-flex items-center gap-2"><CreditCard size={16} />Accounts, cards & UPI apps</span><span className="text-navy-muted">›</span></Link>
      </SectionCard>

      <SectionCard title={<span className="inline-flex items-center gap-2"><Database size={18} className="text-primary-600" />Data</span>}>
        <p className="text-sm text-navy-light">
          Data source: <b>{USE_MOCK_API ? 'Local demo API (browser storage)' : 'My Finance server'}</b>
        </p>
        {USE_MOCK_API && (
          <>
            <p className="text-xs text-navy-muted mt-1">In Phases 1–2, everything you add is saved in this browser through a mock API with the same endpoints as the upcoming Spring Boot backend.</p>
            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              <button type="button" className="btn-soft" onClick={() => setConfirm('demo')}><RotateCcw size={16} />Restore demo data</button>
              <button type="button" className="btn-ghost border border-slate-200 text-expense" onClick={() => setConfirm('empty')}><Trash2 size={16} />Start fresh</button>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title={<span className="inline-flex items-center gap-2"><Info size={18} className="text-primary-600" />About</span>}>
        <p className="text-sm text-navy-light">My Finance v0.2. Part of the <b>Artha</b> personal finance project.</p>
      </SectionCard>

      <ConfirmDialog open={!!confirm} danger={confirm === 'empty'} busy={busy} onClose={() => setConfirm(null)} onConfirm={reset}
        title={confirm === 'demo' ? 'Restore demo data?' : 'Start fresh?'} confirmLabel={confirm === 'demo' ? 'Restore' : 'Erase & start fresh'}
        message={confirm === 'demo'
          ? 'All local data will be replaced with the sample accounts, categories and six months of transactions.'
          : 'All local transactions, custom categories and accounts will be erased. Default categories and accounts will be re-created.'} />
    </div>
  );
}
