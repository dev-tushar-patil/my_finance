const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,42,560 — Indian digit grouping. Pass `decimals` for paise precision. */
export const formatINR = (value, { decimals = false, signed = false } = {}) => {
  const n = Number(value) || 0;
  const s = (decimals ? inr2 : inr).format(Math.abs(n));
  if (n < 0) return `-${s}`;
  return signed && n > 0 ? `+${s}` : s;
};

/** Compact axis labels: 1.2L, 45K */
export const formatCompact = (value) => {
  const v = Number(value) || 0;
  const n = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (n >= 1e7) return `${sign}${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${sign}${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${sign}${Math.round(n / 1e3)}K`;
  return `${sign}${Math.round(n)}`;
};

export const toISODate = (d = new Date()) => {
  const dt = new Date(d);
  const off = dt.getTimezoneOffset();
  return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const formatDate = (iso, opts = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', opts) : '—';

export const relativeDay = (iso) => {
  const d = new Date(iso);
  const diff = Math.round((new Date(toISODate()) - new Date(toISODate(d))) / 86400000);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  return formatDate(iso, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
};

export const currentYM = () => toISODate().slice(0, 7);

export const monthLabel = (ym, long = false) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: long ? 'long' : 'short', year: 'numeric' });
};

export const lastNMonths = (n) => {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i += 1) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(toISODate(x).slice(0, 7));
  }
  return out;
};

/** "Poha - Breakfast"; avoids "Mobile Recharge - Mobile Recharge" when item and subtype share a name. */
export const itemTitle = (item, sub) => (!sub || item.toLowerCase() === sub.toLowerCase() ? item : `${item} - ${sub}`);

export const cx = (...c) => c.filter(Boolean).join(' ');
