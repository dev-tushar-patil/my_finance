/**
 * In-browser persistence used by the mock API (Phases 1–2).
 * Tables mirror the planned MySQL schema so the switch to Spring Boot is 1:1.
 */
import {
  DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_PAYMENT_APPS, DEFAULT_CUSTOMERS, DEFAULT_PERSONS,
} from './seed';

const STORAGE_KEY = 'myfinance.db.v1';

const TABLES = ['categories', 'subcategories', 'categoryItems', 'accounts', 'paymentApps', 'customers', 'persons', 'transactions'];

let db = null;

const now = () => new Date().toISOString();
/** Local date-time string (like Java LocalDateTime): 2026-11-11T08:45:00 */
export const localISO = (dt = new Date()) => new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
export const localDay = (dt = new Date()) => localISO(dt).slice(0, 10);

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function emptyDb() {
  const d = { seq: {}, user: { id: 1, name: 'Tushar', email: 'tushar@example.com' } };
  TABLES.forEach((t) => { d[t] = []; d.seq[t] = 0; });
  return d;
}

export function insert(table, row) {
  db.seq[table] += 1;
  const rec = { id: db.seq[table], userId: db.user.id, createdAt: now(), updatedAt: now(), ...row };
  db[table].push(rec);
  return rec;
}

export function update(table, id, patch) {
  const rec = db[table].find((r) => r.id === Number(id));
  if (!rec) return null;
  Object.assign(rec, patch, { updatedAt: now() });
  return rec;
}

export function remove(table, id) {
  db[table] = db[table].filter((r) => r.id !== Number(id));
}

export const table = (name) => db[name];
export const findById = (name, id) => db[name].find((r) => r.id === Number(id)) || null;
export const getUser = () => db.user;

export function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* storage full / disabled */ }
}

/* ---------------------------------------------------------------- seeding */

function seedCategories() {
  DEFAULT_CATEGORIES.forEach(([type, name, icon, description, subs], ci) => {
    const cat = insert('categories', { type, name, icon, description, active: true, sortOrder: ci });
    Object.entries(subs).forEach(([subName, items], si) => {
      const sub = insert('subcategories', { categoryId: cat.id, name: subName, active: true, sortOrder: si });
      items.forEach((itemName, ii) => insert('categoryItems', { subcategoryId: sub.id, name: itemName, active: true, sortOrder: ii }));
    });
  });
}

function seedAccounts() {
  const open = new Date();
  open.setMonth(open.getMonth() - 6, 1);
  const openingBalanceDate = localDay(open);
  DEFAULT_ACCOUNTS.forEach((a) => insert('accounts', { ...a, openingBalanceDate, active: true }));
  DEFAULT_PAYMENT_APPS.forEach((p) => {
    const acc = db.accounts.find((a) => a.name === p.linkedAccount);
    insert('paymentApps', { name: p.name, provider: p.provider, upiId: p.upiId, linkedAccountId: acc?.id ?? null, active: true });
  });
  DEFAULT_CUSTOMERS.forEach((name) => insert('customers', { name, phone: null, active: true }));
  DEFAULT_PERSONS.forEach((name) => insert('persons', { name, phone: null, active: true }));
}

