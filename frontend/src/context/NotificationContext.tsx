import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType, duration?: number) => void;
  hideNotification: (id: string) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback((message: string, type: NotificationType = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, duration);
    }
  }, [hideNotification]);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmOptions(options);
  }, []);

  const handleConfirm = () => {
    if (confirmOptions) {
      confirmOptions.onConfirm();
      setConfirmOptions(null);
    }
  };

  const handleCancel = () => {
    if (confirmOptions) {
      confirmOptions.onCancel?.();
      setConfirmOptions(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification, showConfirm }}>
      {children}
      <NotificationContainer notifications={notifications} onHide={hideNotification} />

      <AnimatePresence>
        {confirmOptions && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">{confirmOptions.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{confirmOptions.message}</p>
              </div>
              <div className="p-4 bg-[var(--bg-app)]/50 border-t border-[var(--border-soft)] flex gap-3">
                <button 
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--border-subtle)] transition-colors"
                >
                  {confirmOptions.cancelText || 'Cancel'}
                </button>
                <button 
                  onClick={handleConfirm}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${
                    confirmOptions.type === 'danger' 
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' 
                      : 'bg-brand-primary hover:opacity-90 shadow-brand-primary/20'
                  }`}
                >
                  {confirmOptions.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const NotificationContainer: React.FC<{ notifications: Notification[], onHide: (id: string) => void }> = ({ notifications, onHide }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none min-w-[320px] max-w-[420px]">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} onHide={onHide} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const NotificationItem: React.FC<{ notification: Notification, onHide: (id: string) => void }> = ({ notification, onHide }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30',
    error: 'bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30',
    info: 'bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30',
    warning: 'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm ${bgColors[notification.type]}`}
    >
      <div className="mt-0.5">{icons[notification.type]}</div>
      <div className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
        {notification.message}
      </div>
      <button
        onClick={() => onHide(notification.id)}
        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
      >
        <X className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
      </button>
    </motion.div>
  );
};
