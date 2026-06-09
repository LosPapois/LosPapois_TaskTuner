import React, { useEffect, useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ClipboardDocumentListIcon, UsersIcon } from '@heroicons/react/24/outline';
import { MemberListItem } from '../Team';

// Max tasks shown per page in list mode before pagination kicks in.
const TASKS_PER_PAGE = 10;

export type TaskPriority = 'high' | 'medium' | 'low' | 'none';
export type TaskState = 'active' | 'done' | 'delayed';
export type TaskBoardMode = 'list' | 'kanban';

export interface DeveloperBoardMember {
  key: string;
  name: string;
  subtitle: string;
}

export interface DeveloperBoardKpis {
  tasksCompleted: number;
  cycleTime: string;
  assignedTasks: number;
  totalStoryPoints: number;
  progress: string;
}

export interface DeveloperBoardTask {
  id: number;
  name: string;
  featureName?: string;
  storyPoints?: number | null;
  priority: TaskPriority;
  state: TaskState;
}

export interface DeveloperTaskBoardProps {
  developers: DeveloperBoardMember[];
  selectedDeveloperKey: string | null;
  onSelectDeveloper: (key: string) => void;
  selectedDeveloperName?: string;
  kpis: DeveloperBoardKpis;
  tasks: DeveloperBoardTask[];
  mode: TaskBoardMode;
  onModeChange: (mode: TaskBoardMode) => void;
  onTaskClick?: (taskId: number) => void;
}

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-green-100 text-green-700',
  none: 'bg-gray-100 text-gray-600',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'Not set',
};

const STATE_BADGE: Record<TaskState, string> = {
  active: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  delayed: 'bg-amber-100 text-amber-700',
};

const STATE_LABEL: Record<TaskState, string> = {
  active: 'Active',
  done: 'Done',
  delayed: 'Delayed',
};

function MiniKpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1 leading-snug">{label}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
    </div>
  );
}

function TaskRow({
  task,
  onClick,
}: {
  task: DeveloperBoardTask;
  onClick?: (taskId: number) => void;
}) {
  // Mirrors the Team page treatment for completed tasks: filled green
  // check + struck-through, muted name so done work reads at a glance.
  const isDone = task.state === 'done';
  return (
    <li
      className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => onClick?.(task.id)}
    >
      <div className="flex items-center gap-3">
        {isDone ? (
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
              isDone ? 'text-gray-400 line-through' : 'text-gray-800'
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
              {task.storyPoints != null && task.storyPoints > 0 && <span>{task.storyPoints} SP</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATE_BADGE[task.state]}`}
          >
            {STATE_LABEL[task.state]}
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[task.priority]}`}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>
        </div>
      </div>
    </li>
  );
}

