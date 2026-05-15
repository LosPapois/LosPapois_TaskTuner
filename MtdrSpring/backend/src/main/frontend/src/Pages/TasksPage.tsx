import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button, TableBody, CircularProgress } from '@mui/material';
import Moment from 'react-moment';
import { FunnelIcon, CheckCircleIcon, ArrowUturnLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import palette from '../theme';
import { saveToStorage, getFromStorage, STORAGE_KEYS } from '../Utils/storage';

/** Shape of GET /api/projects/{pjId}/board — used only in board mode. */
type BoardData = {
  backlog: TaskDTO[];
  active: TaskDTO[];
  completed: TaskDTO[];
};
const EMPTY_BOARD: BoardData = { backlog: [], active: [], completed: [] };
const BOARD_COLUMNS: { key: keyof BoardData; label: string; accent: string }[] = [
  { key: 'backlog',   label: 'Backlog',   accent: '#6b7280' },
  { key: 'active',    label: 'Active',    accent: '#2563eb' },
  { key: 'completed', label: 'Completed', accent: '#16a34a' },
];

type Priority = 'high' | 'medium' | 'low';
type SortOption =
  | 'none'
  | 'endDateAsc'
  | 'endDateDesc'
  | 'startDateAsc'
  | 'startDateDesc';

type TaskDTO = {
  taskId: number;
  nameTask: string | null;
  storyPoints: number | null;
  dateStartTask: string | null;
  dateEndSetTask: string | null;
  dateEndRealTask: string | null;
  priority: Priority | null;
  infoTask: string | null;
  userId: number;
  pjId: number;
};

type ProjectDTO = {
  pjId: number;
  namePj: string;
};

type UserDTO = {
  userId: number;
  nameUser: string;
};

const priorityColors: Record<Priority, { bg: string; text: string }> = {
  high: { bg: '#fee2e2', text: '#dc2626' },
  medium: { bg: '#fef3c7', text: '#d97706' },
  low: { bg: '#dcfce7', text: '#16a34a' },
};

function PriorityBadge({ priority }: { priority?: Priority | null }) {
  if (!priority) return null;
  const colors = priorityColors[priority];
  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.text,
      padding: '2px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 600,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {priority}
    </span>
  );
}

