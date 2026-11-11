import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, ListOrdered, BarChart3, CreditCard, TrendingUp, ArrowLeftRight, FolderTree, Settings,
  Home, MoreHorizontal, Bell, X,
} from 'lucide-react';
import Logo from '../components/ui/Logo';
import { cx } from '../utils/format';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/add', label: 'Add Transaction', icon: PlusCircle },
  { to: '/transactions', label: 'Transactions', icon: ListOrdered },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/accounts', label: 'Accounts & Cards', icon: CreditCard },
  { to: '/investments', label: 'Investments', icon: TrendingUp },
  { to: '/borrow-give', label: 'Borrow / Give', icon: ArrowLeftRight },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const BOTTOM = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/transactions', label: 'History', icon: ListOrdered },
  { to: '/add', label: 'Add', icon: PlusCircle, primary: true },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-gradient-to-b from-[#3B1D78] via-[#4A2591] to-[#2D1660] text-white z-30">
      <div className="px-6 pt-7 pb-6"><Logo light /></div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cx('flex items-center gap-3 px-4 h-11 rounded-xl text-[15px] transition',
              isActive ? 'bg-white/15 text-white font-semibold shadow-inner' : 'text-white/75 hover:bg-white/10 hover:text-white')}>
            <Icon size={19} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="m-4 p-4 rounded-2xl bg-white/10 text-sm">
        <p className="font-semibold">Track every rupee</p>
        <p className="text-white/70 text-xs mt-1">Categories, accounts and reports — all in one place.</p>
      </div>
    </aside>
  );
}

function MobileTopBar({ onMore }) {
  return (
    <header className="lg:hidden sticky top-0 z-20 bg-canvas/90 backdrop-blur border-b border-slate-100 px-4 h-16 flex items-center justify-between pt-[env(safe-area-inset-top)]">
      <Logo />
      <div className="flex items-center gap-1">
        <button type="button" className="h-10 w-10 grid place-items-center rounded-full hover:bg-white text-navy-light" aria-label="Notifications"><Bell size={20} /></button>
        <button type="button" onClick={onMore} className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 text-white text-sm font-bold" aria-label="Menu">T</button>
      </div>
    </header>
  );
}

function BottomNav({ onMore }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16">
        {BOTTOM.map(({ to, label, icon: Icon, end, primary }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cx('flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-primary-600' : 'text-navy-muted')}>
            {primary ? (
              <span className="-mt-6 h-14 w-14 rounded-2xl bg-primary-600 text-white grid place-items-center shadow-[0_8px_20px_-6px_rgba(103,58,183,.7)]"><Icon size={26} /></span>
            ) : <Icon size={22} />}
            <span className={primary ? 'mt-0.5' : ''}>{label}</span>
          </NavLink>
        ))}
        <button type="button" onClick={onMore} className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-navy-muted">
          <MoreHorizontal size={22} />More
        </button>
      </div>
    </nav>
  );
}

function MoreSheet({ open, onClose }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-[70] flex items-end">
      <div className="absolute inset-0 bg-navy/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-lg">All modules</p>
          <button type="button" onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const on = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <button key={to} type="button" onClick={() => { navigate(to); onClose(); }}
                className={cx('flex flex-col items-center gap-2 p-3 rounded-2xl text-xs font-medium text-center', on ? 'bg-primary-600 text-white' : 'bg-lavender/60 text-navy')}>
                <Icon size={22} className={on ? '' : 'text-primary-600'} />{label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [more, setMore] = useState(false);
  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileTopBar onMore={() => setMore(true)} />
      <main className="lg:pl-64 pb-28 lg:pb-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
          <Outlet />
        </div>
      </main>
      <BottomNav onMore={() => setMore(true)} />
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </div>
  );
}
