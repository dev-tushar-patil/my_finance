import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { categoryService, subcategoryService, itemService } from '../services/categoryService';

/**
 * Central client-side cache for the dynamic MAIN TYPE → SUBTYPE → ITEM hierarchy.
 *
 * - Each level is fetched lazily from the API and cached by parent id.
 * - Every create / update / deactivate re-fetches the affected list (cache invalidation)
 *   and bumps `version`, so any screen showing categories (tree, dashboard, reports) can react.
 * - Concurrent requests for the same list are de-duplicated.
 */
const CategoryContext = createContext(null);

export function CategoryProvider({ children }) {
  const [mainByType, setMainByType] = useState({});
  const [subsByCat, setSubsByCat] = useState({});
  const [itemsBySub, setItemsBySub] = useState({});
  const [loading, setLoading] = useState({});
  const [version, setVersion] = useState(0);
  const inflight = useRef({});

  const fetchOnce = useCallback(async (key, fn) => {
    if (inflight.current[key]) return inflight.current[key];
    setLoading((l) => ({ ...l, [key]: true }));
    const p = fn().finally(() => {
      delete inflight.current[key];
      setLoading((l) => ({ ...l, [key]: false }));
    });
    inflight.current[key] = p;
    return p;
  }, []);

  /* ---------- loaders (cached unless force) */
  const loadMain = useCallback(async (type, force = false) => {
    if (!force && mainByType[type]) return mainByType[type];
    const list = await fetchOnce(`main:${type}`, () => categoryService.list(type));
    setMainByType((m) => ({ ...m, [type]: list }));
    return list;
  }, [mainByType, fetchOnce]);

  const loadSubs = useCallback(async (categoryId, force = false) => {
    if (!categoryId) return [];
    if (!force && subsByCat[categoryId]) return subsByCat[categoryId];
    const list = await fetchOnce(`sub:${categoryId}`, () => subcategoryService.list(categoryId));
    setSubsByCat((m) => ({ ...m, [categoryId]: list }));
    return list;
  }, [subsByCat, fetchOnce]);

  const loadItems = useCallback(async (subcategoryId, force = false) => {
    if (!subcategoryId) return [];
    if (!force && itemsBySub[subcategoryId]) return itemsBySub[subcategoryId];
    const list = await fetchOnce(`item:${subcategoryId}`, () => itemService.list(subcategoryId));
    setItemsBySub((m) => ({ ...m, [subcategoryId]: list }));
    return list;
  }, [itemsBySub, fetchOnce]);

  const bump = () => setVersion((v) => v + 1);

  /* ---------- mutations: always refresh the affected list from the server */
  const createMain = useCallback(async (payload) => {
    const created = await categoryService.create(payload);
    await loadMain(created.type, true);
    bump();
    return created;
  }, [loadMain]);

  const createSub = useCallback(async (categoryId, payload) => {
    const created = await subcategoryService.create(categoryId, payload);
    await Promise.all([loadSubs(categoryId, true), refreshMainContaining(categoryId)]);
    bump();
    return created;
  }, [loadSubs]); // eslint-disable-line react-hooks/exhaustive-deps

  const createItem = useCallback(async (subcategoryId, payload) => {
    const created = await itemService.create(subcategoryId, payload);
    await loadItems(subcategoryId, true);
    bump();
    return created;
  }, [loadItems]);

  // Main-type DTOs carry a subtype preview/count, so refresh the type list the category lives in.
  const refreshMainContaining = async (categoryId) => {
    const type = Object.keys(mainByType).find((t) => mainByType[t]?.some((c) => c.id === categoryId));
    if (type) await loadMain(type, true);
  };

  /**
   * Generic update / deactivate / activate for any level.
   * level: 'main' | 'sub' | 'item'; parentId: category id for subs, subcategory id for items, type for main.
   */
  const mutate = useCallback(async (level, action, entity, payload) => {
    const svc = { main: categoryService, sub: subcategoryService, item: itemService }[level];
    const result = action === 'update' ? await svc.update(entity.id, payload) : await svc[action](entity.id);
    if (level === 'main') await loadMain(entity.type, true);
    if (level === 'sub') {
      await loadSubs(entity.categoryId, true);
      await refreshMainContaining(entity.categoryId);
    }
    if (level === 'item') await loadItems(entity.subcategoryId, true);
    bump();
    return result;
  }, [loadMain, loadSubs, loadItems]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Drop all cached lists (e.g. after demo reset). */
  const invalidateAll = useCallback(() => {
    setMainByType({}); setSubsByCat({}); setItemsBySub({}); bump();
  }, []);

  const value = useMemo(() => ({
    mainByType, subsByCat, itemsBySub, loading, version,
    loadMain, loadSubs, loadItems, createMain, createSub, createItem, mutate, invalidateAll,
  }), [mainByType, subsByCat, itemsBySub, loading, version, loadMain, loadSubs, loadItems, createMain, createSub, createItem, mutate, invalidateAll]);

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export const useCategories = () => {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error('useCategories must be used inside <CategoryProvider>');
  return ctx;
};
