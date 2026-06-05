import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CalendarIcon,
  CheckCircleIcon,
  InboxIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import { KpiCard } from '../Components/Team'; // shared visual primitive — promote to /Common if it spreads further
import {
  AddFeatureModal,
  AddTaskModal,
  DeveloperTaskBoard,
  FeatureDetailPanel,
  FeatureFilters,
  FeatureListItem,
} from '../Components/Sprint';
import type {
  DeveloperBoardKpis,
  DeveloperBoardMember,
  DeveloperBoardTask,
  FeatureDetailData,
  FilterKey,
  FilterValues,
  NewFeatureData,
  NewTaskData,
  PriorityTone,
  TaskBoardMode,
} from '../Components/Sprint';
import type { StatusTone } from '../Components/Sprint';
import TaskDetailModal from '../Components/Common/TaskDetailModal';
import type { TaskDetailData } from '../Components/Common/TaskDetailModal';
import ConfirmDeleteModal from '../Components/Common/ConfirmDeleteModal';
import PageLoading from '../Components/Common/PageLoading';
import ProgressBar from '../Components/Common/ProgressBar';
import Sparkline from '../Components/Common/Sparkline';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../Utils/storage';
import { toast } from '../Utils/toast';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — visual-only until the sprint endpoints are wired.
// All MOCK_* lives at the top so the swap to real hooks is mechanical.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ProjectDTO,
  SprintDTO,
  SprintTaskDTO,
  TaskDTO,
  FeatureDTO,
} from '../Utils/types';
import { mapTaskPriority, normalizeTaskState, formatDate } from '../Utils/helpers';
import { MOCK_SPRINT_BASE } from '../Utils/mockData';
import { SprintTaskJoined, ComputedKpis, computeSprintKpis, taskWeight } from '../Utils/kpiUtils';



interface SprintInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  totalTasks: number;
  kpis: {
    progress: number;
    carryRate: number;
    carriedFeatures: number;
    totalFeatures: number;
    taskDelay: number;
    delayedTasks: number;
    cycleTime: string;
  };
}

