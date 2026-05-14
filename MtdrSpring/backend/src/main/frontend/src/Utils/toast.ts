// ─── Lightweight imperative toast system ─────────────────────────────────────
//
// Usage (anywhere in the app):
//   import { toast } from '../Utils/toast';
//   toast('Changes saved!');
//   toast('Something went wrong', 'error');
//
// The <Toaster /> component in App.tsx subscribes and renders the notifications.

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (item: ToastItem) => void;

let _listeners: Listener[] = [];
let _idCounter = 0;

export function toast(message: string, type: ToastType = 'success'): void {
  const item: ToastItem = { id: ++_idCounter, message, type };
  _listeners.forEach(fn => fn(item));
}

export function subscribeToast(fn: Listener): () => void {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter(l => l !== fn);
  };
}
