import React, { useEffect, useRef, useState } from 'react';

export type NewFeaturePriority = 'high' | 'medium' | 'low';

export interface NewFeatureData {
  nameFeature: string;
  priorityFeature: NewFeaturePriority;
  descriptionFeature?: string;
}

/**
 * Subset of FeatureTT used to prefill the form when editing. Pass null/omit
 * for create mode.
 */
export interface InitialFeatureValues {
  nameFeature?: string | null;
  priorityFeature?: string | null;
  descriptionFeature?: string | null;
}

export interface AddFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the validated payload. Parent handles the POST/PUT + refresh. */
  onCreate: (data: NewFeatureData) => Promise<void> | void;
  /**
   * When provided the modal renders in "edit" mode: title becomes "Edit
   * Feature", the submit button reads "Save Changes", and fields are
   * prefilled. The parent dispatches PUT vs POST in its onCreate handler.
   */
  initialFeature?: InitialFeatureValues | null;
}

// Oracle CHECK constraint only allows these three — no 'none' for features.
const PRIORITY_OPTIONS: { value: NewFeaturePriority; label: string }[] = [
  { value: 'high',   label: 'High'   },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low'    },
];

const EMPTY_FORM = {
  nameFeature: '',
  priorityFeature: 'medium' as NewFeaturePriority,
  descriptionFeature: '',
};

/**
 * Modal for creating a new feature inside a sprint.
 *
 * Features are conceptually buckets that group related tasks. They can be
 * empty at creation time — tasks reference them later via TASK_TT.feature_id.
 * Story points are computed dynamically from the linked tasks (0 when empty).
 */
export default function AddFeatureModal({
  isOpen,
  onClose,
  onCreate,
  initialFeature,
}: AddFeatureModalProps) {
  const isEditMode = initialFeature != null;
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form + pull focus whenever the modal opens. In edit mode the form
  // is seeded from initialFeature instead of EMPTY_FORM.
  useEffect(() => {
    if (!isOpen) return;
    if (initialFeature) {
      const priority = (['high', 'medium', 'low'].includes(initialFeature.priorityFeature ?? '')
        ? initialFeature.priorityFeature
        : 'medium') as NewFeaturePriority;
      setForm({
        nameFeature:        initialFeature.nameFeature ?? '',
        priorityFeature:    priority,
        descriptionFeature: initialFeature.descriptionFeature ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
    const t = setTimeout(() => nameInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [isOpen, initialFeature]);

  // Escape closes — same pattern as the other modals.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.nameFeature.trim()) return setError('Feature name is required.');

    setError(null);
    setSubmitting(true);
    try {
      await onCreate({
        nameFeature:        form.nameFeature.trim(),
        priorityFeature:    form.priorityFeature,
        descriptionFeature: form.descriptionFeature.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('[AddFeatureModal] onCreate failed', err);
      setError('Could not create the feature. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => { if (!submitting) onClose(); }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-feature-title"
        onClick={e => e.stopPropagation()}
        className="modal-card w-full max-w-md p-7 max-h-[90vh] overflow-y-auto"
      >
        <h2 id="add-feature-title" className="text-xl font-bold text-gray-900 mb-5">
          {isEditMode ? 'Edit Feature' : 'Add New Feature'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feature-name" className="block text-sm font-semibold text-gray-800 mb-2">
              Feature Name
            </label>
            <input
              ref={nameInputRef}
              id="feature-name"
              type="text"
              maxLength={300}
              value={form.nameFeature}
              onChange={e => setForm(p => ({ ...p, nameFeature: e.target.value }))}
              placeholder="e.g. User Authentication"
              disabled={submitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand
                         transition-colors disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="feature-priority" className="block text-sm font-semibold text-gray-800 mb-2">
              Priority
            </label>
            <select
              id="feature-priority"
              value={form.priorityFeature}
              onChange={e => setForm(p => ({ ...p, priorityFeature: e.target.value as NewFeaturePriority }))}
              disabled={submitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand
                         transition-colors disabled:opacity-60"
            >
              {PRIORITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="feature-description" className="block text-sm font-semibold text-gray-800 mb-2">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="feature-description"
              maxLength={2000}
              value={form.descriptionFeature}
              onChange={e => setForm(p => ({ ...p, descriptionFeature: e.target.value }))}
              placeholder="What does this feature cover? Tasks can be added later."
              rows={4}
              disabled={submitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         placeholder:text-gray-400 resize-y
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand
                         transition-colors disabled:opacity-60"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3"
            >
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 border border-gray-300 text-gray-800 py-3 rounded-xl
                         font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand hover:bg-brand-dark text-white py-3 rounded-xl
                         font-semibold shadow-sm transition-colors disabled:opacity-60"
            >
              {submitting
                ? (isEditMode ? 'Saving…' : 'Creating…')
                : (isEditMode ? 'Save Changes' : 'Create Feature')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
