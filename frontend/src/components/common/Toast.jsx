import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const success = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg) => addToast(msg, 'error', 6000), [addToast]);
  const info = useCallback((msg) => addToast(msg, 'info'), [addToast]);
  const warning = useCallback((msg) => addToast(msg, 'warning', 5000), [addToast]);

  const colors = {
    success: 'bg-emerald-500/90 border-emerald-400',
    error: 'bg-red-500/90 border-red-400',
    info: 'bg-blue-500/90 border-blue-400',
    warning: 'bg-amber-500/90 border-amber-400'
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`${colors[toast.type]} border text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-slide-in backdrop-blur-sm`}
          >
            <span className="text-lg font-bold">{icons[toast.type]}</span>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