/** Deterministic PRNG so demo data looks the same on every fresh seed. */
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedDemoTransactions() {
  const rand = rng(20261111);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (lo, hi, step = 10) => Math.round((lo + rand() * (hi - lo)) / step) * step;

  const cat = (type, name) => db.categories.find((c) => c.type === type && c.name === name);
  const sub = (c, name) => db.subcategories.find((s) => s.categoryId === c.id && s.name === name);
  const item = (s, name) => (s ? db.categoryItems.find((i) => i.subcategoryId === s.id && i.name === name) : null);
  const acc = (name) => db.accounts.find((a) => a.name === name);
  const app = (name) => db.paymentApps.find((p) => p.name === name);
  const named = (t, name) => db[t].find((r) => r.name === name);

  const hdfc = acc('HDFC Bank'); const cbi = acc('Central Bank of India');
  const cash = acc('Cash Wallet'); const cc = acc('HDFC Credit Card');
  const gpay = app('Google Pay'); const phonepe = app('PhonePe');

  const today = new Date();
  const txns = [];
  const ccSpend = {}; // card spend per month → paid in full on the 15th of the next month
  const at = (y, m, d, h = 10, min = 0) => {
    const dt = new Date(y, m, d, h, min);
    return dt <= today ? localISO(dt) : null;
  };

  const expense = (date, catName, subName, itemName, amount, narration, method) => {
    if (!date) return;
    const c = cat('EXPENSE', catName); const s = sub(c, subName); const i = item(s, itemName);
    const via = {
      GPAY: { paymentMethod: 'UPI', paymentAppId: gpay.id, accountId: hdfc.id },
      PHONEPE: { paymentMethod: 'UPI', paymentAppId: phonepe.id, accountId: cbi.id },
      CASH: { paymentMethod: 'CASH', paymentAppId: null, accountId: cash.id },
      CC: { paymentMethod: 'CREDIT_CARD', paymentAppId: null, accountId: cc.id },
      NB: { paymentMethod: 'NET_BANKING', paymentAppId: null, accountId: hdfc.id },
    }[method];
    if (method === 'CC') ccSpend[date.slice(0, 7)] = (ccSpend[date.slice(0, 7)] || 0) + amount;
    txns.push({ type: 'EXPENSE', date, amount, categoryId: c.id, subcategoryId: s?.id ?? null, itemId: i?.id ?? null, narration, ...via });
  };

  for (let back = 5; back >= 0; back -= 1) {
    const base = new Date(today.getFullYear(), today.getMonth() - back, 1);
    const y = base.getFullYear(); const m = base.getMonth();
    const days = new Date(y, m + 1, 0).getDate();

    // Income
    const salary = cat('INCOME', 'Salary');
    const sd = at(y, m, 1, 9, 30);
    if (sd) txns.push({ type: 'INCOME', date: sd, amount: 85000, categoryId: salary.id, subcategoryId: sub(salary, 'Monthly Salary').id, accountId: hdfc.id, paymentMethod: 'NET_BANKING', narration: 'Salary credited' });
    if (back % 2 === 0 || back === 0) {
      const fl = cat('INCOME', 'Freelancing');
      const fd = at(y, m, Math.min(18, days), 17, 30);
      if (fd) txns.push({ type: 'INCOME', date: fd, amount: 15000, categoryId: fl.id, subcategoryId: sub(fl, 'Website Development').id, accountId: hdfc.id, paymentMethod: 'UPI', customerId: named('customers', 'Gaurav').id, project: 'Jayashree Construction Website', narration: 'Freelance - Jayashree Construction website milestone' });
    }

    // Fixed expenses
    expense(at(y, m, 3, 11), 'Accommodation', 'House Rent', 'Monthly Rent', 12000, 'Monthly house rent', 'GPAY');
    expense(at(y, m, 7, 20), 'Bills & Utilities', 'Electricity', 'Electricity Bill', between(900, 1600), 'MSEB electricity bill', 'GPAY');
    expense(at(y, m, 9, 21), 'Bills & Utilities', 'Mobile Recharge', 'Mobile Recharge', 299, 'Jio recharge', 'PHONEPE');
    expense(at(y, m, 10, 21), 'Bills & Utilities', 'Internet', 'Broadband', 799, 'Airtel broadband', 'NB');
    expense(at(y, m, 12, 19), 'Grooming', 'Salon', 'Haircut', 150, 'Haircut at salon', 'CASH');

    // Daily food
    for (let d = 1; d <= days; d += 1) {
      if (rand() < 0.6) expense(at(y, m, d, 8, 45), 'Food', 'Breakfast', pick(['Poha', 'Upma', 'Idli', 'Idli Sambar', 'Dosa', 'Tea', 'Vada Sambar']), between(20, 90), pick(['Breakfast at office canteen', 'Breakfast at hotel', 'Morning breakfast']), pick(['GPAY', 'GPAY', 'CASH']));
      if (rand() < 0.35) expense(at(y, m, d, 13, 15), 'Food', 'Lunch', pick(['Rice Plate', 'Full Thali', 'Chapati Bhaji', 'Office Lunch', 'Biryani']), between(80, 220), 'Lunch', pick(['GPAY', 'PHONEPE', 'CASH']));
      if (rand() < 0.2) expense(at(y, m, d, 17, 30), 'Food', 'Snacks', pick(['Vada Pav', 'Samosa', 'Misal Pav', 'Pav Bhaji']), between(20, 120), 'Evening snacks', 'CASH');
    }
    for (let k = 0; k < 4; k += 1) expense(at(y, m, 2 + k * 7, 7, 20), 'Vehicle', 'Bike', 'Petrol', between(300, 800, 50), 'Bike petrol', 'PHONEPE');
    for (let k = 0; k < 4; k += 1) expense(at(y, m, 4 + k * 7, 18, 40), 'Vegetables & Fruits', pick(['Vegetables', 'Fruits']), pick(['Onion', 'Potato', 'Tomato', 'Banana', 'Apple']), between(60, 320), 'Weekly vegetables & fruits', 'CASH');
    expense(at(y, m, 6, 18), 'Grocery', 'Grocery Shopping', pick(['Rice', 'Wheat', 'Oil']), between(1500, 3200), 'Monthly grocery - DMart', 'CC');
    expense(at(y, m, 20, 18), 'Grocery', 'Dairy Products', 'Milk', between(600, 900), 'Monthly milk bill', 'GPAY');
    expense(at(y, m, between(11, 26, 1), 20, 10), 'Doctor & Medical', pick(['Pharmacy', 'Doctor Consultation', 'Medical Tests']), pick(['Medicines', 'Doctor Fees', 'Blood Test']), between(250, 1500), 'Medical', pick(['CC', 'GPAY']));
    expense(at(y, m, between(13, 27, 1), 16), 'Lifestyle', pick(['Clothing', 'Entertainment', 'Footwear']), pick(['T-Shirts', 'Movie Tickets', 'Shoes', 'Jeans']), between(400, 3000), 'Lifestyle shopping', 'CC');
    if (rand() < 0.5) expense(at(y, m, 24, 15), 'Vehicle', 'Bike', pick(['Servicing', 'Washing', 'PUC']), between(100, 1200), 'Bike upkeep', 'CASH');

    // Investments
    const sip = cat('INVESTMENT', 'SIP');
    const ipd = at(y, m, 5, 10);
    if (ipd) txns.push({ type: 'INVESTMENT', date: ipd, amount: 5000, categoryId: sip.id, accountId: hdfc.id, paymentMethod: 'NET_BANKING', units: round2(5000 / (52 + back)), provider: 'Axis Bluechip Fund', narration: 'Monthly SIP' });

    // Transfers: ATM withdrawal + credit card bill payment (not expenses)
    const td = at(y, m, 2, 12);
    if (td) txns.push({ type: 'TRANSFER', date: td, amount: 3000, accountId: hdfc.id, toAccountId: cash.id, paymentMethod: 'NET_BANKING', narration: 'ATM cash withdrawal' });
    if (back > 0) {
      const cd = at(y, m, 15, 11);
      const prev = new Date(y, m - 1, 1);
      const due = ccSpend[localISO(prev).slice(0, 7)] || 0;
      if (cd && due > 0) txns.push({ type: 'TRANSFER', date: cd, amount: due, accountId: hdfc.id, toAccountId: cc.id, paymentMethod: 'NET_BANKING', narration: 'HDFC credit card bill payment' });
    }
  }

  // One-off: gold, borrow / give with partial settlements
  const g = new Date(today.getFullYear(), today.getMonth() - 3, 14, 12);
  txns.push({ type: 'INVESTMENT', date: localISO(g), amount: 15000, categoryId: cat('INVESTMENT', 'Gold').id, accountId: hdfc.id, paymentMethod: 'UPI', paymentAppId: gpay.id, units: 2, provider: 'Tanishq', narration: '2 g gold coin' });

  const b = new Date(today.getFullYear(), today.getMonth() - 2, 8, 19);
  const due = localDay(new Date(today.getFullYear(), today.getMonth() + 1, 8));
  txns.push({ type: 'BORROW', date: localISO(b), amount: 10000, personId: named('persons', 'Amit').id, accountId: hdfc.id, paymentMethod: 'UPI', dueDate: due, narration: 'Borrowed for bike repair', _key: 'borrow1' });
  const gv = new Date(today.getFullYear(), today.getMonth() - 1, 3, 20);
  const exp = localDay(new Date(today.getFullYear(), today.getMonth() + 1, 3));
  txns.push({ type: 'GIVE', date: localISO(gv), amount: 5000, personId: named('persons', 'Sneha').id, accountId: cbi.id, paymentMethod: 'UPI', dueDate: exp, narration: 'Lent for college fees', _key: 'give1' });

  txns.sort((x, y) => x.date.localeCompare(y.date));
  const keyed = {};
  txns.forEach(({ _key, ...t }) => {
    const rec = insert('transactions', { categoryId: null, subcategoryId: null, itemId: null, paymentAppId: null, toAccountId: null, customerId: null, personId: null, project: null, units: null, provider: null, dueDate: null, parentId: null, ...t });
    if (_key) keyed[_key] = rec;
  });

  const r1 = new Date(today.getFullYear(), today.getMonth() - 1, 10, 18);
  insert('transactions', { type: 'REPAYMENT', date: localISO(r1), amount: 4000, personId: keyed.borrow1.personId, accountId: hdfc.id, paymentMethod: 'UPI', parentId: keyed.borrow1.id, narration: 'Part repayment to Amit' });
  const c1 = new Date(Math.min(Date.now(), new Date(today.getFullYear(), today.getMonth(), 2, 18).getTime()));
  insert('transactions', { type: 'COLLECTION', date: localISO(c1), amount: 2000, personId: keyed.give1.personId, accountId: cbi.id, paymentMethod: 'UPI', parentId: keyed.give1.id, narration: 'Sneha returned part amount' });
}

export function resetDb({ withDemoData = true } = {}) {
  db = emptyDb();
  seedCategories();
  seedAccounts();
  if (withDemoData) seedDemoTransactions();
  persist();
}

export function initDb() {
  if (db) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { db = JSON.parse(raw); return; }
  } catch { /* corrupted or unavailable storage → reseed */ }
  resetDb();
}
