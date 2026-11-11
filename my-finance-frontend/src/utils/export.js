/** Client-side exports for Phase 1–2. Server-generated PDF/XLSX arrive with the backend (Phase 7). */

const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV with UTF-8 BOM so Excel opens ₹ and Indian names correctly. */
export function downloadCSV(filename, columns, rows) {
  const lines = [columns.map((c) => esc(c.label)).join(',')];
  rows.forEach((r) => lines.push(columns.map((c) => esc(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(',')));
  const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Uses the browser's print dialog ("Save as PDF"); print CSS hides navigation chrome. */
export function printReport() {
  window.print();
}
