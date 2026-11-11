import { useEffect, useMemo, useState } from 'react';
import SmartSelect from '../ui/SmartSelect';
import { CategoryIcon } from '../ui';
import CategoryFormModal from './CategoryFormModal';
import { useCategories } from '../../context/CategoryContext';

/**
 * Dependent MAIN TYPE → SUBTYPE → ITEM dropdowns, fully API-driven.
 *
 * Rules enforced here:
 *  - Subtype is locked until a main type is selected; item is locked until a subtype is selected.
 *  - Changing main type clears subtype + item; changing subtype clears item.
 *  - "+ Add New …" at every level opens a small modal; the created node is attached to the
 *    currently selected parent, the list is re-fetched, and the new node is auto-selected.
 *
 * value: { categoryId, subcategoryId, itemId }   onChange(nextValue)
 * levels: 1 | 2 | 3 — how many levels to show (income/investment forms use fewer)
 */
export default function CategoryCascade({
  type = 'EXPENSE', value, onChange, errors = {}, levels = 3,
  labels = { main: 'Main Type', sub: 'Subtype', item: 'Item' }, requiredLevels = levels, className = 'space-y-4', allowAdd = true,
}) {
  const { mainByType, subsByCat, itemsBySub, loadMain, loadSubs, loadItems, loading } = useCategories();
  const [modal, setModal] = useState(null); // { level, parent, initialName }

  const { categoryId, subcategoryId, itemId } = value;

  useEffect(() => { loadMain(type); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (categoryId && levels > 1) loadSubs(categoryId); }, [categoryId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (subcategoryId && levels > 2) loadItems(subcategoryId); }, [subcategoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const mains = mainByType[type] || [];
  const subs = (categoryId && subsByCat[categoryId]) || [];
  const items = (subcategoryId && itemsBySub[subcategoryId]) || [];

  const selectedMain = mains.find((c) => c.id === categoryId);
  const selectedSub = subs.find((s) => s.id === subcategoryId);

  const mainOptions = useMemo(() => mains.map((c) => ({
    value: c.id, label: c.name, hint: c.preview || c.description, icon: <CategoryIcon iconKey={c.icon} id={c.id} size="sm" />,
  })), [mains]);
  const subOptions = useMemo(() => subs.map((s) => ({ value: s.id, label: s.name, hint: s.itemCount ? `${s.itemCount} items` : undefined })), [subs]);
  const itemOptions = useMemo(() => items.map((i) => ({ value: i.id, label: i.name })), [items]);

  const setMain = (id) => { if (id !== categoryId) onChange({ categoryId: id, subcategoryId: null, itemId: null }); };
  const setSub = (id) => { if (id !== subcategoryId) onChange({ categoryId, subcategoryId: id, itemId: null }); };
  const setItem = (id) => onChange({ categoryId, subcategoryId, itemId: id });

  const onSaved = (created) => {
    if (modal.level === 'main') setMain(created.id);
    if (modal.level === 'sub') setSub(created.id);
    if (modal.level === 'item') setItem(created.id);
  };

  const req = (n) => requiredLevels >= n;

  return (
    <div className={className}>
      <SmartSelect id="cat-main" label={labels.main} required={req(1)} value={categoryId} options={mainOptions} onChange={setMain}
        placeholder={`Select ${labels.main.toLowerCase()}`} loading={loading[`main:${type}`]} error={errors.categoryId}
        icon={selectedMain && <CategoryIcon iconKey={selectedMain.icon} id={selectedMain.id} size="sm" />}
        addNewLabel={`Add New ${labels.main}`} onAddNew={allowAdd ? (q) => setModal({ level: 'main', initialName: q }) : undefined} />

      {levels > 1 && (
        <SmartSelect id="cat-sub" label={labels.sub} required={req(2)} value={subcategoryId} options={subOptions} onChange={setSub}
          disabled={!categoryId} disabledHint={`Select ${labels.main.toLowerCase()} first`}
          placeholder={`Select ${labels.sub.toLowerCase()}`} loading={categoryId && loading[`sub:${categoryId}`]} error={errors.subcategoryId}
          addNewLabel={`Add New ${labels.sub}`} onAddNew={allowAdd ? (q) => setModal({ level: 'sub', parent: selectedMain, initialName: q }) : undefined} />
      )}

      {levels > 2 && (
        <SmartSelect id="cat-item" label={labels.item} required={req(3)} value={itemId} options={itemOptions} onChange={setItem}
          disabled={!subcategoryId} disabledHint={`Select ${labels.sub.toLowerCase()} first`}
          placeholder={`Select ${labels.item.toLowerCase()}`} loading={subcategoryId && loading[`item:${subcategoryId}`]} error={errors.itemId}
          addNewLabel={`Add New ${labels.item}`}
          onAddNew={allowAdd ? (q) => setModal({ level: 'item', parent: selectedSub && { ...selectedSub, categoryName: selectedMain?.name }, initialName: q }) : undefined} />
      )}

      <CategoryFormModal open={!!modal} level={modal?.level} parent={modal?.parent} kind={type} initialName={modal?.initialName}
        onClose={() => setModal(null)} onSaved={onSaved} />
    </div>
  );
}
