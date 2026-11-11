import { ArrowLeftRight, HandCoins, HandHeart, TrendingUp, Wallet } from 'lucide-react';
import { CategoryIcon } from '../ui';
import { TXN_TYPE_META, paymentMethodLabel } from '../../utils/constants';
import { formatINR, relativeDay, cx, itemTitle } from '../../utils/format';

const TYPE_ICON = { TRANSFER: ArrowLeftRight, BORROW: HandCoins, REPAYMENT: HandCoins, GIVE: HandHeart, COLLECTION: HandHeart, INVESTMENT: TrendingUp };
const INFLOW = ['INCOME', 'BORROW', 'COLLECTION'];

export function txnTitle(t) {
  if (t.itemName) return itemTitle(t.itemName, t.subcategoryName);
  if (t.title) return t.title;
  if (t.type === 'TRANSFER') return `${t.accountName} → ${t.toAccountName}`;
  return t.personName || t.categoryName || t.narration;
}

export function txnSubtitle(t) {
  const via = t.paymentAppName ? `${t.paymentAppName} (${t.accountName})` : t.accountName;
  if (t.type === 'EXPENSE') return `${t.categoryName} • ${via}`;
  if (t.type === 'INCOME') return [t.categoryName, t.customerName, t.accountName].filter(Boolean).join(' • ');
  if (t.type === 'INVESTMENT') return [t.categoryName, t.provider, t.accountName].filter(Boolean).join(' • ');
  if (t.type === 'TRANSFER') return t.narration || 'Account transfer';
  return `${TXN_TYPE_META[t.type].label} • ${t.accountName}`;
}

export default function TransactionRow({ t, onClick, compact = false, actions }) {
  const meta = TXN_TYPE_META[t.type];
  const inflow = INFLOW.includes(t.type);
  const Icon = TYPE_ICON[t.type];
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && e.key === 'Enter') onClick(); }}
      className={cx('flex items-center gap-3 py-3', onClick && 'cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-xl')}>
      {t.categoryIcon ? <CategoryIcon iconKey={t.categoryIcon} id={t.categoryId} size={compact ? 'sm' : 'md'} />
        : (
          <span className={cx('grid place-items-center shrink-0', compact ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl', meta.bg, meta.color)}>
            {Icon ? <Icon size={compact ? 16 : 19} /> : <Wallet size={compact ? 16 : 19} />}
          </span>
        )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-navy truncate">{txnTitle(t)}</p>
        <p className="text-xs text-navy-muted truncate">{txnSubtitle(t)}</p>
        {!compact && t.narration && t.type !== 'TRANSFER' && <p className="text-xs text-navy-light truncate mt-0.5">“{t.narration}”</p>}
      </div>
      <div className="text-right shrink-0">
        <p className={cx('font-bold text-sm', inflow ? 'text-income' : t.type === 'TRANSFER' ? 'text-navy' : t.type === 'INVESTMENT' ? 'text-invest' : 'text-navy')}>
          {inflow ? '+' : t.type === 'TRANSFER' ? '' : '-'}{formatINR(t.amount)}
        </p>
        <p className="text-[11px] text-navy-muted">{relativeDay(t.date)}</p>
        {!compact && t.paymentMethod && <p className="text-[10px] text-navy-muted">{paymentMethodLabel(t.paymentMethod)}</p>}
      </div>
      {actions}
    </div>
  );
}
