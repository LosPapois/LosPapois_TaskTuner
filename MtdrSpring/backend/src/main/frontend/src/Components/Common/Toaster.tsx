import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { subscribeToast, ToastItem } from '../../Utils/toast';

const AUTO_DISMISS_MS = 3500;

const STYLES: Record<ToastItem['type'], { bar: string; icon: string; text: string; bg: string }> = {
  success: {
    bar:  'bg-brand',
    icon: 'text-brand',
    text: 'text-gray-800',
    bg:   'bg-white',
  },
  error: {
    bar:  'bg-red-500',
    icon: 'text-red-500',
    text: 'text-gray-800',
    bg:   'bg-white',
  },
  info: {
    bar:  'bg-blue-500',
    icon: 'text-blue-500',
    text: 'text-gray-800',
    bg:   'bg-white',
  },
};

const ICONS: Record<ToastItem['type'], React.ElementType> = {
  success: CheckCircleIcon,
  error:   ExclamationCircleIcon,
  info:    InformationCircleIcon,
};

interface ActiveToast extends ToastItem {
  exiting: boolean;
}

function ToastCard({ item, onRemove }: { item: ActiveToast; onRemove: (id: number) => void }) {
  const s = STYLES[item.type];
  const Icon = ICONS[item.type];

  return (
    <div
      className={`
        relative flex items-start gap-3 w-80 rounded-xl shadow-lg border border-gray-100
        px-4 py-3 ${s.bg}
        transition-all duration-300 ease-in-out
        ${item.exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      {/* Left accent bar */}
      <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${s.bar}`} />

      <Icon className={`size-5 shrink-0 mt-0.5 ${s.icon}`} />

      <p className={`flex-1 text-sm font-medium leading-snug ${s.text}`}>
        {item.message}
      </p>

      <button
        onClick={() => onRemove(item.id)}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}

export default function Toaster() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    return subscribeToast(item => {
      const active: ActiveToast = { ...item, exiting: false };
      setToasts(prev => [...prev, active]);

      // Start exit animation slightly before removal
      setTimeout(() => {
        setToasts(prev =>
          prev.map(t => (t.id === item.id ? { ...t, exiting: true } : t))
        );
      }, AUTO_DISMISS_MS - 300);

      // Remove from DOM after animation completes
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== item.id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  function remove(id: number) {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }

  if (toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2 items-end"
    >
      {toasts.map(t => (
        <ToastCard key={t.id} item={t} onRemove={remove} />
      ))}
    </div>,
    document.body
  );
}
