import React, { useEffect, useState } from 'react';
import {
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import MemberAvatar, { AvatarTone } from './MemberAvatar';

// Max tasks shown per page before the pagination bar takes over.
const TASKS_PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MemberDetailMember {
  id: number;
  name: string;
  role: string;
  email: string;
  avatarTone?: AvatarTone;
}

export interface MemberDetailKpis {
  tasksCompleted: number;
  cycleTime: string;
  assignedTasks: number;
  features: number;
  progress: string;
}

export type MemberTaskPriority = 'high' | 'medium' | 'low' | 'none';

export interface MemberTaskLite {
  id: number;
  name: string;
  /** Long-text description (TaskTT.infoTask). Optional — enables expansion. */
  description?: string | null;
  /** Name of the parent feature, if any. Tasks without featureId omit it. */
  featureName?: string;
  /** Task-level priority (TaskTT.priority). */
  priority: MemberTaskPriority;
  /** Story points of the task, if set. */
  storyPoints?: number | null;
  /** True when the task has a real end date — i.e., actually closed. */
  done: boolean;
  /** ISO date string from the backend, used for sorting in the panel. */
  dateStartTask?: string | null;
  /** ISO date string for the planned end date (TaskTT.dateEndSetTask). */
  dateEndSetTask?: string | null;
}

export interface MemberDetailPanelProps {
  member: MemberDetailMember;
  kpis: MemberDetailKpis;
  /** Tasks assigned to this member in the current project. */
  tasks?: MemberTaskLite[];
  onEdit?: () => void;
  onDelete?: () => void;
  onTaskClick?: (taskId: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<MemberTaskPriority, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low:    'bg-green-100 text-green-700',
  none:   'bg-gray-100 text-gray-600',
};

const PRIORITY_LABEL: Record<MemberTaskPriority, string> = {
  high:   'High',
  medium: 'Medium',
  low:    'Low',
  none:   'Not set',
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

/** Compact KPI tile used inside the member detail panel. */
function MiniKpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1 leading-snug">{label}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
    </div>
  );
}

/**
 * Single task row in the "Assigned Tasks" list.
 *
 * Layout:
 *   [status-icon] [name + meta]  [priority chip]  [chevron if expandable]
 *
 * When the task has a description, the row becomes a native <details>
 * element — click anywhere on the summary line to expand and read the
 * full body. Tasks without description render as a plain row.
 */
function TaskItem({ task, onClick }: { task: MemberTaskLite; onClick?: () => void }) {
  const hasDescription =
    !!task.description && task.description.trim().length > 0;

  return (
    <li
      className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Completion indicator — filled green check when done, empty circle otherwise. */}
        {task.done ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0" aria-hidden="true" />
        ) : (
          <span
            className="h-5 w-5 rounded-full border-2 border-gray-300 shrink-0"
            aria-hidden="true"
          />
        )}

        <div className="min-w-0 flex-1">
          <div
            className={`text-sm font-medium truncate ${
              task.done ? 'text-gray-400 line-through' : 'text-gray-800'
            }`}
          >
            {task.name}
          </div>
          {(task.featureName || task.storyPoints != null) && (
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
              {task.featureName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 truncate max-w-[180px]">
                  {task.featureName}
                </span>
              )}
              {task.storyPoints != null && task.storyPoints > 0 && (
                <span>{task.storyPoints} SP</span>
              )}
            </div>
          )}
        </div>

        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                      text-xs font-medium shrink-0
                      ${PRIORITY_BADGE[task.priority]}`}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>

        <ChevronRightIcon
          className="size-4 text-gray-400 shrink-0"
          aria-hidden="true"
        />
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Right-hand panel showing the selected member's profile, per-project KPIs,
 * and the tasks assigned to them. Edit / Delete buttons are wired through
 * optional callbacks so the parent controls what happens (modal, confirm).
 */
function MemberDetailPanel({
  member,
  kpis,
  tasks,
  onEdit,
  onDelete,
  onTaskClick
}: MemberDetailPanelProps) {
  // Filters + sort — controlled inputs above the task list. Reset when the
  // member changes so each panel starts fresh.
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | MemberTaskPriority>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'done' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<
    'none' | 'start-asc' | 'start-desc' | 'end-asc' | 'end-desc'
  >('none');

  // Pagination state for the Assigned Tasks list. Resets to page 1 when the
  // selected member changes or the task count changes so we never land on
  // an empty page after a switch or a deletion.
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setPriorityFilter('all');
    setStateFilter('all');
    setSortBy('none');
  }, [member.id]);

  // Apply filters first, then sort done to the bottom. Pagination kicks in
  // after the filter+sort so page indices map to the currently visible set.
  const filteredTasks = (tasks ?? []).filter(t => {
    if (priorityFilter !== 'all' && (t.priority ?? 'none') !== priorityFilter) return false;
    if (stateFilter === 'done' && !t.done) return false;
    if (stateFilter === 'pending' && t.done) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      if (!t.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Sort pipeline: done tasks always go to the bottom (Option A behavior),
  // and within each group (pending / done) we apply the user's date sort.
  // Tasks without a date go to the end of their group regardless of direction.
  const compareDates = (a: MemberTaskLite, b: MemberTaskLite): number => {
    if (sortBy === 'none') return 0;
    const field: keyof MemberTaskLite =
      sortBy === 'start-asc' || sortBy === 'start-desc'
        ? 'dateStartTask'
        : 'dateEndSetTask';
    const dir = (sortBy === 'start-desc' || sortBy === 'end-desc') ? -1 : 1;
    const av = a[field] as string | null | undefined;
    const bv = b[field] as string | null | undefined;
    // Empty/null dates go last regardless of direction.
    if (!av && !bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    const cmp = av.localeCompare(bv); // ISO date strings compare lexicographically
    return cmp * dir;
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aDone = a.done ? 1 : 0;
    const bDone = b.done ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return compareDates(a, b);
  });

  // Reset to page 1 whenever the filter result count changes — prevents
  // landing on an empty page when filters narrow the list aggressively.
  useEffect(() => {
    setCurrentPage(1);
  }, [sortedTasks.length]);

  const taskCount = sortedTasks.length;
  const totalPages = Math.max(1, Math.ceil(taskCount / TASKS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * TASKS_PER_PAGE;
  const pageEnd = Math.min(pageStart + TASKS_PER_PAGE, taskCount);
  const paginatedTasks = sortedTasks.slice(pageStart, pageEnd);

  const hasAnyTasks = (tasks ?? []).length > 0;
  const hasActiveFilters =
    searchQuery.trim() !== '' || priorityFilter !== 'all' || stateFilter !== 'all';

  return (
    <div>
      {/* Header: avatar + identity + actions */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <MemberAvatar name={member.name} size="lg" tone={member.avatarTone} />
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-gray-800 truncate">{member.name}</h3>
            <p className="text-sm text-gray-600 truncate">{member.role}</p>
            <p className="text-sm text-gray-500 truncate">{member.email}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                       bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                       bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      {/* KPIs */}
      <h4 className="text-base font-semibold text-gray-800 mb-3">
        Project Member KPIs
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MiniKpi label="Completed Tasks" value={kpis.tasksCompleted} />
        <MiniKpi label="Average Cycle Time" value={kpis.cycleTime} />
        <MiniKpi label="Assigned Tasks" value={kpis.assignedTasks} />
        <MiniKpi label="Assigned Features" value={kpis.features} />
        <MiniKpi label="Current Progress" value={kpis.progress} />
      </div>

      {/* Tasks — shown only when the parent passes data, so the panel stays
          reusable for consumers that don't care about task detail. */}
      {tasks && (
        <>
          <h4 className="text-base font-semibold text-gray-800 mt-6 mb-3">
            Assigned Tasks ({tasks.length})
          </h4>
          {!hasAnyTasks ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ClipboardDocumentListIcon
                className="h-12 w-12 text-gray-300 mb-3"
                aria-hidden="true"
              />
              <p className="text-sm text-gray-500">
                This member has no tasks assigned in this project.
              </p>
            </div>
          ) : (
            <>
              {/* Filters: search by name + priority dropdown + state dropdown */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Search tasks…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[140px] px-3 py-1.5 text-sm border border-gray-300
                             rounded-lg placeholder:text-gray-400
                             focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value as 'all' | MemberTaskPriority)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white
                             focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                >
                  <option value="all">All priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="none">Not set</option>
                </select>
                <select
                  value={stateFilter}
                  onChange={e => setStateFilter(e.target.value as 'all' | 'done' | 'pending')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white
                             focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                >
                  <option value="all">All states</option>
                  <option value="pending">Pending</option>
                  <option value="done">Done</option>
                </select>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white
                             focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                >
                  <option value="none">No sort</option>
                  <option value="start-asc">Start date ↑</option>
                  <option value="start-desc">Start date ↓</option>
                  <option value="end-asc">End date ↑</option>
                  <option value="end-desc">End date ↓</option>
                </select>
              </div>

              {taskCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ClipboardDocumentListIcon
                    className="h-10 w-10 text-gray-300 mb-2"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-gray-500">
                    {hasActiveFilters
                      ? 'No tasks match the current filters.'
                      : 'No tasks to show.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {paginatedTasks.map(t => (
                    <TaskItem key={t.id} task={t} onClick={() => onTaskClick?.(t.id)} />
                  ))}
                </ul>
              )}

              {/* Pagination bar — only when the filtered list has more than */}
              {/* one page so a short visible list stays clean. */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  <span className="text-xs text-gray-500">
                    Showing {pageStart + 1}–{pageEnd} of {taskCount}
                  </span>
                  <nav className="flex items-center gap-1" aria-label="Tasks pagination">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      aria-label="Previous page"
                      className="px-2.5 py-1 text-sm border border-gray-200 rounded-md
                                 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                                 transition-colors"
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCurrentPage(n)}
                        aria-current={n === safePage ? 'page' : undefined}
                        className={`min-w-[2rem] px-2.5 py-1 text-sm border rounded-md
                                    transition-colors ${
                          n === safePage
                            ? 'border-brand bg-brand text-white'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      aria-label="Next page"
                      className="px-2.5 py-1 text-sm border border-gray-200 rounded-md
                                 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                                 transition-colors"
                    >
                      ›
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default React.memo(MemberDetailPanel);
