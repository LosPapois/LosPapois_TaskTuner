import React, { useEffect, useRef, useState } from 'react';

export type NewTaskPriority = 'high' | 'medium' | 'low' | 'none';

export interface NewTaskData {
  nameTask: string;
  infoTask?: string;
  priority: NewTaskPriority;
  /** Required — the modal validates this is filled before submitting. */
  storyPoints: number;
  userId: number;
  /** Optional feature to group this task under. */
  featureId?: number | null;
}

/** Lightweight feature shape the modal needs for the assignee dropdown. */
export interface FeatureOption {
  featureId: number;
  nameFeature: string;
}

/**
 * Subset of TaskTT used to prefill the form when editing. Pass `null`/omit
 * for create mode. Field names mirror the backend entity so a TaskDTO can
 * be handed in directly.
 */
export interface InitialTaskValues {
  nameTask?: string | null;
  infoTask?: string | null;
  priority?: string | null;
  storyPoints?: number | null;
  userId?: number | null;
  featureId?: number | null;
}

export interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Project owning this sprint — needed to filter assignee options. */
  projectId: number;
  /** Map<userId, displayName> already loaded by the parent page. */
  usersById: Map<number, string>;
  /**
   * Features available in the current sprint — used to populate the optional
   * feature dropdown so the new task can be linked at creation time.
   */
  features?: FeatureOption[];
  /** Called with the validated payload. Parent handles the POSTs + refresh. */
  onCreate: (data: NewTaskData) => Promise<void> | void;
  /**
   * When provided the modal renders in "edit" mode: title becomes "Edit Task",
   * the submit button reads "Save Changes", and fields are prefilled. The
   * parent is responsible for dispatching PUT vs POST in its onCreate handler.
   */
  initialTask?: InitialTaskValues | null;
}

interface ProjectMembershipDTO {
  pjId: number;
  userId: number;
  // other fields exist but aren't needed here
  [k: string]: unknown;
}

const PRIORITY_OPTIONS: { value: NewTaskPriority; label: string }[] = [
  { value: 'high',   label: 'High'   },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low'    },
  { value: 'none',   label: 'None'   },
];

const EMPTY_FORM = {
  nameTask: '',
  infoTask: '',
  priority: 'medium' as NewTaskPriority,
  storyPoints: '',
  userId: '' as number | '',
  // '' = "(No feature)" — sentinel that lets the dropdown stay controlled
  // while still expressing "leave the FK null".
  featureId: '' as number | '',
};

/**
 * Modal for creating a new task inside a sprint.
 *
 * The assignee dropdown is filtered to the project's members — fetched from
 * /api/project-memberships/project/{pjId} when the modal opens. We
 * cross-reference those userIds against `usersById` (passed in from the
 * parent) so we don't refetch user names that SprintPage already has.
 */
