import React, { useEffect, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Async-friendly: the modal shows a "Deleting…" state while this resolves
   * and only auto-closes on success. If it throws, the modal stays open and
   * surfaces an error message so the user can retry.
   */
  onConfirm: () => Promise<void> | void;
  /** Header text — e.g. "Delete Task", "Delete Feature". */
  title: string;
  /** Body copy explaining what will happen. */
  message: string;
  /** Optional name of the item being deleted — rendered emphasised. */
  itemName?: string;
  /** Override the confirm button label (defaults to "Delete"). */
  confirmText?: string;
}

/**
 * Generic destructive-confirmation modal.
 *
 * Reusable across tasks, features, and any other delete action. The parent
 * provides the async `onConfirm` which performs the actual DELETE; this
 * component owns the loading/error UX so callers don't have to repeat it.
 */
export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmText = 'Delete',
}: ConfirmDeleteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state every time the modal opens — avoids stale errors from a
  // previous open/close cycle leaking back in.
  useEffect(() => {
    if (isOpen) {
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  // Escape closes (unless mid-submit so the user doesn't lose track of a
  // pending request).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('[ConfirmDeleteModal] onConfirm failed', err);
      setError('Could not complete the deletion. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={() => { if (!submitting) onClose(); }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Red header band — destructive intent should read at a glance */}
        <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
          <ExclamationTriangleIcon
            className="h-7 w-7 text-white flex-shrink-0"
            aria-hidden="true"
          />
          <h2
            id="confirm-delete-title"
            className="text-xl font-bold text-white"
          >
            {title}
          </h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            <p className="font-semibold">This action cannot be undone.</p>
            <p className="mt-1">{message}</p>
          </div>

          {itemName && (
            <div className="text-sm text-gray-700">
              <span className="text-gray-500">Item:</span>{' '}
              <span className="font-semibold text-gray-900 break-words">
                {itemName}
              </span>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
            >
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg
                         font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold
                         hover:bg-red-700 transition-colors
                         disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              {submitting ? 'Deleting…' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
