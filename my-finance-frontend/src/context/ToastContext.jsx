import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-income' },
  error: { icon: AlertCircle, cls: 'text-expense' },
  info: { icon: Info, cls: 'text-primary-600' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((type, message, timeout = 3200) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), timeout);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m, 4500),
    info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[100] inset-x-0 top-3 md:top-auto md:bottom-6 md:right-6 md:left-auto flex flex-col items-center md:items-end gap-2 px-4 pointer-events-none">
        {toasts.map((t) => {
          const { icon: Icon, cls } = STYLES[t.type];
          return (
            <div key={t.id} role="status" className="pointer-events-auto animate-fade-up flex items-start gap-3 w-full max-w-sm bg-white rounded-xl shadow-pop border border-slate-100 px-4 py-3">
              <Icon size={20} className={`${cls} shrink-0 mt-0.5`} />
              <p className="text-sm text-navy flex-1">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} className="text-navy-muted hover:text-navy" aria-label="Dismiss"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