function KanbanColumn({
  title,
  tasks,
  tone,
  onTaskClick,
}: {
  title: string;
  tasks: DeveloperBoardTask[];
  tone: string;
  onTaskClick?: (taskId: number) => void;
}) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 min-h-[220px]">
      <div className="flex items-center justify-between mb-3">
        <h5 className={`text-sm font-semibold ${tone}`}>{title}</h5>
        <span className="text-xs text-gray-500">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs text-gray-400">No tasks in this column.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const isDone = task.state === 'done';
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskClick?.(task.id)}
                className="w-full text-left bg-white border border-gray-200 rounded-lg p-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isDone && (
                    <CheckCircleIcon
                      className="h-4 w-4 text-green-500 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={`text-sm font-medium truncate ${
                      isDone ? 'text-gray-400 line-through' : 'text-gray-800'
                    }`}
                  >
                    {task.name}
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${PRIORITY_BADGE[task.priority]}`}
                  >
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                  {task.storyPoints != null && task.storyPoints > 0 && (
                    <span className="text-[11px] text-gray-500">{task.storyPoints} SP</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DeveloperTaskBoard({
  developers,
  selectedDeveloperKey,
  onSelectDeveloper,
  selectedDeveloperName,
  kpis,
  tasks,
  mode,
  onModeChange,
  onTaskClick,
}: DeveloperTaskBoardProps) {
  // Filters — apply to BOTH list and kanban views so the developer sees a
  // consistent filtered set regardless of mode. Reset whenever the selected
  // developer changes so each switch starts clean.
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [stateFilter, setStateFilter] = useState<'all' | TaskState>('all');
  useEffect(() => {
    setSearchQuery('');
    setPriorityFilter('all');
    setStateFilter('all');
  }, [selectedDeveloperKey]);

  const filteredTasks = tasks.filter(t => {
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (stateFilter !== 'all' && t.state !== stateFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      if (!t.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activeTasks = filteredTasks.filter(t => t.state === 'active');
  const doneTasks = filteredTasks.filter(t => t.state === 'done');
  const delayedTasks = filteredTasks.filter(t => t.state === 'delayed');

  // Pagination state for list mode — Kanban is unaffected because it already
  // splits tasks by state column. Reset to page 1 whenever the developer
  // changes or the filtered count changes so we never land on an empty page.
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDeveloperKey, filteredTasks.length]);

  // Sort done tasks to the bottom so the list always shows pending work
  // first. Stable sort keeps the relative order within each group.
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aDone = a.state === 'done' ? 1 : 0;
    const bDone = b.state === 'done' ? 1 : 0;
    return aDone - bDone;
  });

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / TASKS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * TASKS_PER_PAGE;
  const pageEnd = Math.min(pageStart + TASKS_PER_PAGE, sortedTasks.length);
  const paginatedTasks = sortedTasks.slice(pageStart, pageEnd);

  const hasActiveFilters =
    searchQuery.trim() !== '' || priorityFilter !== 'all' || stateFilter !== 'all';

  return (
    <div className="border-t border-gray-100 pt-5 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          Developers ({developers.length})
        </h3>
        {developers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <UsersIcon
              className="h-10 w-10 text-gray-300 mb-2"
              aria-hidden="true"
            />
            <p className="text-sm text-gray-500">
              No developers with tasks in this sprint.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {developers.map(d => (
              <MemberListItem
                key={d.key}
                name={d.name}
                role={d.subtitle}
                selected={selectedDeveloperKey === d.key}
                onSelect={() => onSelectDeveloper(d.key)}
                // The 'unassigned' bucket is a synthetic group, not a real
                // user — render it with the dashed/icon variant so it never
                // gets confused with an actual developer.
                isUnassigned={d.key === 'unassigned'}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        {selectedDeveloperKey == null ? (
          <p className="text-sm text-gray-400 self-center text-center mt-12">
            Select a developer to view sprint KPIs and tasks.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-gray-800">{selectedDeveloperName}</h3>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => onModeChange('list')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === 'list'
                      ? 'bg-brand text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('kanban')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === 'kanban'
                      ? 'bg-brand text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Kanban
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <MiniKpi label="Completed Tasks" value={kpis.tasksCompleted} />
              <MiniKpi label="Average Cycle Time" value={kpis.cycleTime} />
              <MiniKpi label="Assigned Tasks" value={kpis.assignedTasks} />
              <MiniKpi label="Total Story Points" value={`${kpis.totalStoryPoints} SP`} />
              <MiniKpi label="Current Progress" value={kpis.progress} />
            </div>

            {/* Filters: search by name + priority dropdown + state dropdown. */}
            {/* Applied to both list and kanban modes. */}
            {tasks.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search tasks…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[180px] px-3 py-1.5 text-sm border border-gray-300
                             rounded-lg placeholder:text-gray-400
                             focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
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
                  onChange={e => setStateFilter(e.target.value as 'all' | TaskState)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white
                             focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                >
                  <option value="all">All states</option>
                  <option value="active">Active</option>
                  <option value="done">Done</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>
            )}

            {mode === 'list' ? (
              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3">
                  Assigned Tasks ({tasks.length})
                </h4>
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ClipboardDocumentListIcon
                      className="h-12 w-12 text-gray-300 mb-3"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-gray-500">
                      No tasks assigned to this developer in this sprint.
                    </p>
                  </div>
                ) : filteredTasks.length === 0 ? (
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
                  <>
                    <ul className="space-y-2">
                      {paginatedTasks.map(t => (
                        <TaskRow key={t.id} task={t} onClick={onTaskClick} />
                      ))}
                    </ul>

                    {/* Pagination bar — only rendered when there's more than */}
                    {/* one page so a short task list stays clean. Total comes */}
                    {/* from filteredTasks so the count reflects the visible set. */}
                    {totalPages > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                        <span className="text-xs text-gray-500">
                          Showing {pageStart + 1}–{pageEnd} of {filteredTasks.length}
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
              </div>
            ) : (
              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3">
                  Tasks by Status
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <KanbanColumn
                    title="Active"
                    tasks={activeTasks}
                    tone="text-blue-700"
                    onTaskClick={onTaskClick}
                  />
                  <KanbanColumn
                    title="Delayed"
                    tasks={delayedTasks}
                    tone="text-amber-700"
                    onTaskClick={onTaskClick}
                  />
                  <KanbanColumn
                    title="Done"
                    tasks={doneTasks}
                    tone="text-green-700"
                    onTaskClick={onTaskClick}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