export default function AddTaskModal({
  isOpen,
  onClose,
  projectId,
  usersById,
  features,
  onCreate,
  initialTask,
}: AddTaskModalProps) {
  const isEditMode = initialTask != null;
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form + pull focus + fetch memberships whenever the modal opens.
  // In edit mode, seed the form from initialTask instead of EMPTY_FORM.
  useEffect(() => {
    if (!isOpen) return;
    if (initialTask) {
      const priority = (['high', 'medium', 'low', 'none'].includes(initialTask.priority ?? '')
        ? initialTask.priority
        : 'medium') as NewTaskPriority;
      setForm({
        nameTask:       initialTask.nameTask ?? '',
        infoTask:       initialTask.infoTask ?? '',
        priority,
        storyPoints:    initialTask.storyPoints != null ? String(initialTask.storyPoints) : '',
        userId:         initialTask.userId ?? '',
        featureId:      initialTask.featureId ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
    const t = setTimeout(() => nameInputRef.current?.focus(), 0);

    let cancelled = false;
    setMembersLoading(true);
    fetch(`/api/project-memberships/project/${projectId}`)
      .then(r => (r.ok ? r.json() : []))
      .then((rows: ProjectMembershipDTO[]) => {
        if (cancelled) return;
        setMemberIds(rows.map(r => r.userId));
      })
      .catch(() => { if (!cancelled) setMemberIds([]); })
      .finally(() => { if (!cancelled) setMembersLoading(false); });

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isOpen, projectId]);

  // Escape closes — same pattern as AddSprintModal.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  // Build the assignee option list: intersect project members with the
  // global users map. Filter out memberships whose user isn't cached yet
  // (rare race) so we never render an "Unknown user" option.
  const assigneeOptions = memberIds
    .map(id => ({ id, name: usersById.get(id) }))
    .filter((o): o is { id: number; name: string } => o.name != null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.nameTask.trim()) return setError('Task name is required.');
    if (form.userId === '' || form.userId == null) {
      return setError('Pick an assignee.');
    }

    // Story points are required.
    if (form.storyPoints === '') {
      return setError('Story points are required.');
    }
    const storyPoints = Number(form.storyPoints);
    if (!Number.isFinite(storyPoints) || storyPoints < 0) {
      return setError('Story points must be a non-negative number.');
    }

    setError(null);
    setSubmitting(true);
    try {
      await onCreate({
        nameTask: form.nameTask.trim(),
        infoTask: form.infoTask.trim() || undefined,
        priority: form.priority,
        storyPoints,
        userId: Number(form.userId),
        // null = "no feature" (sentinel empty string) → unset the FK.
        featureId: form.featureId === '' ? null : Number(form.featureId),
      });
      onClose();
    } catch (err) {
      console.error('[AddTaskModal] onCreate failed', err);
      setError('Could not create the task. Please try again.');
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
        aria-labelledby="add-task-title"
        onClick={e => e.stopPropagation()}
        className="modal-card w-full max-w-md p-7 max-h-[90vh] overflow-y-auto"
      >
        <h2 id="add-task-title" className="text-xl font-bold text-gray-900 mb-5">
          {isEditMode ? 'Edit Task' : 'Add New Task'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-name" className="block text-sm font-semibold text-gray-800 mb-2">
              Task Name
            </label>
            <input
              ref={nameInputRef}
              id="task-name"
              type="text"
              value={form.nameTask}
              onChange={e => setForm(p => ({ ...p, nameTask: e.target.value }))}
              placeholder="e.g. Implement login endpoint"
              disabled={submitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand
                         transition-colors disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="task-info" className="block text-sm font-semibold text-gray-800 mb-2">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="task-info"
              value={form.infoTask}
              onChange={e => setForm(p => ({ ...p, infoTask: e.target.value }))}
              placeholder="Short description of what this task involves…"
              rows={3}
              disabled={submitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         placeholder:text-gray-400 resize-y
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand
                         transition-colors disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-priority" className="block text-sm font-semibold text-gray-800 mb-2">
                Priority
              </label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value as NewTaskPriority }))}
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
              <label htmlFor="task-sp" className="block text-sm font-semibold text-gray-800 mb-2">
                Story Points
              </label>
              <input
                id="task-sp"
                type="number"
                min="0"
                value={form.storyPoints}
                onChange={e => setForm(p => ({ ...p, storyPoints: e.target.value }))}
                placeholder="—"
                disabled={submitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand
                           transition-colors disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-assignee" className="block text-sm font-semibold text-gray-800 mb-2">
              Assignee
            </label>
            <select
              id="task-assignee"
              value={form.userId}
              onChange={e => setForm(p => ({
                ...p,
                userId: e.target.value === '' ? '' : Number(e.target.value),
              }))}
              disabled={submitting || membersLoading || assigneeOptions.length === 0}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand
                         transition-colors disabled:opacity-60"
            >
              <option value="" disabled>
                {membersLoading
                  ? 'Loading members…'
                  : assigneeOptions.length === 0
                    ? 'No project members — add some from Team first'
                    : 'Select a member…'}
              </option>
              {assigneeOptions.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-feature" className="block text-sm font-semibold text-gray-800 mb-2">
              Feature <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              id="task-feature"
              value={form.featureId}
              onChange={e => setForm(p => ({
                ...p,
                featureId: e.target.value === '' ? '' : Number(e.target.value),
              }))}
              disabled={submitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand
                         transition-colors disabled:opacity-60"
            >
              <option value="">(No feature)</option>
              {(features ?? []).map(f => (
                <option key={f.featureId} value={f.featureId}>{f.nameFeature}</option>
              ))}
            </select>
          </div>

          {/* Due date is intentionally not asked here — the task inherits */}
          {/* the sprint's end date automatically (set by the parent page). */}

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
                : (isEditMode ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
