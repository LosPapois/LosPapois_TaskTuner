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
        className="modal-card w-full max-w-md overflow-hidden"
      >
        {/* Neutral header — warning conveyed by a tinted icon "chip" instead */}
        {/* of a full red band, so the modal reads as a calm conversation */}
        {/* rather than an alarm. */}
        <div className="px-6 pt-6 pb-2 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 flex-shrink-0">
            <ExclamationTriangleIcon
              className="h-6 w-6 text-red-600"
              aria-hidden="true"
            />
          </span>
          <h2
            id="confirm-delete-title"
            className="text-xl font-bold text-gray-900"
          >
            {title}
          </h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-gray-900">This action cannot be undone.</p>
            <p className="mt-1 text-gray-600">{message}</p>
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
              className="flex-1 px-4 py-2 bg-brand-900 text-white rounded-lg font-semibold
                         hover:bg-brand-800 transition-colors shadow-sm shadow-brand-900/30
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Deleting…' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