function StoryPointsBadge({ points }: { points?: number | null }) {
  if (points == null) return null;
  return (
    <span style={{
      backgroundColor: palette.bgLight,
      color: palette.secondary,
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {points} SP
    </span>
  );
}

function TaskProgressWidget({ tasks }: { tasks: TaskDTO[] }) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.dateEndRealTask != null).length;
  const inProgress = tasks.filter(t => t.dateEndRealTask == null && t.dateStartTask != null).length;
  const pending = total - completed - inProgress;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '16px',
      padding: '20px 24px',
      marginBottom: '20px',
      boxShadow: '0 8px 20px -4px rgba(0, 155, 119, 0.15), 0 2px 6px rgba(0, 77, 64, 0.06)',
      width: '95%',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Task Progress</p>
          <p style={{ fontSize: '32px', fontWeight: 700, margin: '4px 0 0 0', color: '#111827' }}>
            {completed} <span style={{ fontSize: '20px', color: '#9ca3af', fontWeight: 400 }}>/ {total}</span>
          </p>
          <p style={{ fontSize: '14px', color: '#16a34a', fontWeight: 600, margin: '4px 0 0 0' }}>
            {percent}% completed
          </p>
        </div>
        <span style={{
          display: 'flex',
          width: '40px',
          height: '40px',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          backgroundColor: '#dcfce7',
        }}>
          <CheckCircleSolid style={{ width: '22px', height: '22px', color: '#16a34a' }} />
        </span>
      </div>

      <div style={{
        marginTop: '16px',
        height: '12px',
        width: '100%',
        backgroundColor: '#e5e7eb',
        borderRadius: '9999px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${percent}%`,
          backgroundColor: '#16a34a',
          borderRadius: '9999px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginTop: '16px',
      }}>
        <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#16a34a', margin: 0 }}>Completed</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a', margin: '4px 0 0 0' }}>{completed}</p>
        </div>
        <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#2563eb', margin: 0 }}>In Progress</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb', margin: '4px 0 0 0' }}>{inProgress}</p>
        </div>
        <div style={{ backgroundColor: '#fefce8', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#d97706', margin: 0 }}>Pending</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#d97706', margin: '4px 0 0 0' }}>{pending}</p>
        </div>
      </div>
    </div>
  );
}

const filterOptionStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 16px',
  border: 'none',
  backgroundColor: 'transparent',
  color: palette.primaryDark,
  fontSize: '14px',
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: `1px solid ${palette.surface}`,
  borderRadius: '6px',
  fontSize: '14px',
  backgroundColor: '#ffffff',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TasksPage() {
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isInserting, setInserting] = useState<boolean>(false);
  // Seed with last cached tasks so the UI paints instantly on mount / refresh.
  // The fetch in loadTasks() will replace this with fresh data from the backend.
  const [tasks, setTasks] = useState<TaskDTO[]>(
    () => getFromStorage<TaskDTO[]>(STORAGE_KEYS.TASKS) ?? []
  );
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [error, setError] = useState<any>();
  const [showFilter, setShowFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const filterRef = useRef<HTMLDivElement>(null);

  const [newName, setNewName] = useState('');
  const [newPjId, setNewPjId] = useState<number | ''>('');
  const [newUserId, setNewUserId] = useState<number | ''>('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newStoryPoints, setNewStoryPoints] = useState<string>('');

  // ─── Board mode ────────────────────────────────────────────────────────
  // When the route is /projects/:projectId/board, this same component
  // renders the project Backlog/Active/Completed board instead of the
  // global task list. Detected purely by URL param presence.
  const { projectId: projectIdParam } = useParams<{ projectId?: string }>();
  const isBoardMode = projectIdParam != null;
  const boardProjectId = isBoardMode ? Number(projectIdParam) : null;
  const boardCacheKey = boardProjectId != null
    ? `${STORAGE_KEYS.PROJECT_BOARD}_${boardProjectId}`
    : null;

  const [board, setBoard] = useState<BoardData>(() => {
    if (!boardCacheKey) return EMPTY_BOARD;
    return getFromStorage<BoardData>(boardCacheKey) ?? EMPTY_BOARD;
  });
  const [boardLoading, setBoardLoading] = useState(false);

  // Currently-open task detail modal. Null = no modal. Also carries which
  // column the card came from so the modal header can show that state.
  const [selectedTask, setSelectedTask] = useState<{
    task: TaskDTO;
    column: keyof BoardData;
  } | null>(null);

  // Close modal on Escape — keyboard accessibility nicety.
  useEffect(() => {
    if (!selectedTask) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedTask(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedTask]);

  useEffect(() => {
    if (!isBoardMode || boardProjectId == null) return;
    let cancelled = false;
    setBoardLoading(true);
    fetch(`/api/projects/${boardProjectId}/board`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: BoardData | null) => {
        if (cancelled || !data) return;
        const normalized: BoardData = {
          backlog:   data.backlog   ?? [],
          active:    data.active    ?? [],
          completed: data.completed ?? [],
        };
        setBoard(normalized);
        if (boardCacheKey) saveToStorage(boardCacheKey, normalized);
      })
      .catch(() => { /* keep cached board on failure */ })
      .finally(() => { if (!cancelled) setBoardLoading(false); });
    return () => { cancelled = true; };
  }, [isBoardMode, boardProjectId, boardCacheKey]);

  function sortTasks(list: TaskDTO[]): TaskDTO[] {
    if (sortBy === 'none') return list;
    const copy = [...list];
    const time = (d?: string | null) => (d ? new Date(d).getTime() : 0);
    copy.sort((a, b) => {
      switch (sortBy) {
        case 'endDateAsc':    return time(a.dateEndSetTask) - time(b.dateEndSetTask);
        case 'endDateDesc':   return time(b.dateEndSetTask) - time(a.dateEndSetTask);
        case 'startDateAsc':  return time(a.dateStartTask)  - time(b.dateStartTask);
        case 'startDateDesc': return time(b.dateStartTask)  - time(a.dateStartTask);
        default: return 0;
      }
    });
    return copy;
  }

  const sortedTasks = sortTasks(tasks);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to load tasks');
      const data: TaskDTO[] = await res.json();
      setTasks(data);
      saveToStorage(STORAGE_KEYS.TASKS, data); // refresh cache on every successful fetch
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects/open');
      if (!res.ok) return;
      const data: ProjectDTO[] = await res.json();
      setProjects(data);
      if (data.length > 0 && newPjId === '') setNewPjId(data[0].pjId);
    } catch { /* ignore */ }
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/users-tt');
      if (!res.ok) return;
      const data: UserDTO[] = await res.json();
      setUsers(data);
      if (data.length > 0 && newUserId === '') setNewUserId(data[0].userId);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadTasks();
    loadProjects();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteTask(taskId: number) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setTasks(prev => prev.filter(t => t.taskId !== taskId));
    } catch (e) {
      setError(e);
    }
  }

  async function toggleDone(task: TaskDTO, markDone: boolean) {
    const updated: TaskDTO = {
      ...task,
      dateEndRealTask: markDone ? todayISO() : null,
      dateStartTask: task.dateStartTask ?? (markDone ? todayISO() : null),
    };
    try {
      const res = await fetch(`/api/tasks/${task.taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Update failed');
      const saved: TaskDTO = await res.json();
      setTasks(prev => prev.map(t => (t.taskId === task.taskId ? saved : t)));
    } catch (e) {
      setError(e);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || newPjId === '' || newUserId === '') return;
    setInserting(true);
    const payload: Partial<TaskDTO> = {
      nameTask: newName.trim(),
      pjId: Number(newPjId),
      userId: Number(newUserId),
      priority: newPriority,
      storyPoints: newStoryPoints ? Number(newStoryPoints) : null,
      dateStartTask: todayISO(),
    };
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Create failed');
      setNewName('');
      setNewStoryPoints('');
      await loadTasks();
    } catch (err) {
      setError(err);
    } finally {
      setInserting(false);
    }
  }

  // ─── Board mode render — early return ─────────────────────────────────
  // Replaces the entire list/CRUD UI below with a 3-column board grouped
  // by lifecycle state. Each column scrolls independently so adding many
  // tasks to one column doesn't push the page vertically.
  if (isBoardMode) {
    return (
      <div style={{
        // Fill the parent <main> (which already handles overflow:auto).
        // height:100% lets the inner columns lock to a viewport-relative
        // size and scroll on their own.
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        boxSizing: 'border-box',
        background: '#f3f4f6',
      }}>
        {/* Page header — stays fixed above the column grid. */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            Project Backlog
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>
            {boardLoading ? 'Loading…' : 'Tasks grouped by lifecycle state.'}
          </p>
        </div>

        {/* Column grid — flex:1 + minHeight:0 is the trick that lets */}
        {/* children with overflow:auto actually scroll inside flexbox. */}
        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {BOARD_COLUMNS.map(({ key, label, accent }) => {
            const items = board[key];
            return (
              <div key={key} style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                {/* Column header — sticky inside its own column, accent bar */}
                {/* on the left for quick visual grouping. */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '14px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  borderLeft: `4px solid ${accent}`,
                }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>{label}</h2>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: accent,
                    borderRadius: '9999px',
                    padding: '2px 10px',
                    minWidth: '24px',
                    textAlign: 'center',
                  }}>{items.length}</span>
                </div>

                {/* Scrollable card list — overflow lives here so each */}
                {/* column scrolls independently of the page. */}
                <div style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '12px',
                }}>
                  {items.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      minHeight: '120px',
                      color: '#9ca3af',
                      fontSize: '13px',
                      fontStyle: 'italic',
                    }}>
                      No tasks
                    </div>
                  ) : (
                    items.map(t => (
                      <div key={t.taskId}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedTask({ task: t, column: key })}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedTask({ task: t, column: key });
                          }
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderLeft: `3px solid ${accent}`,
                          borderRadius: '10px',
                          padding: '12px 14px',
                          marginBottom: '10px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                        }}
                      >
                        <div style={{
                          fontWeight: 600,
                          color: '#111827',
                          fontSize: '14px',
                          marginBottom: '8px',
                          lineHeight: 1.35,
                        }}>
                          {t.nameTask}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <PriorityBadge priority={t.priority} />
                          <StoryPointsBadge points={t.storyPoints} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Task detail modal ─────────────────────────────────────── */}
        {selectedTask && (() => {
          const { task, column } = selectedTask;
          const accent =
            BOARD_COLUMNS.find(c => c.key === column)?.accent ?? '#6b7280';
          const columnLabel =
            BOARD_COLUMNS.find(c => c.key === column)?.label ?? column;
          // Lookup assignee name from the users list TasksPage already loads
          // on mount — falls back to the raw id if the user isn't cached yet.
          const assignee = users.find(u => u.userId === task.userId);
          const assigneeName = assignee ? assignee.nameUser : `User #${task.userId}`;
          const fmtDate = (iso?: string | null) =>
            iso ? new Date(iso).toLocaleDateString() : '—';

          return (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-modal-title"
              onClick={() => setSelectedTask(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                zIndex: 50,
              }}
            >
              {/* Stop click-through so clicking inside the card doesn't dismiss */}
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%',
                  maxWidth: '560px',
                  maxHeight: '90vh',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                  overflow: 'hidden',
                }}
              >
                {/* Accent strip header — same color as the column of origin */}
                <div style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid #e5e7eb',
                  borderTop: `4px solid ${accent}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: accent,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}>
                      {columnLabel}
                    </div>
                    <h2 id="task-modal-title" style={{
                      margin: 0,
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#111827',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}>
                      {task.nameTask || 'Untitled task'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    aria-label="Close"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '24px',
                      lineHeight: 1,
                      cursor: 'pointer',
                      color: '#6b7280',
                      padding: '4px 8px',
                      borderRadius: '6px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    ×
                  </button>
                </div>

                {/* Scrollable body so long descriptions don't blow up the modal */}
                <div style={{
                  padding: '20px 24px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}>
                  {/* Badges row */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PriorityBadge priority={task.priority} />
                    <StoryPointsBadge points={task.storyPoints} />
                  </div>

                  {/* Description */}
                  <div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#6b7280',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                    }}>Description</div>
                    <p style={{
                      margin: 0,
                      color: task.infoTask ? '#111827' : '#9ca3af',
                      fontSize: '14px',
                      lineHeight: 1.55,
                      fontStyle: task.infoTask ? 'normal' : 'italic',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {task.infoTask || 'No description provided.'}
                    </p>
                  </div>

                  {/* Meta grid — dates + assignee */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px 20px',
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Assignee</div>
                      <div style={{ fontSize: '14px', color: '#111827', marginTop: '2px' }}>{assigneeName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Task ID</div>
                      <div style={{ fontSize: '14px', color: '#111827', marginTop: '2px' }}>#{task.taskId}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Started</div>
                      <div style={{ fontSize: '14px', color: '#111827', marginTop: '2px' }}>{fmtDate(task.dateStartTask)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Due</div>
                      <div style={{ fontSize: '14px', color: '#111827', marginTop: '2px' }}>{fmtDate(task.dateEndSetTask)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Completed</div>
                      <div style={{ fontSize: '14px', color: '#111827', marginTop: '2px' }}>{fmtDate(task.dateEndRealTask)}</div>
                    </div>
                  </div>
                </div>

                {/* Footer with close action */}
                <div style={{
                  padding: '14px 24px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  background: '#f9fafb',
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    style={{
                      padding: '8px 18px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#374151',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="App">
      <h1>My Tasks</h1>
      <TaskProgressWidget tasks={tasks} />

      <form
        onSubmit={addTask}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          width: '95%',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <input
          style={{ ...inputStyle, flex: '2 1 200px' }}
          placeholder="New task"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <select
          style={{ ...inputStyle, flex: '1 1 140px' }}
          value={newPjId}
          onChange={e => setNewPjId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="" disabled>Project…</option>
          {projects.map(p => (
            <option key={p.pjId} value={p.pjId}>{p.namePj}</option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, flex: '1 1 140px' }}
          value={newUserId}
          onChange={e => setNewUserId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="" disabled>Assignee…</option>
          {users.map(u => (
            <option key={u.userId} value={u.userId}>{u.nameUser}</option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, flex: '0 1 110px' }}
          value={newPriority}
          onChange={e => setNewPriority(e.target.value as Priority)}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input
          style={{ ...inputStyle, flex: '0 1 80px' }}
          type="number"
          min={0}
          placeholder="SP"
          value={newStoryPoints}
          onChange={e => setNewStoryPoints(e.target.value)}
        />
        <Button
          type="submit"
          variant="contained"
          size="small"
          disabled={isInserting || !newName.trim() || newPjId === '' || newUserId === ''}
        >
          {isInserting ? 'Adding…' : 'Add'}
        </Button>

        <div ref={filterRef} style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => setShowFilter(!showFilter)}
            className="FilterButton"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 14px',
              border: `1px solid ${palette.surface}`,
              borderRadius: '0.25rem',
              backgroundColor: showFilter ? palette.bgLight : '#ffffff',
              color: palette.primary,
              fontWeight: 'bold',
              fontSize: 'max(11px, min(2vw, 14px))',
              cursor: 'pointer',
              whiteSpace: 'nowrap' as const,
            }}
          >
            <FunnelIcon style={{ height: '18px', width: '18px' }} />
            Filter
          </button>
          {showFilter && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '4px',
              backgroundColor: '#ffffff',
              border: `1px solid ${palette.surface}`,
              borderRadius: '0.5rem',
              boxShadow: '0 10px 25px -5px rgba(0, 77, 64, 0.18), 0 4px 10px rgba(0, 155, 119, 0.08)',
              zIndex: 10,
              minWidth: '200px',
              padding: '8px 0',
            }}>
              <button type="button"
                onClick={() => { setSortBy('endDateAsc'); setShowFilter(false); }}
                style={{ ...filterOptionStyle, fontWeight: sortBy === 'endDateAsc' ? 700 : 400 }}
              >End Date: Ascending</button>
              <button type="button"
                onClick={() => { setSortBy('endDateDesc'); setShowFilter(false); }}
                style={{ ...filterOptionStyle, fontWeight: sortBy === 'endDateDesc' ? 700 : 400 }}
              >End Date: Descending</button>
              <button type="button"
                onClick={() => { setSortBy('startDateAsc'); setShowFilter(false); }}
                style={{ ...filterOptionStyle, fontWeight: sortBy === 'startDateAsc' ? 700 : 400 }}
              >Start Date: Ascending</button>
              <button type="button"
                onClick={() => { setSortBy('startDateDesc'); setShowFilter(false); }}
                style={{ ...filterOptionStyle, fontWeight: sortBy === 'startDateDesc' ? 700 : 400 }}
              >Start Date: Descending</button>
              {sortBy !== 'none' && (
                <>
                  <div style={{ height: '1px', backgroundColor: palette.surface, margin: '6px 0' }} />
                  <button type="button"
                    onClick={() => { setSortBy('none'); setShowFilter(false); }}
                    style={{ ...filterOptionStyle, color: '#dc2626' }}
                  >Clear sort</button>
                </>
              )}
            </div>
          )}
        </div>
      </form>

      { error && <p style={{ color: '#dc2626' }}>Error: {String(error.message ?? error)}</p> }
      { isLoading && <CircularProgress /> }
      { !isLoading &&
        <div id="maincontent">
          <table id="itemlistNotDone" className="itemlist">
            <TableBody>
            {sortedTasks.map(task => (
              task.dateEndRealTask == null && (
                <tr key={task.taskId}>
                  <td className="description">{task.nameTask}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><StoryPointsBadge points={task.storyPoints} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}><PriorityBadge priority={task.priority} /></td>
                  <td className="date">
                    {task.dateStartTask && <Moment format="MMM Do YYYY">{task.dateStartTask}</Moment>}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleDone(task, true)}
                      title="Mark as completed"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <CheckCircleIcon style={{ height: '22px', width: '22px', color: palette.primary }} />
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => deleteTask(task.taskId)}
                      title="Delete task"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <TrashIcon style={{ height: '20px', width: '20px', color: '#dc2626' }} />
                    </button>
                  </td>
                </tr>
              )
            ))}
            </TableBody>
          </table>
          <h2 id="donelist">Completed</h2>
          <table id="itemlistDone" className="itemlist">
            <TableBody>
            {sortedTasks.map(task => (
              task.dateEndRealTask != null && (
                <tr key={task.taskId} style={{ opacity: 0.6 }}>
                  <td className="description" style={{ textDecoration: 'line-through' }}>{task.nameTask}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><StoryPointsBadge points={task.storyPoints} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}><PriorityBadge priority={task.priority} /></td>
                  <td className="date">
                    {task.dateEndRealTask && <Moment format="MMM Do YYYY">{task.dateEndRealTask}</Moment>}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleDone(task, false)}
                      title="Reactivate task"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <ArrowUturnLeftIcon style={{ height: '20px', width: '20px', color: '#d97706' }} />
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => deleteTask(task.taskId)}
                      title="Delete task"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <TrashIcon style={{ height: '20px', width: '20px', color: '#dc2626' }} />
                    </button>
                  </td>
                </tr>
              )
            ))}
            </TableBody>
          </table>
        </div>
      }
    </div>
  );
}
