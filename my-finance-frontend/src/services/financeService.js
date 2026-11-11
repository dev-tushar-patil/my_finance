import api from './apiClient';

const d = (p) => p.then((r) => r.data);

export const transactionService = {
  list: (params) => d(api.get('/transactions', { params })),
  get: (id) => d(api.get(`/transactions/${id}`)),
  create: (payload) => d(api.post('/transactions', payload)),
  update: (id, payload) => d(api.put(`/transactions/${id}`, payload)),
  remove: (id) => d(api.delete(`/transactions/${id}`)),
  transfer: (payload) => d(api.post('/transfers', payload)),
};

export const accountService = {
  list: (includeInactive = false) => d(api.get('/accounts', { params: { includeInactive } })),
  create: (payload) => d(api.post('/accounts', payload)),
  update: (id, payload) => d(api.put(`/accounts/${id}`, payload)),
  deactivate: (id) => d(api.patch(`/accounts/${id}/deactivate`)),
};

export const paymentAppService = {
  list: () => d(api.get('/payment-apps')),
  create: (payload) => d(api.post('/payment-apps', payload)),
};

export const customerService = {
  list: () => d(api.get('/customers')),
  create: (payload) => d(api.post('/customers', payload)),
};

export const personService = {
  list: () => d(api.get('/persons')),
  create: (payload) => d(api.post('/persons', payload)),
};

export const debtService = {
  list: (kind) => d(api.get('/debts', { params: { kind } })),
  settle: (id, payload) => d(api.post(`/debts/${id}/settlements`, payload)),
};

export const dashboardService = {
  summary: (params) => d(api.get('/dashboard/summary', { params })),
  categorySummary: (params) => d(api.get('/dashboard/category-summary', { params })),
  monthlyTrends: (months = 6) => d(api.get('/dashboard/monthly-trends', { params: { months } })),
  accountBalances: () => d(api.get('/dashboard/account-balances')),
};

export const reportService = {
  expenses: (params) => d(api.get('/reports/expenses', { params })),
  income: (params) => d(api.get('/reports/income', { params })),
  investments: (params) => d(api.get('/reports/investments', { params })),
  accounts: (params) => d(api.get('/reports/accounts', { params })),
  netWorth: () => d(api.get('/reports/net-worth')),
  debts: () => d(api.get('/reports/debts')),
};

export const profileService = {
  me: () => d(api.get('/me')),
  update: (payload) => d(api.put('/me', payload)),
  resetDemo: (withDemoData = true) => d(api.post('/demo/reset', { withDemoData })),
};
