import { useEffect, useMemo, useState } from 'react';
import { FolderPlus, Layers, Tag, Pencil } from 'lucide-react';
import Modal from '../ui/Modal';
import { Field, TextInput, Spinner } from '../ui';
import { useCategories } from '../../context/CategoryContext';
import { useToast } from '../../context/ToastContext';
import { ICON_KEYS, getIcon } from '../../utils/icons';
import { cx } from '../../utils/format';

const LEVEL_META = {
  main: { noun: 'Main Type', icon: FolderPlus, placeholder: 'e.g. Pet Care' },
  sub: { noun: 'Subtype', icon: Layers, placeholder: 'e.g. Midnight Snacks' },
  item: { noun: 'Item', icon: Tag, placeholder: 'e.g. Sabudana Khichdi' },
};

/**
 * Create or edit a category at any level of the hierarchy.
 *
 * level:  'main' | 'sub' | 'item'
 * parent: the category (for 'sub') or subcategory (for 'item') the new node belongs to
 * entity: existing node when editing
 * kind:   EXPENSE | INCOME | INVESTMENT (for 'main')
 */
export default function CategoryFormModal({ open, level, mode = 'create', parent, entity, kind = 'EXPENSE', initialName = '', onClose, onSaved }) {
  const { createMain, createSub, createItem, mutate, mainByType, subsByCat, itemsBySub } = useCategories();
  const toast = useToast();
  const meta = LEVEL_META[level] || LEVEL_META.main;
  const isEdit = mode === 'edit';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('tag');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(isEdit ? entity?.name ?? '' : initialName);
    setDescription(isEdit ? entity?.description ?? '' : '');
    setIcon(isEdit ? entity?.icon || 'tag' : 'tag');
    setError(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Siblings already in cache → instant client-side duplicate feedback (server re-validates).
  const siblings = useMemo(() => {
    if (level === 'main') return mainByType[isEdit ? entity?.type : kind] || [];
    if (level === 'sub') return subsByCat[isEdit ? entity?.categoryId : parent?.id] || [];
    return itemsBySub[isEdit ? entity?.subcategoryId : parent?.id] || [];
  }, [level, isEdit, entity, parent, kind, mainByType, subsByCat, itemsBySub]);

  const trimmed = name.trim().replace(/\s+/g, ' ');
  const duplicate = trimmed && siblings.some((s) => s.active !== false && s.id !== entity?.id && s.name.toLowerCase() === trimmed.toLowerCase());

  const submit = async (e) => {
    e?.preventDefault();
    if (!trimmed) { setError('Name is required'); return; }
    if (duplicate) { setError(`“${trimmed}” already exists here`); return; }
    setSaving(true);
    setError(null);
    try {
      let saved;
      const payload = level === 'main' ? { name: trimmed, description: description.trim() || null, icon, type: entity?.type || kind } : { name: trimmed };
      if (isEdit) saved = await mutate(level, 'update', entity, payload);
      else if (level === 'main') saved = await createMain(payload);
      else if (level === 'sub') saved = await createSub(parent.id, payload);
      else saved = await createItem(parent.id, payload);
      toast.success(isEdit ? `${meta.noun} updated` : `${meta.noun} “${saved.name}” added`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.errors?.name || err.message);
    } finally {
      setSaving(false);
    }
  };

  const contextLine = level === 'sub' && parent ? `Under ${parent.name}`
    : level === 'item' && parent ? `Under ${parent.categoryName ? `${parent.categoryName} › ` : ''}${parent.name}`
      : level === 'main' ? `${(entity?.type || kind).charAt(0)}${(entity?.type || kind).slice(1).toLowerCase()} category` : null;

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} icon={isEdit ? Pencil : meta.icon}
      title={isEdit ? `Edit ${meta.noun}` : `Add New ${meta.noun}`} subtitle={contextLine}
      footer={(
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="category-form" className="btn-primary min-w-[110px]" disabled={saving || !trimmed}>
            {saving && <Spinner size={16} className="text-white" />}{saving ? 'Saving…' : 'Save'}
          </button>
        </>
      )}>
      <form id="category-form" onSubmit={submit} className="space-y-4">
        <Field label={`${meta.noun} Name`} required error={error || (duplicate ? `“${trimmed}” already exists here` : null)}>
          <TextInput autoFocus value={name} maxLength={60} placeholder={meta.placeholder} error={error || duplicate}
            onChange={(e) => { setName(e.target.value); setError(null); }} />
        </Field>
        {level === 'main' && (
          <>
            <Field label="Description" hint="Optional">
              <TextInput value={description} maxLength={120} placeholder="Short description" onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Icon" hint="Optional">
              <div className="grid grid-cols-8 gap-1.5 max-h-36 overflow-y-auto scrollbar-thin p-0.5">
                {ICON_KEYS.map((k) => {
                  const I = getIcon(k);
                  return (
                    <button key={k} type="button" onClick={() => setIcon(k)} aria-label={k} title={k}
                      className={cx('aspect-square rounded-lg grid place-items-center transition', icon === k ? 'bg-primary-600 text-white' : 'bg-slate-50 text-navy-light hover:bg-lavender')}>
                      <I size={17} />
                    </button>
                  );
                })}
              </div>
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}
