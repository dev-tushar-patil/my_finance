/**
 * Mock REST API for Phases 1–2. Implements the same contract the Spring Boot backend will expose
 * (paths, query params, DTO shapes, Spring Page shape, error shape { status, message, errors }).
 * It is wired in as an axios adapter, so services/components are unaware of it.
 */
import {
  initDb, resetDb, persist, table, findById, insert, update, remove, round2, getUser, localDay,
} from './mockDb';
import { ACCOUNT_EFFECT, ACCOUNT_TYPES, PAYMENT_METHODS } from '../../utils/constants';

class ApiError extends Error {
  constructor(status, message, errors) { super(message); this.status = status; this.errors = errors; }
}
const badRequest = (message, errors) => new ApiError(400, message, errors);
const notFound = (what) => new ApiError(404, `${what} not found`);
const conflict = (message) => new ApiError(409, message);

/* ------------------------------------------------------------------ helpers */

const cleanName = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
const bool = (v) => v === true || v === 'true';
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
const bySort = (a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id) || a.name.localeCompare(b.name);
const dayOf = (iso) => iso.slice(0, 10);

function requireName(body, field = 'name') {
  const name = cleanName(body[field]);
  if (!name) throw badRequest('Validation failed', { [field]: 'Name is required' });
  if (name.length > 60) throw badRequest('Validation failed', { [field]: 'Name must be at most 60 characters' });
  return name;
}

function assertUnique(rows, name, excludeId, scopeLabel) {
  const clash = rows.find((r) => r.active && r.id !== excludeId && r.name.toLowerCase() === name.toLowerCase());
  if (clash) throw conflict(`"${name}" already exists ${scopeLabel}`);
}

const owned = (tableName, id, label) => {
  const rec = findById(tableName, id);
  if (!rec || rec.userId !== getUser().id) throw notFound(label);
  return rec;
};

function page(list, query) {
  const size = Math.min(Math.max(Number(query.size) || 20, 1), 200);
  const p = Math.max(Number(query.page) || 0, 0);
  const totalElements = list.length;
  return {
    content: list.slice(p * size, p * size + size),
    page: p, size, totalElements, totalPages: Math.max(1, Math.ceil(totalElements / size)),
    first: p === 0, last: (p + 1) * size >= totalElements,
  };
}

/* ------------------------------------------------------------ category DTOs */

const subsOf = (catId, includeInactive) => table('subcategories').filter((s) => s.categoryId === catId && (includeInactive || s.active)).sort(bySort);
const itemsOf = (subId, includeInactive) => table('categoryItems').filter((i) => i.subcategoryId === subId && (includeInactive || i.active)).sort(bySort);
const usage = (field, id) => table('transactions').filter((t) => t[field] === id).length;

const catDto = (c) => {
  const subs = subsOf(c.id, false);
  return {
    id: c.id, type: c.type, name: c.name, description: c.description, icon: c.icon, active: c.active,
    subcategoryCount: subs.length, preview: subs.slice(0, 4).map((s) => s.name).join(', '),
    createdAt: c.createdAt, updatedAt: c.updatedAt,
  };
};
const subDto = (s) => ({ id: s.id, categoryId: s.categoryId, name: s.name, active: s.active, itemCount: itemsOf(s.id, false).length });
const itemDto = (i) => ({ id: i.id, subcategoryId: i.subcategoryId, name: i.name, active: i.active });

/* ------------------------------------------------------------ balances */

function accountBalances(asOf) {
  const bal = {};
  table('accounts').forEach((a) => { bal[a.id] = Number(a.openingBalance) || 0; });
  table('transactions').forEach((t) => {
    if (asOf && t.date >= asOf) return;
    const eff = ACCOUNT_EFFECT[t.type] || 0;
    if (t.accountId != null && bal[t.accountId] !== undefined) bal[t.accountId] += eff * t.amount;
    if (t.type === 'TRANSFER' && t.toAccountId != null && bal[t.toAccountId] !== undefined) bal[t.toAccountId] += t.amount;
  });
  Object.keys(bal).forEach((k) => { bal[k] = round2(bal[k]); });
  return bal;
}

const isLiquid = (a) => ['CASH', 'SAVINGS', 'CURRENT', 'DEBIT_CARD'].includes(a.type);

function accountDto(a, balances = accountBalances()) {
  const balance = balances[a.id] ?? 0;
  return {
    id: a.id, name: a.name, bankName: a.bankName, type: a.type,
    typeLabel: ACCOUNT_TYPES.find((t) => t.value === a.type)?.label,
    maskedNumber: a.maskedNumber, openingBalance: a.openingBalance, openingBalanceDate: a.openingBalanceDate,
    creditLimit: a.creditLimit, active: a.active, balance,
    availableCredit: a.type === 'CREDIT_CARD' && a.creditLimit ? round2(a.creditLimit + balance) : null,
  };
}

