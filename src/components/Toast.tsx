import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import './Toast.css';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

let toastId = 0;
let observers: ((toasts: ToastItem[]) => void)[] = [];
let toasts: ToastItem[] = [];

const notify = () => {
  observers.forEach((observer) => observer([...toasts]));
};

export const toast = {
  show: (options: ToastOptions | string) => {
    const defaultOptions: ToastOptions = {
      message: typeof options === 'string' ? options : options.message,
      type: typeof options === 'string' ? 'info' : options.type || 'info',
      duration: typeof options === 'string' ? 3000 : options.duration || 3000,
    };

    const id = ++toastId;
    const newToast: ToastItem = { ...defaultOptions, id };
    toasts.push(newToast);
    notify();

    if (defaultOptions.duration !== Infinity) {
      setTimeout(() => {
        toast.dismiss(id);
      }, defaultOptions.duration);
    }

    return id;
  },
  dismiss: (id: number) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  },
  success: (message: string, duration?: number) => toast.show({ message, type: 'success', duration }),
  error: (message: string, duration?: number) => toast.show({ message, type: 'error', duration }),
  info: (message: string, duration?: number) => toast.show({ message, type: 'info', duration }),
  warning: (message: string, duration?: number) => toast.show({ message, type: 'warning', duration }),
};

export const ToastContainer: React.FC = () => {
  const [currentToasts, setCurrentToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const observer = (updatedToasts: ToastItem[]) => {
      setCurrentToasts(updatedToasts);
    };
    observers.push(observer);
    return () => {
      observers = observers.filter((o) => o !== observer);
    };
  }, []);

  return (
    <div className="toast-container">
      {currentToasts.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          <div className="toast-icon">
            <ToastIcon type={t.type || 'info'} />
          </div>
          <div className="toast-content">{t.message}</div>
          <button className="toast-close" onClick={() => toast.dismiss(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const size = 18;
  const strokeWidth = 2;
  switch (type) {
    case 'success':
      return <CheckCircle2 size={size} strokeWidth={strokeWidth} color="#10b981" />;
    case 'error':
      return <AlertCircle size={size} strokeWidth={strokeWidth} color="#ef4444" />;
    case 'warning':
      return <AlertTriangle size={size} strokeWidth={strokeWidth} color="#f59e0b" />;
    default:
      return <Info size={size} strokeWidth={strokeWidth} color="#0a5fbf" />;
  }
};
