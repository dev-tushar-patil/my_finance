import api from './apiClient';

const d = (p) => p.then((r) => r.data);

/** Main types */
export const categoryService = {
  list: (type, includeInactive = false) => d(api.get('/categories', { params: { type, includeInactive } })),
  tree: (type, includeInactive = true) => d(api.get('/categories/tree', { params: { type, includeInactive } })),
  create: (payload) => d(api.post('/categories', payload)),
  update: (id, payload) => d(api.put(`/categories/${id}`, payload)),
  deactivate: (id) => d(api.patch(`/categories/${id}/deactivate`)),
  activate: (id) => d(api.patch(`/categories/${id}/activate`)),
};

/** Subtypes */
export const subcategoryService = {
  list: (categoryId, includeInactive = false) => d(api.get(`/categories/${categoryId}/subcategories`, { params: { includeInactive } })),
  create: (categoryId, payload) => d(api.post(`/categories/${categoryId}/subcategories`, payload)),
  update: (id, payload) => d(api.put(`/subcategories/${id}`, payload)),
  deactivate: (id) => d(api.patch(`/subcategories/${id}/deactivate`)),
  activate: (id) => d(api.patch(`/subcategories/${id}/activate`)),
};

/** Items */
export const itemService = {
  list: (subcategoryId, includeInactive = false) => d(api.get(`/subcategories/${subcategoryId}/items`, { params: { includeInactive } })),
  create: (subcategoryId, payload) => d(api.post(`/subcategories/${subcategoryId}/items`, payload)),
  update: (id, payload) => d(api.put(`/category-items/${id}`, payload)),
  deactivate: (id) => d(api.patch(`/category-items/${id}/deactivate`)),
  activate: (id) => d(api.patch(`/category-items/${id}/activate`)),
};
