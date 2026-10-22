import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', durationMs = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    if (durationMs > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-xl border shadow-lg text-xs font-medium transition animate-in slide-in-from-bottom-2 ${
                isSuccess
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : isError
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
              <span className="flex-1 leading-relaxed">{toast.message}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
