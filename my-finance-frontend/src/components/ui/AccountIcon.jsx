import { Banknote, Landmark, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { cx } from '../../utils/format';
import { UPI_PROVIDERS } from '../../utils/constants';

const MAP = {
  CASH: { icon: Banknote, bg: '#E8F7EE', fg: '#16A34A' },
  SAVINGS: { icon: Landmark, bg: '#FDECEC', fg: '#C62828' },
  CURRENT: { icon: Landmark, bg: '#E3F2FD', fg: '#1565C0' },
  CREDIT_CARD: { icon: CreditCard, bg: '#EDE7F6', fg: '#5E35B1' },
  DEBIT_CARD: { icon: CreditCard, bg: '#E0F7FA', fg: '#00838F' },
};

export function AccountIcon({ type, size = 'md', className }) {
  const m = MAP[type] || { icon: Wallet, bg: '#F1F5F9', fg: '#475569' };
  const Icon = m.icon;
  const dim = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-11 w-11 rounded-xl';
  return <span className={cx('grid place-items-center shrink-0', dim, className)} style={{ background: m.bg, color: m.fg }}><Icon size={size === 'sm' ? 16 : 20} /></span>;
}

export function UpiIcon({ provider, size = 'md' }) {
  const p = UPI_PROVIDERS.find((x) => x.value === provider) || UPI_PROVIDERS[3];
  const dim = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-11 w-11 rounded-xl';
  return <span className={cx('grid place-items-center shrink-0 text-white', dim)} style={{ background: p.color }}><Smartphone size={size === 'sm' ? 15 : 19} /></span>;
}
