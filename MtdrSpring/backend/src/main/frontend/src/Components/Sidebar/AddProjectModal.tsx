import React, { useEffect, useRef, useState } from 'react';

export interface NewProjectData {
  name: string;
  /** ISO date string (yyyy-mm-dd) from <input type="date">. */
  startDate: string;
  endDate: string;
}

export interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewProjectData) => Promise<void>;
  submitting?: boolean;
  error?: string | null;
}

const EMPTY_FORM: NewProjectData = {
  name: '',
  startDate: '',
  endDate: '',
};

export default function AddProjectModal({
  isOpen,
  onClose,
  onCreate,
  submitting = false,
  error,
}: AddProjectModalProps) {
  const [form, setForm] = useState<NewProjectData>(EMPTY_FORM);
  const [localError, setLocalError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setLocalError(null);
    const t = setTimeout(() => nameInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  const handleChange = (field: keyof NewProjectData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return setLocalError('Project name is required.');
    if (!form.startDate) return setLocalError('Start date is required.');
    if (!form.endDate) return setLocalError('End date is required.');
    if (form.endDate < form.startDate) {
      return setLocalError('End date cannot be earlier than start date.');
    }

    setLocalError(null);
    await onCreate({
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => {
        if (!submitting) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-project-title"
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7"
      >
        <h2
          id="add-project-title"
          className="heading-page!"
        >
          Add New Project
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="project-name"
              className="label-form"
            >
              Project Name
            </label>
            <input
              ref={nameInputRef}
              id="project-name"
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="e.g. Mobile App Revamp"
              className="input-brand"
            />
          </div>

          <div>
            <label
              htmlFor="project-start"
              className="label-form"
            >
              Start Date
            </label>
            <input
              id="project-start"
              type="date"
              value={form.startDate}
              onChange={e => handleChange('startDate', e.target.value)}
              className="input-brand"
            />
          </div>

          <div>
            <label
              htmlFor="project-end"
              className="label-form"
            >
              End Date
            </label>
            <input
              id="project-end"
              type="date"
              value={form.endDate}
              onChange={e => handleChange('endDate', e.target.value)}
              className="input-brand"
            />
          </div>

          {(localError || error) && (
            <p
              role="alert"
              className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3"
            >
              {localError ?? error}
            </p>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-primary"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
