import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { subscribeToast, ToastItem } from '../../Utils/toast';

const AUTO_DISMISS_MS = 3500;

/**
 * Toast styling configuration using design system classes
 * Maps toast types to their corresponding badge and icon classes from globals.css
 */
const TOAST_STYLES: Record<ToastItem['type'], { badge: string; icon: string; text: string; bg: string; bar: string }> = {
  success: {
    badge: 'icon-badge-success',
    icon: 'text-brand',
    text: 'text-gray-800',
    bg: 'bg-white',
    bar: 'bg-brand',
  },
  error: {
    badge: 'icon-badge-danger',
    icon: 'text-red-500',
    text: 'text-gray-800',
    bg: 'bg-white',
    bar: 'bg-red-500',
  },
  info: {
    badge: 'icon-badge-info',
    icon: 'text-blue-500',
    text: 'text-gray-800',
    bg: 'bg-white',
    bar: 'bg-blue-500',
  },
};

const ICONS: Record<ToastItem['type'], React.ElementType> = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  info: InformationCircleIcon,
};

interface ActiveToast extends ToastItem {
  exiting: boolean;
}

/**
 * Toast Card - Individual notification element
 * 
 * Uses design system classes for consistent styling:
 * - toast-card: base card styles
 * - toast-bar: colored left accent bar
 * - btn-icon-light: dismiss button
 */
function ToastCard({ item, onRemove }: { item: ActiveToast; onRemove: (id: number) => void }) {
  const style = TOAST_STYLES[item.type];
  const Icon = ICONS[item.type];

  return (
    <div
      className={`toast-card ${style.bg}
        ${item.exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      {/* Left accent bar */}
      <span className={`toast-bar ${style.bar}`} />

      {/* Icon */}
      <Icon className={`size-5 shrink-0 mt-0.5 ${style.icon}`} />

      {/* Message text */}
      <p className={`toast-text ${style.text}`}>
        {item.message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={() => onRemove(item.id)}
        className="btn-icon-light shrink-0"
        aria-label="Dismiss"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}

/**
 * Toaster Component - Global notification system
 * 
 * Subscribes to toast events and renders notifications in a fixed container.
 * Uses design system classes for consistent appearance across the app.
 * 
 * Implements auto-dismiss with configurable timeout and smooth exit animation.
 */
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
    <div className="toast-container">
      {toasts.map(t => (
        <ToastCard key={t.id} item={t} onRemove={remove} />
      ))}
    </div>,
    document.body
  );
}