function debtRecords(kind) {
  const childType = kind === 'BORROW' ? 'REPAYMENT' : 'COLLECTION';
  const txns = table('transactions');
  return txns.filter((t) => t.type === kind).map((t) => {
    const history = txns.filter((c) => c.parentId === t.id && c.type === childType).sort((a, b) => a.date.localeCompare(b.date));
    const settled = round2(history.reduce((s, c) => s + c.amount, 0));
    const outstanding = round2(t.amount - settled);
    const overdue = outstanding > 0 && t.dueDate && t.dueDate < localDay();
    return {
      ...enrichTxn(t), settled, outstanding,
      status: outstanding <= 0 ? 'SETTLED' : overdue ? 'OVERDUE' : settled > 0 ? 'PARTIAL' : 'OPEN',
      history: history.map(enrichTxn),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

const outstandingTotal = (kind) => round2(debtRecords(kind).reduce((s, d) => s + Math.max(d.outstanding, 0), 0));

/* ------------------------------------------------------------ transactions */

function enrichTxn(t) {
  const c = t.categoryId ? findById('categories', t.categoryId) : null;
  const s = t.subcategoryId ? findById('subcategories', t.subcategoryId) : null;
  const i = t.itemId ? findById('categoryItems', t.itemId) : null;
  const a = t.accountId ? findById('accounts', t.accountId) : null;
  const ta = t.toAccountId ? findById('accounts', t.toAccountId) : null;
  const app = t.paymentAppId ? findById('paymentApps', t.paymentAppId) : null;
  const cu = t.customerId ? findById('customers', t.customerId) : null;
  const pe = t.personId ? findById('persons', t.personId) : null;
  return {
    ...t,
    // Live names resolve through FK (deactivated categories still resolve); snapshots keep the name at entry time.
    categoryName: c?.name ?? t.categoryNameSnapshot ?? null, categoryIcon: c?.icon ?? null,
    subcategoryName: s?.name ?? t.subcategoryNameSnapshot ?? null,
    itemName: i?.name ?? t.itemNameSnapshot ?? null,
    accountName: a?.name ?? null, accountType: a?.type ?? null, toAccountName: ta?.name ?? null,
    paymentAppName: app?.name ?? null, paymentAppProvider: app?.provider ?? null,
    customerName: cu?.name ?? null, personName: pe?.name ?? null,
  };
}

function txnTitle(t) {
  if (t.itemName && t.subcategoryName) return t.itemName.toLowerCase() === t.subcategoryName.toLowerCase() ? t.itemName : `${t.itemName} - ${t.subcategoryName}`;
  if (t.type === 'TRANSFER') return `${t.accountName} → ${t.toAccountName}`;
  if (t.personName) return t.personName;
  return t.categoryName || t.narration || t.type;
}

function filterTxns(q) {
  const ids = (v) => (v ? String(v).split(',').map(Number) : null);
  const types = q.type ? String(q.type).split(',') : null;
  const cats = ids(q.categoryId); const subs = ids(q.subcategoryId); const items = ids(q.itemId);
  const accs = ids(q.accountId);
  const term = q.q ? String(q.q).toLowerCase() : '';
  return table('transactions')
    .filter((t) => (!types || types.includes(t.type))
      && (!cats || cats.includes(t.categoryId))
      && (!subs || subs.includes(t.subcategoryId))
      && (!items || items.includes(t.itemId))
      && (!accs || accs.includes(t.accountId) || accs.includes(t.toAccountId))
      && (!q.paymentMethod || t.paymentMethod === q.paymentMethod)
      && (!q.paymentAppId || t.paymentAppId === Number(q.paymentAppId))
      && (!q.customerId || t.customerId === Number(q.customerId))
      && (!q.personId || t.personId === Number(q.personId))
      && (!q.from || dayOf(t.date) >= q.from)
      && (!q.to || dayOf(t.date) <= q.to)
      && (num(q.minAmount) == null || t.amount >= Number(q.minAmount))
      && (num(q.maxAmount) == null || t.amount <= Number(q.maxAmount)))
    .map(enrichTxn)
    .filter((t) => !term || [t.narration, t.categoryName, t.subcategoryName, t.itemName, t.accountName, t.customerName, t.personName, t.project, t.provider]
      .some((v) => v && v.toLowerCase().includes(term)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function validateTxn(body, existing) {
  const errors = {};
  const type = body.type;
  const amount = Number(body.amount);
  if (!ACCOUNT_EFFECT[type] && type !== 'TRANSFER') errors.type = 'Invalid transaction type';
  if (!(amount > 0)) errors.amount = 'Amount must be greater than zero';
  else if (amount > 1e13) errors.amount = 'Amount is too large';
  if (!body.date) errors.date = 'Date is required';
  const narration = String(body.narration ?? '').trim();
  if (type === 'EXPENSE' && !narration) errors.narration = 'Narration is required';
  if (narration.length > 255) errors.narration = 'Narration must be at most 255 characters';

  const acc = body.accountId ? findById('accounts', body.accountId) : null;
  if (!acc) errors.accountId = type === 'INCOME' || type === 'BORROW' ? 'Select the account money was received in' : 'Select the payment source account';

  // Category hierarchy integrity — the same checks the service layer will enforce in Spring.
  const keep = (field) => existing && existing[field] === Number(body[field]);
  if (['EXPENSE', 'INCOME', 'INVESTMENT'].includes(type)) {
    const c = body.categoryId ? findById('categories', body.categoryId) : null;
    if (!c || c.type !== type) errors.categoryId = 'Select a valid main type';
    else if (!c.active && !keep('categoryId')) errors.categoryId = 'This main type is deactivated';
    if (body.subcategoryId) {
      const s = findById('subcategories', body.subcategoryId);
      if (!s || s.categoryId !== c?.id) errors.subcategoryId = 'Subtype does not belong to the selected main type';
      else if (!s.active && !keep('subcategoryId')) errors.subcategoryId = 'This subtype is deactivated';
      if (body.itemId) {
        const i = findById('categoryItems', body.itemId);
        if (!i || i.subcategoryId !== s?.id) errors.itemId = 'Item does not belong to the selected subtype';
        else if (!i.active && !keep('itemId')) errors.itemId = 'This item is deactivated';
      }
    } else if (body.itemId) errors.subcategoryId = 'Select a subtype before an item';
    if (type === 'EXPENSE') {
      if (!body.subcategoryId) errors.subcategoryId = 'Select a subtype';
      if (!body.itemId) errors.itemId = 'Select an item';
    }
  }

  if (type === 'EXPENSE') {
    const pm = PAYMENT_METHODS.find((m) => m.value === body.paymentMethod);
    if (!pm) errors.paymentMethod = 'Select a payment method';
    else {
      if (acc && !pm.accountTypes.includes(acc.type)) errors.accountId = `${acc.name} cannot be used with ${pm.label}`;
      if (pm.needsApp && !body.paymentAppId) errors.paymentAppId = 'Select the UPI app';
    }
  }
  if (body.paymentAppId && !findById('paymentApps', body.paymentAppId)) errors.paymentAppId = 'Unknown UPI app';
  if (['BORROW', 'GIVE'].includes(type) && !findById('persons', body.personId)) errors.personId = 'Select a person';
  if (type === 'TRANSFER') {
    if (!findById('accounts', body.toAccountId)) errors.toAccountId = 'Select destination account';
    else if (Number(body.toAccountId) === Number(body.accountId)) errors.toAccountId = 'Choose a different account';
  }
  if (Object.keys(errors).length) throw badRequest('Validation failed', errors);

  const c = body.categoryId ? findById('categories', body.categoryId) : null;
  const s = body.subcategoryId ? findById('subcategories', body.subcategoryId) : null;
  const i = body.itemId ? findById('categoryItems', body.itemId) : null;
  const n = (v) => (v ? Number(v) : null);
  const date = body.date.length === 10 ? `${body.date}T${new Date().toTimeString().slice(0, 8)}` : String(body.date).slice(0, 19);
  return {
    type, amount: round2(amount), date, narration,
    categoryId: n(body.categoryId), subcategoryId: n(body.subcategoryId), itemId: n(body.itemId),
    categoryNameSnapshot: c?.name ?? null, subcategoryNameSnapshot: s?.name ?? null, itemNameSnapshot: i?.name ?? null,
    paymentMethod: body.paymentMethod || null, paymentAppId: n(body.paymentAppId),
    accountId: n(body.accountId), toAccountId: n(body.toAccountId),
    customerId: n(body.customerId), project: cleanName(body.project) || null,
    personId: n(body.personId), dueDate: body.dueDate || null,
    units: num(body.units), provider: cleanName(body.provider) || null,
    parentId: existing?.parentId ?? null,
  };
}

/* ------------------------------------------------------------ aggregation */

function breakdown(txns, groupBy) {
  const total = round2(txns.reduce((s, t) => s + t.amount, 0));
  const groups = new Map();
  const keyOf = (t) => {
    switch (groupBy) {
      case 'category': return [t.categoryId, t.categoryName || 'Uncategorised', t.categoryIcon];
      case 'subcategory': return [t.subcategoryId, t.subcategoryName ? `${t.subcategoryName}` : 'No subtype', null, t.categoryName];
      case 'item': return [t.itemId, t.itemName || 'No item', null, [t.categoryName, t.subcategoryName].filter(Boolean).join(' › ')];
      case 'account': return [t.accountId, t.accountName || 'Unknown'];
      case 'paymentMethod': return [t.paymentMethod, PAYMENT_METHODS.find((m) => m.value === t.paymentMethod)?.label || 'Other'];
      case 'paymentApp': return [t.paymentAppId, t.paymentAppName || 'Not via UPI app'];
      case 'customer': return [t.customerId, t.customerName || 'No customer'];
      case 'person': return [t.personId, t.personName || 'Unknown'];
      case 'provider': return [t.provider, t.provider || 'Not specified'];
      case 'day': return [dayOf(t.date), dayOf(t.date)];
      case 'week': {
        const d = new Date(t.date); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const k = dayOf(new Date(mon.getTime() - mon.getTimezoneOffset() * 60000).toISOString());
        return [k, `Week of ${k}`];
      }
      case 'month': return [t.date.slice(0, 7), t.date.slice(0, 7)];
      default: return ['all', 'All'];
    }
  };
  txns.forEach((t) => {
    const [id, label, icon, parent] = keyOf(t);
    const k = String(id ?? 'none');
    const g = groups.get(k) || { key: k, id: id ?? null, label, icon: icon ?? null, parent: parent ?? null, amount: 0, count: 0 };
    g.amount += t.amount; g.count += 1;
    groups.set(k, g);
  });
  let rows = [...groups.values()].map((g) => ({ ...g, amount: round2(g.amount), percent: total ? round2((g.amount / total) * 100) : 0 }));
  rows = ['day', 'week', 'month'].includes(groupBy) ? rows.sort((a, b) => a.key.localeCompare(b.key)) : rows.sort((a, b) => b.amount - a.amount);
  return { total, count: txns.length, groupBy, rows };
}

function netWorth() {
  const bal = accountBalances();
  const accs = table('accounts').filter((a) => a.active || bal[a.id] !== 0);
  const invest = round2(table('transactions').filter((t) => t.type === 'INVESTMENT').reduce((s, t) => s + t.amount, 0));
  const receivable = outstandingTotal('GIVE');
  const payable = outstandingTotal('BORROW');
  // A credit card normally carries a negative balance (liability); an over-paid card holds a credit (asset).
  const isCardDue = (a) => a.type === 'CREDIT_CARD' && bal[a.id] < 0;
  const assets = [
    ...accs.filter((a) => !isCardDue(a) && !(a.type === 'CREDIT_CARD' && bal[a.id] === 0))
      .map((a) => ({ label: a.name, group: a.type === 'CREDIT_CARD' ? 'Card credit balance' : 'Accounts', amount: bal[a.id] })),
    { label: 'Investments (cost)', group: 'Investments', amount: invest },
    { label: 'Money given (receivable)', group: 'Receivables', amount: receivable },
  ];
  const liabilities = [
    ...accs.filter((a) => a.type === 'CREDIT_CARD' && !(bal[a.id] > 0)).map((a) => ({ label: a.name, group: 'Credit cards', amount: round2(Math.max(-bal[a.id], 0)) })),
    { label: 'Money borrowed (payable)', group: 'Borrowings', amount: payable },
  ];
  const totalAssets = round2(assets.reduce((s, x) => s + x.amount, 0));
  const totalLiabilities = round2(liabilities.reduce((s, x) => s + x.amount, 0));
  return { assets, liabilities, totalAssets, totalLiabilities, netWorth: round2(totalAssets - totalLiabilities) };
}

const sumType = (type, from, to) => round2(table('transactions')
  .filter((t) => t.type === type && (!from || dayOf(t.date) >= from) && (!to || dayOf(t.date) <= to))
  .reduce((s, t) => s + t.amount, 0));

function shiftRange(from, to) {
  const f = new Date(from); const t = new Date(to);
  const pf = new Date(f.getFullYear(), f.getMonth() - 1, f.getDate());
  const pt = new Date(t.getFullYear(), t.getMonth() - 1, Math.min(t.getDate(), new Date(t.getFullYear(), t.getMonth(), 0).getDate()));
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return { from: iso(pf), to: iso(pt) };
}

/* ------------------------------------------------------------ simple master tables */

function masterRoutes(path, tableName, label) {
  return [
    ['GET', `/${path}`, (_, q) => table(tableName).filter((r) => bool(q.includeInactive) || r.active).sort((a, b) => a.name.localeCompare(b.name))],
    ['POST', `/${path}`, (_, __, b) => {
      const name = requireName(b);
      assertUnique(table(tableName), name, null, `in your ${path}`);
      return [201, insert(tableName, { name, phone: cleanName(b.phone) || null, active: true })];
    }],
    ['PUT', `/${path}/:id`, (p, _, b) => {
      const rec = owned(tableName, p.id, label);
      const name = requireName(b);
      assertUnique(table(tableName), name, rec.id, `in your ${path}`);
      return update(tableName, rec.id, { name, phone: cleanName(b.phone) || null });
    }],
  ];
}

/* ------------------------------------------------------------ routes */

const routes = [
  // ---------- Categories (main types)
  ['GET', '/categories', (_, q) => table('categories')
    .filter((c) => (!q.type || c.type === q.type) && (bool(q.includeInactive) || c.active))
    .sort(bySort).map(catDto)],

  ['GET', '/categories/tree', (_, q) => {
    const inc = bool(q.includeInactive);
    return table('categories').filter((c) => (!q.type || c.type === q.type) && (inc || c.active)).sort(bySort).map((c) => ({
      ...catDto(c), usageCount: usage('categoryId', c.id),
      subcategories: subsOf(c.id, inc).map((s) => ({
        ...subDto(s), usageCount: usage('subcategoryId', s.id),
        items: itemsOf(s.id, inc).map((i) => ({ ...itemDto(i), usageCount: usage('itemId', i.id) })),
      })),
    }));
  }],

  ['POST', '/categories', (_, __, b) => {
    const name = requireName(b);
    const type = b.type || 'EXPENSE';
    if (!['EXPENSE', 'INCOME', 'INVESTMENT'].includes(type)) throw badRequest('Validation failed', { type: 'Invalid category type' });
    assertUnique(table('categories').filter((c) => c.type === type), name, null, 'as a main type');
    const maxSort = Math.max(0, ...table('categories').map((c) => c.sortOrder ?? 0));
    const c = insert('categories', { type, name, description: cleanName(b.description) || null, icon: b.icon || 'tag', active: true, sortOrder: maxSort + 1 });
    return [201, catDto(c)];
  }],

  ['PUT', '/categories/:id', (p, _, b) => {
    const c = owned('categories', p.id, 'Category');
    const name = requireName(b);
    assertUnique(table('categories').filter((x) => x.type === c.type), name, c.id, 'as a main type');
    return catDto(update('categories', c.id, { name, description: cleanName(b.description) || null, icon: b.icon || c.icon }));
  }],

  ['PATCH', '/categories/:id/deactivate', (p) => catDto(update('categories', owned('categories', p.id, 'Category').id, { active: false }))],
  ['PATCH', '/categories/:id/activate', (p) => {
    const c = owned('categories', p.id, 'Category');
    assertUnique(table('categories').filter((x) => x.type === c.type), c.name, c.id, 'as an active main type');
    return catDto(update('categories', c.id, { active: true }));
  }],

  // ---------- Subcategories
  ['GET', '/categories/:id/subcategories', (p, q) => {
    owned('categories', p.id, 'Category');
    return subsOf(Number(p.id), bool(q.includeInactive)).map(subDto);
  }],
  ['POST', '/categories/:id/subcategories', (p, _, b) => {
    const c = owned('categories', p.id, 'Category');
    if (!c.active) throw conflict('Cannot add a subtype to a deactivated main type');
    const name = requireName(b);
    assertUnique(subsOf(c.id, true), name, null, `under ${c.name}`);
    return [201, subDto(insert('subcategories', { categoryId: c.id, name, active: true, sortOrder: subsOf(c.id, true).length }))];
  }],
  ['PUT', '/subcategories/:id', (p, _, b) => {
    const s = owned('subcategories', p.id, 'Subtype');
    const name = requireName(b);
    assertUnique(subsOf(s.categoryId, true), name, s.id, `under ${findById('categories', s.categoryId).name}`);
    return subDto(update('subcategories', s.id, { name }));
  }],
  ['PATCH', '/subcategories/:id/deactivate', (p) => subDto(update('subcategories', owned('subcategories', p.id, 'Subtype').id, { active: false }))],
  ['PATCH', '/subcategories/:id/activate', (p) => {
    const s = owned('subcategories', p.id, 'Subtype');
    assertUnique(subsOf(s.categoryId, true), s.name, s.id, 'as an active subtype');
    return subDto(update('subcategories', s.id, { active: true }));
  }],

  // ---------- Items
  ['GET', '/subcategories/:id/items', (p, q) => {
    owned('subcategories', p.id, 'Subtype');
    return itemsOf(Number(p.id), bool(q.includeInactive)).map(itemDto);
  }],
  ['POST', '/subcategories/:id/items', (p, _, b) => {
    const s = owned('subcategories', p.id, 'Subtype');
    if (!s.active) throw conflict('Cannot add an item to a deactivated subtype');
    const name = requireName(b);
    assertUnique(itemsOf(s.id, true), name, null, `under ${s.name}`);
    return [201, itemDto(insert('categoryItems', { subcategoryId: s.id, name, active: true, sortOrder: itemsOf(s.id, true).length }))];
  }],
  ['PUT', '/category-items/:id', (p, _, b) => {
    const i = owned('categoryItems', p.id, 'Item');
    const name = requireName(b);
    assertUnique(itemsOf(i.subcategoryId, true), name, i.id, `under ${findById('subcategories', i.subcategoryId).name}`);
    return itemDto(update('categoryItems', i.id, { name }));
  }],
  ['PATCH', '/category-items/:id/deactivate', (p) => itemDto(update('categoryItems', owned('categoryItems', p.id, 'Item').id, { active: false }))],
  ['PATCH', '/category-items/:id/activate', (p) => {
    const i = owned('categoryItems', p.id, 'Item');
    assertUnique(itemsOf(i.subcategoryId, true), i.name, i.id, 'as an active item');
    return itemDto(update('categoryItems', i.id, { active: true }));
  }],

  // ---------- Accounts & UPI apps
  ['GET', '/accounts', (_, q) => {
    const bal = accountBalances();
    return table('accounts').filter((a) => bool(q.includeInactive) || a.active).map((a) => accountDto(a, bal));
  }],
  ['POST', '/accounts', (_, __, b) => {
    const name = requireName(b);
    const errors = {};
    if (!ACCOUNT_TYPES.some((t) => t.value === b.type)) errors.type = 'Select an account type';
    if (b.openingBalance !== undefined && b.openingBalance !== '' && Number.isNaN(Number(b.openingBalance))) errors.openingBalance = 'Invalid amount';
    if (b.type === 'CREDIT_CARD' && !(Number(b.creditLimit) > 0)) errors.creditLimit = 'Credit limit is required for credit cards';
    if (Object.keys(errors).length) throw badRequest('Validation failed', errors);
    assertUnique(table('accounts'), name, null, 'as an account');
    const digits = String(b.accountNumber ?? '').replace(/\D/g, '');
    const opening = round2(Number(b.openingBalance) || 0);
    return [201, accountDto(insert('accounts', {
      name, bankName: cleanName(b.bankName) || null, type: b.type,
      maskedNumber: digits ? `•••• ${digits.slice(-4)}` : null, // never store/expose full numbers
      openingBalance: b.type === 'CREDIT_CARD' ? -Math.abs(opening) : opening,
      openingBalanceDate: b.openingBalanceDate || localDay(),
      creditLimit: b.type === 'CREDIT_CARD' ? round2(Number(b.creditLimit)) : null, active: true,
    }))];
  }],
  ['PUT', '/accounts/:id', (p, _, b) => {
    const a = owned('accounts', p.id, 'Account');
    const name = requireName(b);
    assertUnique(table('accounts'), name, a.id, 'as an account');
    return accountDto(update('accounts', a.id, {
      name, bankName: cleanName(b.bankName) || null,
      creditLimit: a.type === 'CREDIT_CARD' ? round2(Number(b.creditLimit) || a.creditLimit) : null,
      active: b.active ?? a.active,
    }));
  }],
  ['PATCH', '/accounts/:id/deactivate', (p) => accountDto(update('accounts', owned('accounts', p.id, 'Account').id, { active: false }))],

  ['GET', '/payment-apps', () => table('paymentApps').filter((x) => x.active).map((x) => ({
    ...x, linkedAccountName: x.linkedAccountId ? findById('accounts', x.linkedAccountId)?.name : null,
  }))],
  ['POST', '/payment-apps', (_, __, b) => {
    const name = requireName(b);
    assertUnique(table('paymentApps'), name, null, 'as a UPI app');
    const linked = b.linkedAccountId ? owned('accounts', b.linkedAccountId, 'Linked account') : null;
    return [201, insert('paymentApps', { name, provider: b.provider || 'OTHER', upiId: cleanName(b.upiId) || null, linkedAccountId: linked?.id ?? null, active: true })];
  }],

  ...masterRoutes('customers', 'customers', 'Customer'),
  ...masterRoutes('persons', 'persons', 'Person'),

  // ---------- Transactions
  ['GET', '/transactions', (_, q) => {
    const list = filterTxns(q).map((t) => ({ ...t, title: txnTitle(t) }));
    const res = page(list, q);
    res.totalAmount = round2(list.reduce((s, t) => s + t.amount, 0));
    return res;
  }],
  ['GET', '/transactions/:id', (p) => { const t = enrichTxn(owned('transactions', p.id, 'Transaction')); return { ...t, title: txnTitle(t) }; }],
  ['POST', '/transactions', (_, __, b) => {
    if (['REPAYMENT', 'COLLECTION'].includes(b.type)) throw badRequest('Use /debts/{id}/settlements for repayments and collections');
    const data = validateTxn(b);
    return [201, enrichTxn(insert('transactions', data))];
  }],
  ['PUT', '/transactions/:id', (p, _, b) => {
    const t = owned('transactions', p.id, 'Transaction');
    if (b.type && b.type !== t.type) throw badRequest('Transaction type cannot be changed; delete and re-create instead');
    const data = validateTxn({ ...b, type: t.type }, t);
    if (['BORROW', 'GIVE'].includes(t.type)) {
      const settled = table('transactions').filter((c) => c.parentId === t.id).reduce((s, c) => s + c.amount, 0);
      if (data.amount < settled) throw badRequest('Validation failed', { amount: `Amount cannot be less than the ₹${settled} already settled` });
    }
    return enrichTxn(update('transactions', t.id, data));
  }],
  ['DELETE', '/transactions/:id', (p) => {
    const t = owned('transactions', p.id, 'Transaction');
    if (table('transactions').some((c) => c.parentId === t.id)) throw conflict('Delete the repayment/collection entries of this record first');
    remove('transactions', t.id);
    return [204, null];
  }],
  ['POST', '/transfers', (_, __, b) => [201, enrichTxn(insert('transactions', validateTxn({ ...b, type: 'TRANSFER' })))]],

  // ---------- Borrow / Give
  ['GET', '/debts', (_, q) => debtRecords(q.kind === 'GIVE' ? 'GIVE' : 'BORROW')],
  ['POST', '/debts/:id/settlements', (p, _, b) => {
    const parent = owned('transactions', p.id, 'Record');
    if (!['BORROW', 'GIVE'].includes(parent.type)) throw badRequest('Only borrow/give records can be settled');
    const rec = debtRecords(parent.type).find((d) => d.id === parent.id);
    const amount = round2(Number(b.amount));
    const errors = {};
    if (!(amount > 0)) errors.amount = 'Amount must be greater than zero';
    else if (amount > rec.outstanding) errors.amount = `Cannot exceed outstanding ${rec.outstanding}`;
    if (!findById('accounts', b.accountId)) errors.accountId = 'Select an account';
    if (!b.date) errors.date = 'Date is required';
    if (Object.keys(errors).length) throw badRequest('Validation failed', errors);
    const type = parent.type === 'BORROW' ? 'REPAYMENT' : 'COLLECTION';
    return [201, enrichTxn(insert('transactions', {
      type, amount, date: `${b.date}T${new Date().toTimeString().slice(0, 8)}`,
      accountId: Number(b.accountId), personId: parent.personId, parentId: parent.id, paymentMethod: b.paymentMethod || null,
      narration: cleanName(b.narration) || (type === 'REPAYMENT' ? 'Repayment' : 'Collection'),
      categoryId: null, subcategoryId: null, itemId: null, paymentAppId: null, toAccountId: null,
    }))];
  }],

  // ---------- Dashboard
  ['GET', '/dashboard/summary', (_, q) => {
    const { from, to } = q;
    const bal = accountBalances();
    const start = accountBalances(from);
    const accs = table('accounts');
    const nw = netWorth();
    const prev = shiftRange(from, to);
    const totalExpense = sumType('EXPENSE', from, to);
    const prevExpense = sumType('EXPENSE', prev.from, prev.to);
    return {
      from, to,
      availableBalance: round2(accs.filter(isLiquid).reduce((s, a) => s + bal[a.id], 0)),
      openingBalance: round2(accs.filter(isLiquid).reduce((s, a) => s + (start[a.id] ?? 0), 0)),
      totalIncome: sumType('INCOME', from, to),
      totalExpense,
      previousExpense: prevExpense,
      expenseChangePercent: prevExpense ? round2(((totalExpense - prevExpense) / prevExpense) * 100) : null,
      totalInvestment: sumType('INVESTMENT', from, to),
      totalInvestmentAllTime: sumType('INVESTMENT'),
      totalBorrowed: outstandingTotal('BORROW'),
      totalGiven: outstandingTotal('GIVE'),
      creditCardDue: round2(accs.filter((a) => a.type === 'CREDIT_CARD').reduce((s, a) => s + Math.max(-bal[a.id], 0), 0)),
      netWorth: nw.netWorth,
      transactionCount: table('transactions').filter((t) => dayOf(t.date) >= from && dayOf(t.date) <= to).length,
    };
  }],
  ['GET', '/dashboard/category-summary', (_, q) => {
    const level = q.level || 'category';
    const filter = { type: q.type || 'EXPENSE', from: q.from, to: q.to };
    if (level === 'subcategory') filter.categoryId = q.parentId;
    if (level === 'item') filter.subcategoryId = q.parentId;
    return breakdown(filterTxns(filter), level);
  }],
  ['GET', '/dashboard/monthly-trends', (_, q) => {
    const months = Math.min(Number(q.months) || 6, 24);
    const out = [];
    const d = new Date();
    for (let i = months - 1; i >= 0; i -= 1) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const ym = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
      const inMonth = table('transactions').filter((t) => t.date.slice(0, 7) === ym);
      const s = (type) => round2(inMonth.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0));
      out.push({ month: ym, label: x.toLocaleDateString('en-IN', { month: 'short' }), income: s('INCOME'), expense: s('EXPENSE'), investment: s('INVESTMENT') });
    }
    return out;
  }],
  ['GET', '/dashboard/account-balances', () => {
    const bal = accountBalances();
    return table('accounts').filter((a) => a.active).map((a) => ({ id: a.id, name: a.name, type: a.type, balance: bal[a.id] }));
  }],

  // ---------- Reports
  ['GET', '/reports/expenses', (_, q) => breakdown(filterTxns({ ...q, type: 'EXPENSE' }), q.groupBy || 'category')],
  ['GET', '/reports/income', (_, q) => breakdown(filterTxns({ ...q, type: 'INCOME' }), q.groupBy || 'category')],
  ['GET', '/reports/investments', (_, q) => breakdown(filterTxns({ ...q, type: 'INVESTMENT' }), q.groupBy || 'category')],
  ['GET', '/reports/debts', () => {
    const summarize = (kind) => {
      const recs = debtRecords(kind);
      const byPerson = new Map();
      recs.forEach((r) => {
        const g = byPerson.get(r.personId) || { personId: r.personId, label: r.personName, amount: 0, settled: 0, outstanding: 0, count: 0 };
        g.amount += r.amount; g.settled += r.settled; g.outstanding += r.outstanding; g.count += 1;
        byPerson.set(r.personId, g);
      });
      return [...byPerson.values()].map((g) => ({ ...g, amount: round2(g.amount), settled: round2(g.settled), outstanding: round2(g.outstanding) }));
    };
    return { borrowed: summarize('BORROW'), given: summarize('GIVE') };
  }],
  ['GET', '/reports/accounts', (_, q) => {
    const start = accountBalances(q.from);
    const endDate = q.to ? `${q.to}T23:59:59.999` : undefined;
    const end = accountBalances(endDate);
    const inRange = filterTxns({ from: q.from, to: q.to });
    return table('accounts').filter((a) => a.active).map((a) => {
      let inflow = 0; let outflow = 0;
      inRange.forEach((t) => {
        if (t.accountId === a.id) { if (ACCOUNT_EFFECT[t.type] > 0) inflow += t.amount; else outflow += t.amount; }
        if (t.type === 'TRANSFER' && t.toAccountId === a.id) inflow += t.amount;
      });
      return { id: a.id, name: a.name, type: a.type, opening: start[a.id], inflow: round2(inflow), outflow: round2(outflow), closing: end[a.id] };
    });
  }],
  ['GET', '/reports/net-worth', () => netWorth()],

  // ---------- Profile & demo admin (mock only)
  ['GET', '/me', () => getUser()],
  ['PUT', '/me', (_, __, b) => { const u = getUser(); u.name = requireName(b); return u; }],
  ['POST', '/demo/reset', (_, __, b) => { resetDb({ withDemoData: b?.withDemoData !== false }); return { ok: true }; }],
].map(([method, path, handler]) => {
  const keys = [];
  const re = new RegExp(`^${path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  return { method, re, keys, handler };
});

/* ------------------------------------------------------------ axios adapter */

const delay = (ms) => new Promise((r) => { setTimeout(r, ms); });

export async function mockAdapter(config) {
  initDb();
  await delay(120 + Math.random() * 180);
  const method = (config.method || 'get').toUpperCase();
  const url = (config.url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '').split('?')[0];
  const query = { ...(config.params || {}) };
  Object.keys(query).forEach((k) => { if (query[k] === '' || query[k] == null) delete query[k]; });
  let body = {};
  if (config.data) { try { body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data; } catch { body = {}; } }

  const respond = (status, data) => ({ data, status, statusText: String(status), headers: {}, config, request: {} });

  const route = routes.find((r) => r.method === method && r.re.test(url));
  try {
    if (!route) throw notFound(`Endpoint ${method} ${url}`);
    const m = url.match(route.re);
    const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const out = route.handler(params, query, body);
    if (method !== 'GET') persist();
    const [status, data] = Array.isArray(out) && typeof out[0] === 'number' && out.length === 2 ? out : [200, out];
    return respond(status, JSON.parse(JSON.stringify(data ?? null)));
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    if (!(e instanceof ApiError)) console.error('[mock api]', e); // eslint-disable-line no-console
    const err = new Error(e.message);
    err.isAxiosError = true;
    err.config = config;
    err.response = respond(status, { status, message: e.message, errors: e.errors || null, timestamp: new Date().toISOString(), path: `/api${url}` });
    throw err;
  }
}
