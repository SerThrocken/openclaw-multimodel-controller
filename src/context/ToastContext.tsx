import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: {
    success: (msg: string, duration?: number) => void;
    error: (msg: string, duration?: number) => void;
    warning: (msg: string, duration?: number) => void;
    info: (msg: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, message: string, duration = 3500) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message, duration }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);

  const toast = {
    success: (m: string, d?: number) => add('success', m, d),
    error:   (m: string, d?: number) => add('error',   m, d),
    warning: (m: string, d?: number) => add('warning', m, d),
    info:    (m: string, d?: number) => add('info',    m, d),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      {/* Toast container — bottom-centre on mobile, top-right on desktop */}
      <div className="fixed z-[200] flex flex-col gap-2 pointer-events-none
        bottom-20 left-1/2 -translate-x-1/2 w-max max-w-[90vw]
        md:bottom-auto md:top-5 md:right-5 md:left-auto md:translate-x-0">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium
              pointer-events-auto animate-[slide-up_0.25s_ease-out]
              ${t.type === 'success' ? 'bg-green-800/90 text-green-100 border border-green-600/50' :
                t.type === 'error'   ? 'bg-red-800/90   text-red-100   border border-red-600/50'   :
                t.type === 'warning' ? 'bg-amber-800/90 text-amber-100 border border-amber-600/50' :
                                       'bg-slate-700/95 text-slate-100 border border-slate-600/50'}`}
          >
            {t.type === 'success' && <CheckCircle size={16} className="shrink-0" />}
            {t.type === 'error'   && <XCircle     size={16} className="shrink-0" />}
            {t.type === 'warning' && <AlertTriangle size={16} className="shrink-0" />}
            {t.type === 'info'    && <Info         size={16} className="shrink-0" />}
            <span>{t.message}</span>
            <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
              className="ml-2 opacity-60 hover:opacity-100 shrink-0">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx.toast;
};
