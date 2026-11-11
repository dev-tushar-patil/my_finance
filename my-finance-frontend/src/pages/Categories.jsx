import { useMemo, useState } from 'react';
import { Plus, Search, ChevronsDownUp, ChevronsUpDown, FolderTree, Eye, EyeOff } from 'lucide-react';
import CategoryTree from '../components/categories/CategoryTree';
import CategoryFormModal from '../components/categories/CategoryFormModal';
import { PageHeader, Segmented, ConfirmDialog, EmptyState, Skeleton } from '../components/ui';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import { categoryService } from '../services/categoryService';
import { CATEGORY_KINDS } from '../utils/constants';

const NOUN = { main: 'main type', sub: 'subtype', item: 'item' };

export default function Categories() {
  const { mutate, version, loadMain } = useCategories();
  const toast = useToast();
  const [kind, setKind] = useState('EXPENSE');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [modal, setModal] = useState(null);   // { level, mode, parent?, entity? }
  const [confirm, setConfirm] = useState(null); // { action, level, node }
  const [busy, setBusy] = useState(false);
  const term = useDebounce(search.trim(), 250);

  // Refetch whenever the category cache version changes (any create/edit/deactivate anywhere in the app).
  const { data: tree, loading } = useAsync(async () => {
    const t = await categoryService.tree(kind, true);
    loadMain(kind); // warm dropdown cache for duplicate checks in the modal
    return t;
  }, [kind, version], { initial: [] });

  const levels = kind === 'EXPENSE' ? 3 : kind === 'INCOME' ? 2 : 1;

  const visible = useMemo(() => {
    const act = (n) => showInactive || n.active;
    const match = (n) => !term || n.name.toLowerCase().includes(term.toLowerCase());
    return (tree || []).filter(act).map((c) => {
      const subs = c.subcategories.filter(act).map((s) => {
        const items = s.items.filter(act).filter((i) => match(i) || match(s) || match(c));
        return { ...s, items };
      }).filter((s) => match(c) || match(s) || s.items.length);
      return { ...c, subcategories: subs };
    }).filter((c) => match(c) || c.subcategories.length);
  }, [tree, term, showInactive]);

  // While searching, expand everything that matched.
  const effectiveExpanded = useMemo(() => {
    if (!term) return expanded;
    const s = new Set();
    visible.forEach((c) => { s.add(`c${c.id}`); c.subcategories.forEach((x) => { if (x.items.length) s.add(`s${x.id}`); }); });
    return s;
  }, [term, visible, expanded]);

  const toggle = (key) => setExpanded((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const expandAll = () => setExpanded(new Set(visible.flatMap((c) => [`c${c.id}`, ...c.subcategories.map((s) => `s${s.id}`)])));
  const collapseAll = () => setExpanded(new Set());
  const allOpen = visible.length > 0 && visible.every((c) => expanded.has(`c${c.id}`));

  const onAction = (action, level, node) => {
    if (action === 'add') {
      // "add" on a main → new subtype under it; on a sub → new item under it
      const childLevel = level === 'main' ? 'sub' : 'item';
      const parentCat = level === 'sub' ? tree.find((c) => c.id === node.categoryId) : null;
      setModal({ level: childLevel, mode: 'create', parent: { ...node, categoryName: parentCat?.name } });
      setExpanded((p) => new Set(p).add(level === 'main' ? `c${node.id}` : `s${node.id}`));
    } else if (action === 'edit') {
      setModal({ level, mode: 'edit', entity: { ...node, type: node.type || kind } });
    } else {
      setConfirm({ action, level, node });
    }
  };

  const runConfirm = async () => {
    const { action, level, node } = confirm;
    setBusy(true);
    try {
      await mutate(level, action, { ...node, type: node.type || kind });
      toast.success(`${node.name} ${action === 'deactivate' ? 'deactivated' : 'reactivated'}`);
      setConfirm(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const t = tree || [];
    return { main: t.filter((c) => c.active).length, sub: t.reduce((s, c) => s + c.subcategories.filter((x) => x.active).length, 0), item: t.reduce((s, c) => s + c.subcategories.reduce((a, x) => a + x.items.filter((i) => i.active).length, 0), 0) };
  }, [tree]);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Category Management" subtitle="Main Type → Subtype → Item. Changes apply instantly to forms, dashboard and reports."
        actions={<button type="button" className="btn-primary" onClick={() => setModal({ level: 'main', mode: 'create' })}><Plus size={18} /><span className="hidden sm:inline">Add Main Type</span></button>} />

      <Segmented options={CATEGORY_KINDS} value={kind} onChange={(k) => { setKind(k); setExpanded(new Set()); setSearch(''); }} className="mb-4 max-w-md" />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories, subtypes, items…" className="field pl-11" />
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-soft flex-1 sm:flex-none" onClick={allOpen ? collapseAll : expandAll} disabled={!!term}>
            {allOpen ? <ChevronsDownUp size={17} /> : <ChevronsUpDown size={17} />}{allOpen ? 'Collapse All' : 'Expand All'}
          </button>
          <button type="button" className="btn-ghost border border-slate-200 bg-white flex-1 sm:flex-none" onClick={() => setShowInactive((v) => !v)}>
            {showInactive ? <EyeOff size={17} /> : <Eye size={17} />}{showInactive ? 'Hide inactive' : 'Show inactive'}
          </button>
        </div>
      </div>

      <p className="text-xs text-navy-muted mb-3">
        {counts.main} main types{levels > 1 && ` · ${counts.sub} subtypes`}{levels > 2 && ` · ${counts.item} items`}
      </p>

      {loading && !tree?.length ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[72px]" />)}</div>
      ) : visible.length ? (
        <CategoryTree tree={visible} expanded={effectiveExpanded} onToggle={toggle} onAction={onAction} term={term} levels={levels} />
      ) : (
        <div className="card"><EmptyState icon={FolderTree} title={term ? 'No matches' : 'No categories yet'} message={term ? `Nothing matches “${term}”.` : 'Create your first main type to get started.'} /></div>
      )}

      <CategoryFormModal open={!!modal} level={modal?.level} mode={modal?.mode} parent={modal?.parent} entity={modal?.entity} kind={kind}
        onClose={() => setModal(null)} />

      <ConfirmDialog open={!!confirm} busy={busy} danger={confirm?.action === 'deactivate'} onClose={() => setConfirm(null)} onConfirm={runConfirm}
        title={confirm?.action === 'deactivate' ? `Deactivate ${NOUN[confirm?.level]}?` : `Reactivate ${NOUN[confirm?.level]}?`}
        confirmLabel={confirm?.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        message={confirm?.action === 'deactivate'
          ? `“${confirm?.node.name}” will be hidden from transaction forms${confirm?.level !== 'item' ? ' along with everything under it' : ''}. ${confirm?.node.usageCount ? `Its ${confirm.node.usageCount} existing transaction(s) keep this category in history and reports.` : 'Nothing is deleted.'}`
          : `“${confirm?.node.name}” will be available in transaction forms again.`} />
    </div>
  );
}
