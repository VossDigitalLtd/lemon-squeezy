// components/ui/Toast.tsx
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X, LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface ToastData {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastConfig {
  bg: string;
  border: string;
  icon: LucideIcon;
  iconColor: string;
  progressBg: string;
  text: string;
}

interface ToastProps {
  toast: ToastData;
  onRemove: (id: number) => void;
}

export default function Toast({ toast, onRemove }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration || 4000;
    const interval = 50; // Update every 50ms
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev - decrement;
        return next <= 0 ? 0 : next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.duration]);

  const getToastConfig = (type: ToastType): ToastConfig => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-white',
          border: 'border-green-500',
          icon: CheckCircle,
          iconColor: 'text-green-600',
          progressBg: 'bg-green-500',
          text: 'text-gray-900'
        };
      case 'error':
        return {
          bg: 'bg-white',
          border: 'border-red-500',
          icon: XCircle,
          iconColor: 'text-red-600',
          progressBg: 'bg-red-500',
          text: 'text-gray-900'
        };
      case 'warning':
        return {
          bg: 'bg-white',
          border: 'border-orange-500',
          icon: Info,
          iconColor: 'text-orange-600',
          progressBg: 'bg-orange-500',
          text: 'text-gray-900'
        };
      case 'info':
        return {
          bg: 'bg-white',
          border: 'border-primary',
          icon: Info,
          iconColor: 'text-gray-900',
          progressBg: 'bg-primary',
          text: 'text-gray-900'
        };
      default:
        return {
          bg: 'bg-white',
          border: 'border-gray-400',
          icon: Info,
          iconColor: 'text-gray-600',
          progressBg: 'bg-gray-400',
          text: 'text-gray-900'
        };
    }
  };

  const config = getToastConfig(toast.type);
  const Icon = config.icon;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border-l-4 shadow-2xl transition-all transform",
      "animate-in slide-in-from-top-5 fade-in duration-300",
      config.bg,
      config.border
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium leading-relaxed", config.text)}>
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100 p-1"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className={cn("h-full transition-all ease-linear", config.progressBg)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
