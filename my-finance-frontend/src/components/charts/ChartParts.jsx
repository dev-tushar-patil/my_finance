import { formatINR, formatCompact } from '../../utils/format';

/** Shared Recharts tooltip: text in ink tokens, a colour swatch carries identity. */
export function MoneyTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-pop border border-slate-100 px-3 py-2 text-xs min-w-[140px]">
      {label !== undefined && <p className="font-semibold text-navy mb-1">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color || p.payload?.color || p.fill }} />
          <span className="text-navy-light flex-1">{p.name}</span>
          <span className="font-semibold text-navy">{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export const axisProps = {
  tick: { fontSize: 11, fill: '#8A8FA8' },
  axisLine: false,
  tickLine: false,
};

export const yMoney = { ...axisProps, tickFormatter: formatCompact, width: 44 };

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-light">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />{i.label}</span>
      ))}
    </div>
  );
}
