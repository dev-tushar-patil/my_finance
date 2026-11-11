// Fixed application enums (mirror the backend Java enums).
// These are NOT categories — categories always come from the API.

export const TXN_TYPE_META = {
  EXPENSE: { label: 'Expense', color: 'text-expense', bg: 'bg-expense-soft' },
  INCOME: { label: 'Income', color: 'text-income', bg: 'bg-income-soft' },
  INVESTMENT: { label: 'Investment', color: 'text-invest', bg: 'bg-invest-soft' },
  BORROW: { label: 'Borrowed', color: 'text-sky-600', bg: 'bg-sky-50' },
  GIVE: { label: 'Given', color: 'text-orange-600', bg: 'bg-orange-50' },
  REPAYMENT: { label: 'Repaid', color: 'text-sky-600', bg: 'bg-sky-50' },
  COLLECTION: { label: 'Collected', color: 'text-orange-600', bg: 'bg-orange-50' },
  TRANSFER: { label: 'Transfer', color: 'text-primary-600', bg: 'bg-lavender' },
};

/** Effect of each transaction type on the account it touches (+ inflow, - outflow). */
export const ACCOUNT_EFFECT = {
  EXPENSE: -1, INCOME: 1, INVESTMENT: -1, BORROW: 1, GIVE: -1, REPAYMENT: -1, COLLECTION: 1, TRANSFER: -1,
};

/** Category "kind" — which transaction type a main category belongs to. */
export const CATEGORY_KINDS = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'INVESTMENT', label: 'Investment' },
];

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', accountTypes: ['CASH'] },
  { value: 'UPI', label: 'UPI', accountTypes: ['SAVINGS', 'CURRENT'], needsApp: true },
  { value: 'NET_BANKING', label: 'Net Banking', accountTypes: ['SAVINGS', 'CURRENT'] },
  { value: 'DEBIT_CARD', label: 'Debit Card', accountTypes: ['DEBIT_CARD', 'SAVINGS', 'CURRENT'] },
  { value: 'CREDIT_CARD', label: 'Credit Card', accountTypes: ['CREDIT_CARD'] },
];

export const paymentMethodLabel = (v) => PAYMENT_METHODS.find((m) => m.value === v)?.label || v || '—';

export const ACCOUNT_TYPES = [
  { value: 'CASH', label: 'Cash Wallet', group: 'Cash' },
  { value: 'SAVINGS', label: 'Savings Account', group: 'Bank' },
  { value: 'CURRENT', label: 'Current Account', group: 'Bank' },
  { value: 'CREDIT_CARD', label: 'Credit Card', group: 'Cards', liability: true },
  { value: 'DEBIT_CARD', label: 'Debit Card', group: 'Cards' },
];

export const UPI_PROVIDERS = [
  { value: 'GPAY', label: 'Google Pay', short: 'GPay', deepLink: 'tez://upi/pay', color: '#4285F4' },
  { value: 'PHONEPE', label: 'PhonePe', short: 'PhonePe', deepLink: 'phonepe://pay', color: '#5F259F' },
  { value: 'PAYTM', label: 'Paytm', short: 'Paytm', deepLink: 'paytmmp://pay', color: '#00BAF2' },
  { value: 'OTHER', label: 'Other UPI', short: 'UPI', deepLink: 'upi://pay', color: '#673AB7' },
];

// Categorical palette — fixed order, validated for CVD separation (dataviz validator).
// Never cycled: series beyond 7 fold into "Other" (OTHER_COLOR).
export const CHART_COLORS = ['#673AB7', '#F59E0B', '#2563EB', '#E11D48', '#0D9488', '#F97316', '#8B5CF6'];
export const OTHER_COLOR = '#94A3B8';
export const SERIES = { income: '#16A34A', expense: '#E53935', investment: '#E0A100' };

/** Keep the top N rows, fold the rest into one "Other" row (not drillable). */
export function foldOther(rows, max = CHART_COLORS.length) {
  if (rows.length <= max) return rows.map((r, i) => ({ ...r, color: CHART_COLORS[i] }));
  const top = rows.slice(0, max - 1).map((r, i) => ({ ...r, color: CHART_COLORS[i] }));
  const rest = rows.slice(max - 1);
  const amount = rest.reduce((s, r) => s + r.amount, 0);
  const percent = rest.reduce((s, r) => s + (r.percent || 0), 0);
  return [...top, { key: '__other', id: null, label: `Other (${rest.length})`, amount, percent: Math.round(percent * 100) / 100, count: rest.reduce((s, r) => s + r.count, 0), color: OTHER_COLOR, folded: rest }];
}