/** Backend priority → display label. */
function priorityLabel(p: string | null | undefined): string {
  if (!p) return 'Not set';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/** Backend priority → visual tone for the priority text + chip. */
function priorityToTone(p: string | null | undefined): PriorityTone {
  switch ((p ?? '').toLowerCase()) {
    case 'high':   return 'danger';
    case 'medium': return 'warning';
    case 'low':    return 'success';
    default:       return 'neutral';
  }
}

function displayTaskState(s: string | null | undefined): string {
  const state = normalizeTaskState(s);
  if (state === 'done') return 'Done';
  if (state === 'delayed') return 'Delayed';
  return 'Active';
}

/** Derive a status label + tone from task completion progress. */
function statusFromProgress(progress: number): { label: string; tone: StatusTone } {
  if (progress >= 100) return { label: 'Completed', tone: 'success' };
  if (progress > 0)    return { label: 'In Progress', tone: 'info' };
  return { label: 'Pending', tone: 'neutral' };
}





interface MockFeature {
  id: number;
  name: string;
  developer: string;
  storyPoints: number;
  completedTasks: number;
  totalTasks: number;
  statusLabel: string;
  statusTone: StatusTone;
  // Detail-only:
  description: string;
  priority: string;
  priorityTone: PriorityTone;
  progress: number;
}

type SprintContentView = 'features' | 'developers';

interface SprintUiPreferences {
  contentView: SprintContentView;
  developerTaskMode: TaskBoardMode;
  selectedFeatureId: number | null;
  selectedDeveloperKey: string | null;
  filters: FilterValues;
}

const sprintUiPrefsKey = (sid: number) => `${STORAGE_KEYS.CURRENT_SPRINT}_ui_${sid}`;

// Synthetic id for the "No Feature" grouping. Real feature ids are positive,
// so -1 never collides with a backend feature.
const NO_FEATURE_ID = -1;

// MockFeature stays as the page's internal display shape — the enrich step
// builds objects with this same structure so the existing list/detail
// components don't need any changes. The MOCK_FEATURES seed data was
// removed once /api/sprints/{sprId}/features started feeding live data.



// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SprintPage() {
  const { projectId: rawProjectId, sprintId: rawSprintId } = useParams<{
    projectId: string;
    sprintId: string;
  }>();
  const projectId = rawProjectId ? Number(rawProjectId) : undefined;
  const sprintId = rawSprintId ? Number(rawSprintId) : undefined;
  const navigate = useNavigate();

  // Resolve project name from the cached project list (filled by the sidebar).
  // When backend wiring lands this becomes a fetch keyed by projectId.
  const projectName = useMemo(() => {
    const projects = getFromStorage<ProjectDTO[]>(STORAGE_KEYS.PROJECTS) ?? [];
    const match = projectId != null
      ? projects.find(p => p.pjId === projectId)
      : undefined;
    return match?.namePj ?? projects[0]?.namePj ?? 'Project';
  }, [projectId]);

  // Real sprint detail from the backend — name + dates come from
  // /api/sprints/{sprintId}.
  const [sprintDto, setSprintDto] = useState<SprintDTO | null>(null);

  // Joined sprint-tasks (the workflow link rows + each task's full data).
  // Drives every KPI on this page — re-derived via useMemo so we don't
  // recompute unless the underlying list changes.
  const [sprintTasks, setSprintTasks] = useState<SprintTaskJoined[]>([]);

  // Real features for this sprint (replaces MOCK_FEATURES). Comes from
  // /api/sprints/{sprId}/features which reads FEATURE_TT.
  const [rawFeatures, setRawFeatures] = useState<FeatureDTO[]>([]);

  // Backend-calculated carryover rate for this sprint (from KPI retrabajo endpoint).
  // Used in place of local weighted formula to ensure consistency with backend.
  const [sprintCarryoverRate, setSprintCarryoverRate] = useState<number | null>(null);

  // userId → display name lookup, for "developer" badge on each feature.
  // Built from /api/users-tt — small payload, fetched once on mount.
  const [usersById, setUsersById] = useState<Map<number, string>>(new Map());
  const [sprintDataLoading, setSprintDataLoading] = useState(
    sprintId != null && sprintId >= 0
  );
  const [usersLoading, setUsersLoading] = useState(true);
  const [contentView, setContentView] = useState<SprintContentView>('features');

  // Add-Task modal — open state + a bump counter used as a useEffect dep so
  // creating/editing a task forces a re-fetch of the sprint's task list
  // without duplicating the whole load logic.
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskRefreshToken, setTaskRefreshToken] = useState(0);
  // When non-null, the AddTaskModal opens in edit mode preloaded with this
  // task's values. Mutually exclusive with showAddTaskModal in practice.
  const [taskToEdit, setTaskToEdit] = useState<SprintTaskJoined | null>(null);

  // Add-Feature modal — same refresh pattern as tasks, but tied to features
  // (they're loaded on the same effect, so we can reuse taskRefreshToken).
  const [showAddFeatureModal, setShowAddFeatureModal] = useState(false);
  // When non-null, AddFeatureModal opens in edit mode with this feature's
  // values. Mutually exclusive with showAddFeatureModal in practice.
  const [featureToEdit, setFeatureToEdit] = useState<FeatureDTO | null>(null);

  // Delete confirmation state — at most one of these is non-null at a time.
  // Holds the raw entity so the confirm message can render its name.
  const [taskToDelete, setTaskToDelete] = useState<SprintTaskJoined | null>(null);
  const [featureToDelete, setFeatureToDelete] = useState<FeatureDTO | null>(null);

  // autoCloseSprints setting for the current project — if false, show manual
  // "Finalize Sprint" button on active sprints.
  const [autoCloseSprints, setAutoCloseSprints] = useState<boolean>(true); // optimistic default hides button until fetched
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endingsprint, setEndingSprint] = useState(false);

  useEffect(() => {
    if (sprintId == null || sprintId < 0) {
      setSprintDto(null);
      setSprintTasks([]);
      setRawFeatures([]);
      setSprintDataLoading(false);
      return;
    }

    setSprintDataLoading(true);
    let cancelled = false;

    // Sprint header fetch (separate so the title + dates show ASAP, even
    // if the heavier KPI fetch is still pending).
    const sprintRequest = fetch(`/api/sprints/${sprintId}`)
      .then(res => (res.ok ? res.json() : null))
      .then((data: SprintDTO | null) => {
        if (cancelled) return;
        setSprintDto(data);
      })
      .catch(() => {});

    // Features for this sprint (real data, replaces MOCK_FEATURES).
    // Endpoint lives on FeatureTTController which is the canonical owner.
    const featuresRequest = fetch(`/api/features/sprint/${sprintId}`)
      .then(res => (res.ok ? res.json() : []))
      .then((data: FeatureDTO[]) => {
        if (cancelled) return;
        setRawFeatures(data);
      })
      .catch(() => {});

    // KPI data: link rows for this sprint + the full task list, joined by taskId.
    // Two requests instead of N (one per task) — Map lookup makes the join O(N).
    const tasksRequest = Promise.all([
      fetch(`/api/sprint-tasks/sprint/${sprintId}`).then(r => (r.ok ? r.json() : [])),
      fetch('/api/tasks').then(r => (r.ok ? r.json() : [])),
    ])
      .then(([links, allTasks]: [SprintTaskDTO[], TaskDTO[]]) => {
        if (cancelled) return;
        const taskMap = new Map(allTasks.map(t => [t.taskId, t]));
        const joined: SprintTaskJoined[] = links
          .map(link => {
            const task = taskMap.get(link.taskId);
            return task ? { ...task, stateTask: link.stateTask } : null;
          })
          .filter((t): t is SprintTaskJoined => t !== null);
        setSprintTasks(joined);
      })
      .catch(() => {
        /* Leave KPIs empty on failure — page falls back to ZERO_KPIS via memo. */
      });

    // Fetch backend KPI data (retrabajo) to get authoritative carryover_rate for this sprint.
    const kpisRequest = (sprintDto?.pjId ?? projectId)
      ? fetch(`/api/projects/${sprintDto?.pjId ?? projectId}/kpis/retrabajo`)
          .then(r => (r.ok ? r.json() : []))
          .then((data: Array<{ sprint: string; carryover_rate: number }>) => {
            if (cancelled) return;
            // Find the metrics for the current sprint
            const sprintData = data.find(s => s.sprint === sprintDto?.nameSprint);
            setSprintCarryoverRate(sprintData?.carryover_rate ?? null);
          })
          .catch(() => {
            setSprintCarryoverRate(null);
          })
      : Promise.resolve();

    Promise.allSettled([sprintRequest, featuresRequest, tasksRequest, kpisRequest]).finally(() => {
      if (!cancelled) setSprintDataLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [sprintId, taskRefreshToken, projectId, sprintDto?.nameSprint, sprintDto?.pjId]);

  // Fetch project autoCloseSprints so we know whether to show the manual
  // "Finalize Sprint" button. Runs whenever the sprint's pjId is known.
  useEffect(() => {
    const pid = sprintDto?.pjId ?? projectId;
    if (pid == null || pid < 0) return;
    let cancelled = false;
    fetch(`/api/projects/${pid}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: ProjectDTO | null) => {
        if (cancelled || !data) return;
        setAutoCloseSprints(data.autoCloseSprints ?? false);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sprintDto?.pjId, projectId]);

  // Handler for the "Finalize Sprint" button
  const handleEndSprint = useCallback(async () => {
    if (!sprintId) return;
    setEndingSprint(true);
    try {
      const res = await fetch(`/api/sprints/${sprintId}/end`, { method: 'PATCH' });
      if (!res.ok && res.status !== 204) {
        toast('Failed to finalize sprint', 'error');
        return;
      }
      // If a next sprint was activated, navigate there; otherwise go to project
      if (res.status === 200) {
        const next = await res.json() as { sprId: number };
        toast('Sprint closed — next sprint activated');
        navigate(`/projects/${projectId}/sprints/${next.sprId}`);
      } else {
        toast('Sprint closed — no next sprint found');
        navigate(`/projects/${projectId}`);
      }
    } catch {
      toast('Failed to finalize sprint', 'error');
    } finally {
      setEndingSprint(false);
      setShowEndConfirm(false);
    }
  }, [sprintId, projectId, navigate]);

  // One-time fetch of all users for the developer-name lookup. Lives across
  // sprint navigations (deps: []) — same map serves every feature row.
  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    fetch('/api/users-tt')
      .then(r => (r.ok ? r.json() : []))
      .then((data: Array<{ userId: number; nameUser: string }>) => {
        if (cancelled) return;
        setUsersById(new Map(data.map(u => [u.userId, u.nameUser])));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isPageLoading =
    sprintId != null
    && sprintId >= 0
    && (sprintDataLoading || usersLoading);

  // KPIs are computed from tasks, but carryRate is replaced with backend value
  // to ensure accuracy (backend uses task count, not weighted points).
  const computedKpis = useMemo(() => {
    const kpis = computeSprintKpis(sprintTasks);
    const delayedCount = sprintTasks.filter(
      t => normalizeTaskState(t.stateTask) === 'delayed'
    ).length;
    // Override carryRate with the backend-calculated value if available
    if (sprintCarryoverRate !== null) {
      kpis.carryRate = Math.round(sprintCarryoverRate);
      kpis.carriedFeatures = Math.round(
        (sprintCarryoverRate / 100) * sprintTasks.length
      );
    }
    if (sprintTasks.length > 0) {
      kpis.taskDelay = Math.round((delayedCount / sprintTasks.length) * 100);
      kpis.delayedTasks = delayedCount;
    } else {
      kpis.taskDelay = 0;
      kpis.delayedTasks = 0;
    }
    return kpis;
  }, [sprintTasks, sprintCarryoverRate]);

  // Enrich each backend Feature with stats computed from this sprint's tasks:
  // total/done counts, summed story points, the assigned developer (if all
  // tasks share an owner), and a derived status label.
  const displayFeatures = useMemo<MockFeature[]>(() => {
    return rawFeatures.map(f => {
      const tasksOfFeature = sprintTasks.filter(t => t.featureId === f.featureId);
      const total = tasksOfFeature.length;
      const completed = tasksOfFeature.filter(t => t.stateTask === 'done').length;
      const sps = tasksOfFeature.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
      const totalW     = tasksOfFeature.reduce((sum, t) => sum + taskWeight(t), 0);
      const completedW = tasksOfFeature.filter(t => t.stateTask === 'done').reduce((sum, t) => sum + taskWeight(t), 0);
      const progress = totalW === 0 ? 0 : Math.round((completedW / totalW) * 100);
      const status = statusFromProgress(progress);

      // Developer attribution: pick the most common owner. If multiple,
      // append "+N" to flag that more than one person works on this feature.
      const ownerIds = Array.from(
        new Set(tasksOfFeature.map(t => t.userId).filter((u): u is number => u != null))
      );
      const firstOwner = ownerIds.length > 0
        ? usersById.get(ownerIds[0]) ?? `User #${ownerIds[0]}`
        : 'Unassigned';
      const developer = ownerIds.length > 1
        ? `${firstOwner} +${ownerIds.length - 1}`
        : firstOwner;

      return {
        id: f.featureId,
        name: f.nameFeature,
        developer,
        storyPoints: sps,
        completedTasks: completed,
        totalTasks: total,
        statusLabel: status.label,
        statusTone:  status.tone,
        description: f.descriptionFeature?.trim() || 'No description available.',
        priority:     priorityLabel(f.priorityFeature),
        priorityTone: priorityToTone(f.priorityFeature),
        progress,
      };
    });
  }, [rawFeatures, sprintTasks, usersById]);

  // Synthetic "No Feature" group — collects the sprint's tasks that aren't
  // linked to any feature. null when every task has a feature, so we never
  // render an empty bucket. Kept separate from displayFeatures so it doesn't
  // pollute the feature filters.
  const unassignedGroup = useMemo<MockFeature | null>(() => {
    const looseTasks = sprintTasks.filter(t => t.featureId == null);
    if (looseTasks.length === 0) return null;

    const total = looseTasks.length;
    const completed = looseTasks.filter(t => t.stateTask === 'done').length;
    const sps = looseTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
    const totalW     = looseTasks.reduce((sum, t) => sum + taskWeight(t), 0);
    const completedW = looseTasks.filter(t => t.stateTask === 'done').reduce((sum, t) => sum + taskWeight(t), 0);
    const progress = totalW === 0 ? 0 : Math.round((completedW / totalW) * 100);
    const status = statusFromProgress(progress);

    return {
      id: NO_FEATURE_ID,
      name: 'No Feature',
      developer: '—',
      storyPoints: sps,
      completedTasks: completed,
      totalTasks: total,
      statusLabel: status.label,
      statusTone:  status.tone,
      description: 'Tasks not assigned to any feature.',
      priority:     '—',
      priorityTone: 'neutral',
      progress,
    };
  }, [sprintTasks]);

  // Merge real backend data over the mock base. The page still renders
  // sensibly while fetches are pending or if they fail.
  const sprint: SprintInfo = useMemo(
    () => ({
      id: sprintDto?.sprId ?? sprintId ?? 0,
      name:
        sprintDto?.nameSprint
        ?? (sprintId != null ? `Sprint ${sprintId}` : 'Sprint'),
      startDate: sprintDto
        ? formatDate(sprintDto.dateStartSpr)
        : MOCK_SPRINT_BASE.startDate,
      endDate: sprintDto
        ? formatDate(sprintDto.dateEndSpr)
        : MOCK_SPRINT_BASE.endDate,
      totalTasks: computedKpis.totalTasks,
      kpis: computedKpis,
    }),
    [sprintDto, sprintId, computedKpis]
  );

  // Filter state — visual-only filters wired so the dropdowns "feel" alive.
  const [filters, setFilters] = useState<FilterValues>({});
  const handleFilterChange = (key: FilterKey, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value || undefined }));

  // Derive filter options from the live feature list — empty until the
  // fetch resolves, so the dropdowns "fill in" as data arrives.
  const filterOptions = useMemo(() => {
    const developers = Array.from(new Set(displayFeatures.map(f => f.developer)));
    const statuses   = Array.from(new Set(displayFeatures.map(f => f.statusLabel)));
    const priorities = Array.from(new Set(displayFeatures.map(f => f.priority)));
    const sps        = Array.from(new Set(displayFeatures.map(f => String(f.storyPoints))));
    return {
      developers:  developers.map(d => ({ value: d, label: d })),
      statuses:    statuses.map(s => ({ value: s, label: s })),
      priorities:  priorities.map(p => ({ value: p, label: p })),
      storyPoints: sps.map(s => ({ value: s, label: `${s} SPs` })),
    };
  }, [displayFeatures]);

  // Apply filters over the live features.
  const visibleFeatures = useMemo(
    () =>
      displayFeatures.filter(f => {
        if (filters.developer && f.developer !== filters.developer) return false;
        if (filters.status && f.statusLabel !== filters.status) return false;
        if (filters.priority && f.priority !== filters.priority) return false;
        if (filters.sp && String(f.storyPoints) !== filters.sp) return false;
        return true;
      }),
    [displayFeatures, filters]
  );

  // Selection is nullable so we can render an empty state when no features.
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null);
  const [selectedDeveloperKey, setSelectedDeveloperKey] = useState<string | null>(null);
  const [developerTaskMode, setDeveloperTaskMode] = useState<TaskBoardMode>('list');

  const [selectedTaskForModal, setSelectedTaskForModal] = useState<TaskDetailData | null>(null);

  // Load persisted UI selections for this sprint (view mode, filters, etc.).
  // If nothing was saved yet, fall back to sensible defaults.
  useEffect(() => {
    setSelectedTaskForModal(null);

    if (sprintId == null || sprintId < 0) {
      setContentView('features');
      setDeveloperTaskMode('list');
      setSelectedFeatureId(null);
      setSelectedDeveloperKey(null);
      setFilters({});
      return;
    }

    const prefs = getFromStorage<SprintUiPreferences>(sprintUiPrefsKey(sprintId));
    setContentView(prefs?.contentView === 'developers' ? 'developers' : 'features');
    setDeveloperTaskMode(prefs?.developerTaskMode === 'kanban' ? 'kanban' : 'list');
    setSelectedFeatureId(typeof prefs?.selectedFeatureId === 'number' ? prefs.selectedFeatureId : null);
    setSelectedDeveloperKey(typeof prefs?.selectedDeveloperKey === 'string' ? prefs.selectedDeveloperKey : null);
    setFilters(prefs?.filters ?? {});
  }, [sprintId]);

  // Persist all interactive selections per sprint so users can leave and
  // return without losing their preferred view/mode/filter state.
  useEffect(() => {
    if (sprintId == null || sprintId < 0) return;

    const prefs: SprintUiPreferences = {
      contentView,
      developerTaskMode,
      selectedFeatureId,
      selectedDeveloperKey,
      filters,
    };
    saveToStorage(sprintUiPrefsKey(sprintId), prefs);
  }, [
    sprintId,
    contentView,
    developerTaskMode,
    selectedFeatureId,
    selectedDeveloperKey,
    filters,
  ]);

  const developerBuckets = useMemo(() => {
    const grouped = new Map<string, SprintTaskJoined[]>();
    sprintTasks.forEach(task => {
      const key = task.userId != null ? String(task.userId) : 'unassigned';
      const existing = grouped.get(key) ?? [];
      existing.push(task);
      grouped.set(key, existing);
    });

    const rows: Array<DeveloperBoardMember & { tasks: SprintTaskJoined[] }> =
      Array.from(grouped.entries()).map(([key, tasks]) => {
        const name = key === 'unassigned'
          ? 'Unassigned'
          : usersById.get(Number(key)) ?? `User #${key}`;
        const subtitle = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`;
        return { key, name, subtitle, tasks };
      });

    return rows.sort((a, b) => {
      if (a.key === 'unassigned') return 1;
      if (b.key === 'unassigned') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [sprintTasks, usersById]);

  useEffect(() => {
    if (developerBuckets.length === 0) {
      setSelectedDeveloperKey(null);
      return;
    }
    const exists = selectedDeveloperKey
      ? developerBuckets.some(d => d.key === selectedDeveloperKey)
      : false;
    if (!exists) setSelectedDeveloperKey(developerBuckets[0].key);
  }, [developerBuckets, selectedDeveloperKey]);

  const selectedDeveloper =
    developerBuckets.find(d => d.key === selectedDeveloperKey) ?? null;

  const selectedDeveloperKpis = useMemo<DeveloperBoardKpis>(() => {
    if (!selectedDeveloper) {
      return {
        tasksCompleted: 0,
        cycleTime: '—',
        assignedTasks: 0,
        totalStoryPoints: 0,
        progress: '—',
      };
    }

    const tasks = selectedDeveloper.tasks;
    if (tasks.length === 0) {
      return {
        tasksCompleted: 0,
        cycleTime: '—',
        assignedTasks: 0,
        totalStoryPoints: 0,
        progress: '—',
      };
    }

    const completed = tasks.filter(t => normalizeTaskState(t.stateTask) === 'done');
    const withDates = completed.filter(t => t.dateStartTask && t.dateEndRealTask);
    const dayMs = 1000 * 60 * 60 * 24;
    const avgCycleDays = withDates.length === 0
      ? 0
      : withDates.reduce((sum, t) => {
          const start = new Date(t.dateStartTask!).getTime();
          const end = new Date(t.dateEndRealTask!).getTime();
          return sum + Math.max(0, (end - start) / dayMs);
        }, 0) / withDates.length;

    return {
      tasksCompleted: completed.length,
      cycleTime: `${avgCycleDays.toFixed(1)} days`,
      assignedTasks: tasks.length,
      totalStoryPoints: tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0),
      progress: `${Math.round((completed.length / tasks.length) * 100)}%`,
    };
  }, [selectedDeveloper]);

  const featureNameById = useMemo(
    () => new Map(rawFeatures.map(f => [f.featureId, f.nameFeature])),
    [rawFeatures]
  );

  const selectedDeveloperTasks = useMemo<DeveloperBoardTask[]>(() => {
    if (!selectedDeveloper) return [];

    return selectedDeveloper.tasks
      .map(task => ({
        id: task.taskId,
        name: task.nameTask ?? `Task #${task.taskId}`,
        featureName: task.featureId != null ? featureNameById.get(task.featureId) : undefined,
        storyPoints: task.storyPoints,
        priority: mapTaskPriority(task.priority),
        state: normalizeTaskState(task.stateTask),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedDeveloper, featureNameById]);

  // Keep selection valid as the list changes — auto-pick first visible
  // when current selection drops out of the filtered set.
  // Resolve the selected entry. When the "No Feature" group is selected we
  // return it directly; otherwise fall back through real features.
  const selectedFeature: MockFeature | null =
    selectedFeatureId === NO_FEATURE_ID && unassignedGroup
      ? unassignedGroup
      : visibleFeatures.find(f => f.id === selectedFeatureId)
        ?? visibleFeatures[0]
        ?? unassignedGroup
        ?? null;

  // Build the panel payload only when there's actually a selected feature.
  // Tasks list comes straight from the joined sprintTasks filtered by feature.
  const detail: FeatureDetailData | null = selectedFeature
    ? {
        id:             selectedFeature.id,
        name:           selectedFeature.name,
        description:    selectedFeature.description,
        developer:      selectedFeature.developer,
        storyPoints:    selectedFeature.storyPoints,
        priority:       selectedFeature.priority,
        priorityTone:   selectedFeature.priorityTone,
        progress:       selectedFeature.progress,
        completedTasks: selectedFeature.completedTasks,
        totalTasks:     selectedFeature.totalTasks,
        tasks: sprintTasks
          // "No Feature" group → tasks with no featureId; otherwise match the id.
          .filter(t => selectedFeature.id === NO_FEATURE_ID
            ? t.featureId == null
            : t.featureId === selectedFeature.id)
          .map(t => ({
            id: t.taskId,
            name: t.nameTask ?? `Task #${t.taskId}`,
            description: t.infoTask,
            storyPoints: t.storyPoints,
            priority: mapTaskPriority(t.priority),
            state: normalizeTaskState(t.stateTask),
          })),
      }
    : null;

  const handleTaskClick = (taskId: number) => {
    const taskDTO = sprintTasks.find(t => t.taskId === taskId);
    if (!taskDTO) return;

    const devName = taskDTO.userId ? (usersById.get(taskDTO.userId) ?? 'Unassigned') : 'Unassigned';

    setSelectedTaskForModal({
      id: taskDTO.taskId,
      name: taskDTO.nameTask ?? `Task #${taskDTO.taskId}`,
      description: taskDTO.infoTask ?? null,
      storyPoints: taskDTO.storyPoints ?? null,
      priority: mapTaskPriority(taskDTO.priority),
      developerName: devName,
      state: displayTaskState(taskDTO.stateTask),
      dateStartTask: taskDTO.dateStartTask,
      dateEndSetTask: taskDTO.dateEndSetTask,
      dateEndRealTask: taskDTO.dateEndRealTask,
    });
  };

  /**
   * Handles both create and edit submissions from AddTaskModal.
   *
   * Create flow:  POST /api/tasks  →  POST /api/sprint-tasks (link to sprint)
   * Edit flow:    PUT  /api/tasks/{id}  (sprint link stays the same)
   *
   * Throws on failure so the modal can show the error and keep the form open.
   * Bumps taskRefreshToken on success to trigger the sprint reload effect.
   */
  const handleSubmitTask = async (data: NewTaskData): Promise<void> => {
    if (projectId == null || sprintId == null) {
      throw new Error('Missing projectId or sprintId');
    }

    // ── EDIT ──────────────────────────────────────────────────────────
    if (taskToEdit) {
      // PUT body must include the full TaskTT shape since updateTask sets
      // every field from the request body. We preserve fields the modal
      // doesn't touch (dateStartTask, dateEndRealTask, featureId).
      const putBody = {
        taskId:          taskToEdit.taskId,
        nameTask:        data.nameTask,
        infoTask:        data.infoTask ?? null,
        priority:        data.priority,
        storyPoints:     data.storyPoints ?? null,
        userId:          data.userId,
        pjId:            projectId,
        dateStartTask:   taskToEdit.dateStartTask,
        // Due date is always the sprint's end date — the modal no longer
        // asks for it, so we keep every task aligned to its sprint window.
        dateEndSetTask:  sprintDto?.dateEndSpr ?? null,
        dateEndRealTask: taskToEdit.dateEndRealTask,
        featureId:       data.featureId ?? null,
      };
      const putRes = await fetch(`/api/tasks/${taskToEdit.taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody),
      });
      if (!putRes.ok) {
        throw new Error(`PUT /api/tasks/${taskToEdit.taskId} → ${putRes.status}`);
      }
      setTaskRefreshToken(t => t + 1);
      return;
    }

    // ── CREATE ────────────────────────────────────────────────────────
    // 1) Create the task.
    const todayIso = new Date().toISOString().slice(0, 10);
    const createBody = {
      nameTask:       data.nameTask,
      infoTask:       data.infoTask ?? null,
      priority:       data.priority,
      storyPoints:    data.storyPoints ?? null,
      userId:         data.userId,
      pjId:           projectId,
      dateStartTask:  todayIso,
      // Due date is auto-assigned from the sprint's end date instead of
      // being asked in the modal.
      dateEndSetTask: sprintDto?.dateEndSpr ?? null,
      featureId:      data.featureId ?? null,
    };
    const createRes = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    });
    if (!createRes.ok) {
      throw new Error(`POST /api/tasks → ${createRes.status}`);
    }

    // The controller returns the saved entity in the response body. We
    // previously read the `Location` header but post-refactor it became a
    // full URI ("http://.../api/tasks/123") which Number() can't parse, so
    // reading the body is both simpler and more robust.
    const created = await createRes.json().catch(() => null);
    const newTaskId = created && typeof created.taskId === 'number' ? created.taskId : NaN;
    if (!Number.isFinite(newTaskId) || newTaskId <= 0) {
      throw new Error('Backend did not return a usable taskId in the response body');
    }

    // 2) Link the new task to this sprint. The backend defaults stateTask
    // to 'active' when not provided.
    const linkUrl = `/api/sprint-tasks?sprId=${sprintId}&taskId=${newTaskId}`;
    const linkRes = await fetch(linkUrl, { method: 'POST' });
    if (!linkRes.ok) {
      throw new Error(`POST /api/sprint-tasks → ${linkRes.status}`);
    }

    setTaskRefreshToken(t => t + 1);
  };

  /**
   * Triggered by clicking "Edit" inside TaskDetailModal. Looks up the raw
   * DTO from the joined sprint tasks (TaskDetailData is a view-model that
   * doesn't carry every backend field), then swaps modals.
   */
  const handleStartEdit = () => {
    if (!selectedTaskForModal) return;
    const raw = sprintTasks.find(t => t.taskId === selectedTaskForModal.id);
    if (!raw) return;
    setTaskToEdit(raw);
    setSelectedTaskForModal(null);
  };

  /**
   * Creates a feature inside the current sprint. Features can be empty —
   * tasks reference them later via TASK_TT.feature_id. Bumps the refresh
   * token so the features list reloads.
   */
  /**
   * Handles both create and edit submissions from AddFeatureModal.
   *
   * Create: POST /api/features
   * Edit:   PUT  /api/features/{id}  (sprint link preserved)
   */
  const handleSubmitFeature = async (data: NewFeatureData): Promise<void> => {
    if (sprintId == null) throw new Error('Missing sprintId');

    // ── EDIT ──────────────────────────────────────────────────────────
    if (featureToEdit) {
      const putBody = {
        featureId:          featureToEdit.featureId,
        nameFeature:        data.nameFeature,
        priorityFeature:    data.priorityFeature,
        descriptionFeature: data.descriptionFeature ?? null,
        sprId:              featureToEdit.sprId,
      };
      const res = await fetch(`/api/features/${featureToEdit.featureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody),
      });
      if (!res.ok) {
        throw new Error(`PUT /api/features/${featureToEdit.featureId} → ${res.status}`);
      }
      setTaskRefreshToken(t => t + 1);
      return;
    }

    // ── CREATE ────────────────────────────────────────────────────────
    const body = {
      nameFeature:        data.nameFeature,
      priorityFeature:    data.priorityFeature,
      descriptionFeature: data.descriptionFeature ?? null,
      sprId:              sprintId,
    };
    const res = await fetch('/api/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`POST /api/features → ${res.status}`);
    }
    setTaskRefreshToken(t => t + 1);
  };

  /**
   * Triggered by the "Edit Feature" button inside FeatureDetailPanel.
   * Captures the raw FeatureDTO so the modal can prefill its fields.
   */
  const handleStartEditFeature = (featureId: number) => {
    const raw = rawFeatures.find(f => f.featureId === featureId);
    if (!raw) return;
    setFeatureToEdit(raw);
  };

  /**
   * Triggered when the user clicks "Delete" in the TaskDetailModal. Captures
   * the raw task DTO so the confirmation modal can show the task name.
   */
  const handleAskDeleteTask = () => {
    if (!selectedTaskForModal) return;
    const raw = sprintTasks.find(t => t.taskId === selectedTaskForModal.id);
    if (!raw) return;
    setTaskToDelete(raw);
    setSelectedTaskForModal(null);
  };

  /**
   * Performs the actual DELETE for a task. The ON DELETE CASCADE on
   * SPRINT_TASK_TT removes the link row automatically.
   */
  const handleConfirmDeleteTask = async (): Promise<void> => {
    if (!taskToDelete) return;
    const res = await fetch(`/api/tasks/${taskToDelete.taskId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`DELETE /api/tasks/${taskToDelete.taskId} → ${res.status}`);
    }
    setTaskToDelete(null);
    setTaskRefreshToken(t => t + 1);
  };

  /**
   * Triggered by the "Delete Feature" button inside FeatureDetailPanel.
   * Captures the FeatureDTO from rawFeatures by id.
   */
  const handleAskDeleteFeature = (featureId: number) => {
    const raw = rawFeatures.find(f => f.featureId === featureId);
    if (!raw) return;
    setFeatureToDelete(raw);
  };

  /**
   * Performs the actual DELETE for a feature. ON DELETE SET NULL on
   * TASK_TT.feature_id means tasks are preserved but lose their grouping.
   */
  const handleConfirmDeleteFeature = async (): Promise<void> => {
    if (!featureToDelete) return;
    const res = await fetch(`/api/features/${featureToDelete.featureId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`DELETE /api/features/${featureToDelete.featureId} → ${res.status}`);
    }
    // Drop selection if it pointed at the feature we just removed so the
    // detail panel doesn't try to render a ghost.
    if (selectedFeatureId === featureToDelete.featureId) {
      setSelectedFeatureId(null);
    }
    setFeatureToDelete(null);
    setTaskRefreshToken(t => t + 1);
  };

  return (
    <div className="app-page-bg min-h-full px-6 py-8">
      <TaskDetailModal
        isOpen={selectedTaskForModal !== null}
        onClose={() => setSelectedTaskForModal(null)}
        task={selectedTaskForModal}
        onEdit={handleStartEdit}
        onDelete={handleAskDeleteTask}
      />

      <ConfirmDeleteModal
        isOpen={taskToDelete !== null}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDeleteTask}
        title="Delete Task"
        message="This will permanently delete the task and remove it from its sprint."
        itemName={taskToDelete?.nameTask ?? undefined}
      />

      <ConfirmDeleteModal
        isOpen={featureToDelete !== null}
        onClose={() => setFeatureToDelete(null)}
        onConfirm={handleConfirmDeleteFeature}
        title="Delete Feature"
        message="This will permanently delete the feature. Tasks in this feature will be kept but lose their feature label."
        itemName={featureToDelete?.nameFeature ?? undefined}
      />

      {projectId != null && (
        <AddTaskModal
          isOpen={showAddTaskModal || taskToEdit !== null}
          onClose={() => {
            setShowAddTaskModal(false);
            setTaskToEdit(null);
          }}
          projectId={projectId}
          usersById={usersById}
          features={rawFeatures.map(f => ({
            featureId: f.featureId,
            nameFeature: f.nameFeature,
          }))}
          onCreate={handleSubmitTask}
          initialTask={taskToEdit}
        />
      )}

      <AddFeatureModal
        isOpen={showAddFeatureModal || featureToEdit !== null}
        onClose={() => {
          setShowAddFeatureModal(false);
          setFeatureToEdit(null);
        }}
        onCreate={handleSubmitFeature}
        initialFeature={featureToEdit}
      />

      {isPageLoading ? (
        <div className="container-main">
          <PageLoading
            title="Loading sprint..."
            subtitle="Fetching sprint data, tasks, features, and assignments for the full view."
          />
        </div>
      ) : (
      <div className="container-main space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="heading-h2">
              {projectName} - {sprint.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 mt-2">
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                {sprint.startDate} - {sprint.endDate}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                {sprint.totalTasks} total tasks
              </span>
            </div>
          </div>

          {/* "Finalize Sprint" — visible only when sprint is active, has started, and autoCloseSprints=false */}
          {sprintDto?.stateSprint === 'active'
            && !autoCloseSprints
            && sprintDto.dateStartSpr != null
            && new Date(sprintDto.dateStartSpr) <= new Date()
            && (
            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
            >
              <StopIcon className="h-4 w-4" />
              Finalize Sprint
            </button>
          )}
        </header>

        {/* Finalize Sprint — confirm dialog */}
        {showEndConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="modal-card w-full max-w-sm p-8">
              <h2 className="heading-h4 before:hidden mb-3">Finalize Sprint</h2>
              <p className="mt-3 text-sm text-gray-500">
                Are you sure you want to finalize <span className="font-semibold text-gray-700">{sprint.name}</span>?
                The next sprint will be activated automatically.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  disabled={endingsprint}
                  className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEndSprint}
                  disabled={endingsprint}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {endingsprint ? 'Finalizing…' : 'Yes, finalize'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sprint KPIs */}
        <section
          aria-labelledby="sprint-kpis-heading"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <h2 id="sprint-kpis-heading" className="sr-only">
            Sprint KPIs
          </h2>

          <KpiCard
            label="Sprint Progress"
            value={`${sprint.kpis.progress}%`}
            tone="success"
          >
            <ProgressBar value={sprint.kpis.progress} />
          </KpiCard>

          <KpiCard
            label="Carryover Rate"
            value={`${sprint.kpis.carryRate}%`}
            tone="warning"
          >
            <p className="text-xs text-gray-500">
              {sprint.kpis.carriedFeatures} {sprint.kpis.carriedFeatures === 1 ? 'task' : 'tasks'} carried over out of {sprint.kpis.totalFeatures} tasks
            </p>
          </KpiCard>

          <KpiCard
            label="Task Delay"
            value={`${sprint.kpis.taskDelay}%`}
            tone="danger"
          >
            <p className="text-xs text-gray-500">
              {sprint.kpis.delayedTasks} delayed {sprint.kpis.delayedTasks === 1 ? 'task' : 'tasks'}
            </p>
          </KpiCard>

          <KpiCard
            label="Cycle Time"
            value={sprint.kpis.cycleTime}
            tone="info"
          >
            <Sparkline />
          </KpiCard>

        </section>

        {/* Features section */}
        <section
          aria-labelledby="features-heading"
          className="section-card space-y-5"
        >
          <h2
            id="features-heading"
            className="heading-h4"
          >
            Sprint Status
          </h2>

          {/* Toggle + (Task View only) Add Task button. Wrapped in a flex */}
          {/* so the action sits on the right side of the same row. */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setContentView('features')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  contentView === 'features'
                    ? 'bg-brand text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Feature View
              </button>
              <button
                type="button"
                onClick={() => setContentView('developers')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  contentView === 'developers'
                    ? 'bg-brand text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Task View
              </button>
            </div>

            {contentView === 'developers' && projectId != null && (
              <button
                type="button"
                onClick={() => setShowAddTaskModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                           text-white bg-brand hover:bg-brand-dark rounded-lg shadow-sm
                           transition-colors"
              >
                <span aria-hidden="true" className="text-base leading-none">+</span>
                Add Task
              </button>
            )}

            {contentView === 'features' && sprintId != null && (
              <button
                type="button"
                onClick={() => setShowAddFeatureModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                           text-white bg-brand hover:bg-brand-dark rounded-lg shadow-sm
                           transition-colors"
              >
                <span aria-hidden="true" className="text-base leading-none">+</span>
                Add Feature
              </button>
            )}
          </div>

          {contentView === 'features' ? (
            <>
              <FeatureFilters
                developers={filterOptions.developers}
                statuses={filterOptions.statuses}
                priorities={filterOptions.priorities}
                storyPoints={filterOptions.storyPoints}
                values={filters}
                onChange={handleFilterChange}
              />

              <div className="border-t border-gray-100 pt-5 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
                {/* Left: features list */}
                <div>
                  <h3 className="text-base font-semibold text-gray-800 mb-3">
                    Features ({visibleFeatures.length})
                  </h3>
                  {visibleFeatures.length === 0 && !unassignedGroup ? (
                    <p className="text-sm text-gray-400">
                      {displayFeatures.length === 0
                        ? 'This sprint has no features yet.'
                        : 'No features match the current filters.'}
                    </p>
                  ) : (
                    <>
                      {visibleFeatures.length > 0 && (
                        <div className="space-y-2">
                          {visibleFeatures.map(f => (
                            <FeatureListItem
                              key={f.id}
                              name={f.name}
                              developer={f.developer}
                              storyPoints={f.storyPoints}
                              completedTasks={f.completedTasks}
                              totalTasks={f.totalTasks}
                              statusLabel={f.statusLabel}
                              statusTone={f.statusTone}
                              selected={selectedFeature?.id === f.id}
                              onSelect={() => setSelectedFeatureId(f.id)}
                            />
                          ))}
                        </div>
                      )}

                      {/* "No Feature" group — deliberately styled differently */}
                      {/* (dashed border, muted gray, icon, divider above) so it */}
                      {/* never reads as a real feature card. */}
                      {unassignedGroup && (
                        <div className={visibleFeatures.length > 0 ? 'mt-4 pt-4 border-t border-dashed border-gray-300' : ''}>
                          <button
                            type="button"
                            onClick={() => setSelectedFeatureId(NO_FEATURE_ID)}
                            aria-pressed={selectedFeature?.id === NO_FEATURE_ID}
                            className={`w-full p-3 rounded-xl border border-dashed text-left transition-colors
                              ${
                                selectedFeature?.id === NO_FEATURE_ID
                                  ? 'border-gray-400 bg-gray-100'
                                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              <InboxIcon className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                              <span className="text-sm font-semibold text-gray-600">No Feature</span>
                              <span className="ml-auto text-xs text-gray-400">
                                {unassignedGroup.totalTasks} tasks
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1 ml-6">
                              Tasks not assigned to any feature
                            </p>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Right: feature detail (only when something is selected). */}
                {detail ? (
                  <FeatureDetailPanel
                    feature={detail}
                    onTaskClick={handleTaskClick}
                    /* The synthetic "No Feature" group isn't a real feature, */
                    /* so it can't be edited or deleted. */
                    onEdit={detail.id === NO_FEATURE_ID ? undefined : handleStartEditFeature}
                    onDelete={detail.id === NO_FEATURE_ID ? undefined : handleAskDeleteFeature}
                  />
                ) : (
                  <p className="text-sm text-gray-400 self-center text-center">
                    Select a feature to view details.
                  </p>
                )}
              </div>
            </>
          ) : (
            <DeveloperTaskBoard
              developers={developerBuckets.map(({ key, name, subtitle }): DeveloperBoardMember => ({
                key,
                name,
                subtitle,
              }))}
              selectedDeveloperKey={selectedDeveloperKey}
              onSelectDeveloper={setSelectedDeveloperKey}
              selectedDeveloperName={selectedDeveloper?.name}
              kpis={selectedDeveloperKpis}
              tasks={selectedDeveloperTasks}
              mode={developerTaskMode}
              onModeChange={setDeveloperTaskMode}
              onTaskClick={handleTaskClick}
            />
          )}
        </section>
      </div>
      )}
    </div>
  );
}
