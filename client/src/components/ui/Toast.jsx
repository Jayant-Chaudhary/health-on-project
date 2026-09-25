import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-terracotta" />,
    info: <Info className="h-5 w-5 text-primary" />
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center w-full max-w-sm bg-raised rounded-lg shadow-card p-4 border text-ink">
      <div className="flex-shrink-0 mr-3">
        {icons[type] || icons.info}
      </div>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button 
        onClick={onClose}
        className="ml-4 text-ink-3 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1 min-h-[48px] min-w-[48px] flex items-center justify-center -mr-2"
        aria-label="Close toast"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
