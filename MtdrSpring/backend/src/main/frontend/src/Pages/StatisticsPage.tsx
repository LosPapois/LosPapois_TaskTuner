import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageLoading from '../Components/Common/PageLoading';
import CloseProjectModal from '../Components/Common/CloseProjectModal';
import { SprintProgressPieChart, ProjectProgressBox } from '../Components/Sprint';
import CycleTimeScatterPlot from '../Components/Charts/CycleTimeScatterPlot';
import ProjectKpiOverview from '../Components/Statistics/ProjectKpiOverview';
import SprintPerformanceChart, {
  MetricKey,
} from '../Components/Statistics/SprintPerformanceChart';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../Utils/storage';

import {
  ProjectDTO,
  MembershipDTO,
  UserDTO,
  SprintDTO,
  SprintTaskDTO,
  TaskDTO,
} from '../Utils/types';
import { normalizeTaskState } from '../Utils/helpers';


interface MemberOption {
  id: number;
  name: string;
}

interface SprintSeriesPoint {
  sprintId: number;
  sprintName: string;
  tasksCompletedByMemberId: Record<number, number>;
  storyPointsCompletedByMemberId: Record<number, number>;
}

function buildYAxisTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0, 1, 2, 3, 4];
  const segments = 4;
  const step = Math.ceil(maxValue / segments);
  return [0, step, step * 2, step * 3, step * 4];
}

export default function StatisticsPage() {
  const { projectId: rawProjectId } = useParams<{ projectId: string }>();
  const projectId = rawProjectId ? Number(rawProjectId) : undefined;

  const projectName = useMemo(() => {
    const projects = getFromStorage<ProjectDTO[]>(STORAGE_KEYS.PROJECTS) ?? [];
    const match = projectId != null
      ? projects.find(p => p.pjId === projectId)
      : undefined;
    return match?.namePj ?? projects[0]?.namePj ?? 'Project';
  }, [projectId]);

  // Project lifecycle state — driven by dateEndRealPj. Seeded from cache so
  // the badge can paint immediately, then refreshed from /api/projects.
  const [closedDate, setClosedDate] = useState<string | null>(() => {
    const projects = getFromStorage<ProjectDTO[]>(STORAGE_KEYS.PROJECTS) ?? [];
    const match = projectId != null
      ? projects.find(p => p.pjId === projectId)
      : undefined;
    return match?.dateEndRealPj ?? null;
  });
  const isProjectClosed = closedDate != null;
  const [closeModalOpen, setCloseModalOpen] = useState<boolean>(false);

  // Re-fetch the project list on mount to make sure the close-state badge
  // reflects whatever state the backend has, not just what's in cache.
  useEffect(() => {
    if (projectId == null) return;
    let cancelled = false;
    fetch('/api/projects')
      .then(r => (r.ok ? r.json() : null))
      .then((data: ProjectDTO[] | null) => {
        if (cancelled || !data) return;
        saveToStorage(STORAGE_KEYS.PROJECTS, data);
        const match = data.find(p => p.pjId === projectId);
        setClosedDate(match?.dateEndRealPj ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // After a successful close, refresh local state + cache so the badge
  // flips immediately without a manual reload.
  const handleProjectClosed = () => {
    const today = new Date().toISOString();
    setClosedDate(today);
    const projects = getFromStorage<ProjectDTO[]>(STORAGE_KEYS.PROJECTS) ?? [];
    const next = projects.map(p =>
      p.pjId === projectId ? { ...p, dateEndRealPj: today } : p
    );
    saveToStorage(STORAGE_KEYS.PROJECTS, next);
  };

  const formattedClosedDate = useMemo(() => {
    if (!closedDate) return null;
    const d = new Date(closedDate);
    if (Number.isNaN(d.getTime())) return closedDate;
    return d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [closedDate]);

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [sprints, setSprints] = useState<SprintDTO[]>([]);
  const [seriesBySprint, setSeriesBySprint] = useState<SprintSeriesPoint[]>([]);
  const [allTasks, setAllTasks] = useState<TaskDTO[]>([]);
  const [sprintTaskLinksById, setSprintTaskLinksById] = useState<Record<number, SprintTaskDTO[]>>({});
  const [loading, setLoading] = useState(projectId != null && projectId >= 0);

  const [pendingMemberIds, setPendingMemberIds] = useState<number[]>([]);
  const [pendingMetric, setPendingMetric] = useState<MetricKey>('tasksCompleted');
  const [isMemberMenuOpen, setIsMemberMenuOpen] = useState(false);
  const memberMenuRef = useRef<HTMLDivElement | null>(null);

  const [appliedMemberIds, setAppliedMemberIds] = useState<number[]>([]);
  const [appliedMetric, setAppliedMetric] = useState<MetricKey>('tasksCompleted');

  // Sprint filter — mirrors the member filter pattern. Defaults to "all sprints"
  // so the chart matches the prior behavior on first render. The pending vs
  // applied split lets the user check/uncheck several sprints before pressing
  // "Update Graph" instead of re-rendering on every checkbox click.
  const [pendingSprintIds, setPendingSprintIds] = useState<number[]>([]);
  const [appliedSprintIds, setAppliedSprintIds] = useState<number[]>([]);
  const [isSprintMenuOpen, setIsSprintMenuOpen] = useState(false);
  const sprintMenuRef = useRef<HTMLDivElement | null>(null);

  // Active sprint data for pie chart and project progress
  const [activeSprint, setActiveSprint] = useState<SprintDTO | null>(null);
  const [activeSprintEndDate, setActiveSprintEndDate] = useState<string | null>(null);
  const [sprintTasksByState, setSprintTasksByState] = useState({ active: 0, delayed: 0, done: 0 });
  const [projectProgressPercent, setProjectProgressPercent] = useState(0);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (memberMenuRef.current && !memberMenuRef.current.contains(event.target as Node)) {
        setIsMemberMenuOpen(false);
      }
      if (sprintMenuRef.current && !sprintMenuRef.current.contains(event.target as Node)) {
        setIsSprintMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Reset sprint/project progress states when projectId is invalid
  useEffect(() => {
    if (projectId == null || projectId < 0) {
      setActiveSprint(null);
      setActiveSprintEndDate(null);
      setSprintTasksByState({ active: 0, delayed: 0, done: 0 });
      setProjectProgressPercent(0);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId == null || projectId < 0) {
      setMembers([]);
      setSprints([]);
      setSeriesBySprint([]);
      setAllTasks([]);
      setSprintTaskLinksById({});
      setPendingMemberIds([]);
      setAppliedMemberIds([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`/api/project-memberships/project/${projectId}`)
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('/api/users-tt')
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`/api/sprints/project/${projectId}/kpi`)
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('/api/tasks')
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(async ([
        memberships,
        users,
        projectSprints,
        allTasks,
      ]: [MembershipDTO[], UserDTO[], SprintDTO[], TaskDTO[]]) => {
        if (cancelled) return;

        const memberIds = new Set(memberships.map(m => m.userId));
        const projectMembers = users
          .filter(u => memberIds.has(u.userId))
          .map<MemberOption>(u => ({ id: u.userId, name: u.nameUser }))
          .sort((a, b) => a.name.localeCompare(b.name));

        const sortedSprints = [...projectSprints].sort((a, b) => {
          const aTime = a.dateStartSpr ? new Date(a.dateStartSpr).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.dateStartSpr ? new Date(b.dateStartSpr).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        });

        // Exclude sprints that haven't started yet from KPI series: keep
        // only sprints that are 'active' or 'done' or whose start date
        // is on or before today. This avoids showing future/not-started
        // sprints in the KPIs graphs.
        const visibleSprints = sortedSprints.filter(s => {
          const state = s.stateSprint?.toLowerCase();
          if (state === 'active' || state === 'done') return true;
          if (s.dateStartSpr) return new Date(s.dateStartSpr).getTime() <= Date.now();
          return false;
        });

        const tasksById = new Map(allTasks.map(t => [t.taskId, t]));

        const sprintLinks = await Promise.all(
          visibleSprints.map(s =>
            fetch(`/api/sprint-tasks/sprint/${s.sprId}`)
              .then(r => (r.ok ? r.json() : []))
              .catch(() => [] as SprintTaskDTO[])
          )
        );
        if (cancelled) return;

        const nextSprintTaskLinksById: Record<number, SprintTaskDTO[]> = {};
        visibleSprints.forEach((sprint, index) => {
          nextSprintTaskLinksById[sprint.sprId] = sprintLinks[index] ?? [];
        });

        const computedSeries: SprintSeriesPoint[] = visibleSprints.map((sprint, i) => {
          const links = sprintLinks[i] ?? [];
          const tasksCompletedByMemberId: Record<number, number> = {};
          const storyPointsCompletedByMemberId: Record<number, number> = {};

          projectMembers.forEach(member => {
            const doneTaskLinks = links.filter(link => {
              if (normalizeTaskState(link.stateTask) !== 'done') return false;
              const task = tasksById.get(link.taskId);
              return task?.userId === member.id;
            });

            const tasksCompleted = doneTaskLinks.length;
            const storyPointsCompleted = doneTaskLinks.reduce((sum, link) => {
              const task = tasksById.get(link.taskId);
              return sum + (task?.storyPoints ?? 0);
            }, 0);

            tasksCompletedByMemberId[member.id] = tasksCompleted;
            storyPointsCompletedByMemberId[member.id] = storyPointsCompleted;
          });

          return {
            sprintId: sprint.sprId,
            sprintName: sprint.nameSprint,
            tasksCompletedByMemberId,
            storyPointsCompletedByMemberId,
          };
        });

        setMembers(projectMembers);
        setSprints(visibleSprints);
        setSeriesBySprint(computedSeries);
  setAllTasks(allTasks);
  setSprintTaskLinksById(nextSprintTaskLinksById);

        // Seed sprint filter with every available sprint so the default view
        // matches the prior behavior (all sprints shown). Users can then
        // uncheck the ones they want hidden and press Update Graph.
        const allSprintIds = visibleSprints.map(s => s.sprId);
        setPendingSprintIds(allSprintIds);
        setAppliedSprintIds(allSprintIds);

        // Calculate project progress based on all unique tasks in all sprints.
        // A task's final status is whatever it was in its latest sprint.
        const latestTaskStatus = new Map<number, string>();
        sprintLinks.forEach(links => {
          links.forEach(link => {
            latestTaskStatus.set(link.taskId, normalizeTaskState(link.stateTask));
          });
        });
        let projectDoneCount = 0;
        latestTaskStatus.forEach(status => {
          if (status === 'done') projectDoneCount++;
        });
        const projectTotalTasks = latestTaskStatus.size;
        const projectProgressPct = projectTotalTasks > 0
          ? Math.round((projectDoneCount / projectTotalTasks) * 100)
          : 0;
        setProjectProgressPercent(projectProgressPct);

        // Find the sprint the team is currently working on.
        const nowTime = new Date().getTime();
        let currentActiveSprint = null;

        // Prefer the sprint explicitly marked as active (most recent if multiple).
        const activeSprintsList = sortedSprints.filter(
          s => s.stateSprint?.toLowerCase() === 'active'
        );

        if (activeSprintsList.length > 0) {
          currentActiveSprint = activeSprintsList[activeSprintsList.length - 1];
        } else {
          // Check if we are within the dates of any sprint (inclusive of end day)
          const ongoingSprints = sortedSprints.filter(s => {
            if (!s.dateStartSpr || !s.dateEndSpr) return false;
            const start = new Date(s.dateStartSpr).getTime();
            const end = new Date(s.dateEndSpr).getTime() + (24 * 60 * 60 * 1000);
            return nowTime >= start && nowTime <= end;
          });

          if (ongoingSprints.length > 0) {
            currentActiveSprint = ongoingSprints[ongoingSprints.length - 1];
          } else {
            // Fallback: most recent sprint that has started
            const startedSprints = sortedSprints.filter(
              s => s.dateStartSpr && new Date(s.dateStartSpr).getTime() <= nowTime
            );
            currentActiveSprint = startedSprints[startedSprints.length - 1] ?? null;
          }
        }

        if (currentActiveSprint && !cancelled) {
          setActiveSprint(currentActiveSprint);
          setActiveSprintEndDate(currentActiveSprint.dateEndSpr ?? null);

          // Reuse already-fetched tasks for the active sprint pie chart
          const activeSprintIndex = visibleSprints.findIndex(
            sprint => sprint.sprId === currentActiveSprint.sprId
          );
          const activeSprintLinks =
            activeSprintIndex >= 0 ? sprintLinks[activeSprintIndex] ?? [] : [];
          const activeSprintTasks = activeSprintLinks.filter(link => {
            const task = tasksById.get(link.taskId);
            return task != null;
          });

          const { activeTasks, delayedTasks, doneTasks } = activeSprintTasks.reduce(
            (acc, task) => {
              const state = (task.stateTask ?? '').toLowerCase();
              if (state === 'active') acc.activeTasks += 1;
              else if (state === 'delayed') acc.delayedTasks += 1;
              else if (state === 'done') acc.doneTasks += 1;
              return acc;
            },
            { activeTasks: 0, delayedTasks: 0, doneTasks: 0 }
          );

          setSprintTasksByState({ active: activeTasks, delayed: delayedTasks, done: doneTasks });
        } else if (!cancelled) {
          // No active sprint found — reset sprint display state so stale data from
          // a previously viewed project is not shown.
          setActiveSprint(null);
          setActiveSprintEndDate(null);
          setSprintTasksByState({ active: 0, delayed: 0, done: 0 });
        }

        // Start with no members selected so the user explicitly chooses
        // who to graph before applying filters.
        setPendingMemberIds([]);
        setAppliedMemberIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // pendingMetric intentionally excluded so raw series stays stable;
    // we derive displayed values from appliedMetric below.
  }, [projectId]);

  const chartRows = useMemo(() => {
    const visibleSet = new Set(appliedSprintIds);
    return seriesBySprint
      .filter(point => visibleSet.has(point.sprintId))
      .map(point => ({
        sprintId: point.sprintId,
        sprintName: point.sprintName,
        values: appliedMemberIds.map(memberId => ({
          memberId,
          value:
            appliedMetric === 'tasksCompleted'
              ? (point.tasksCompletedByMemberId[memberId] ?? 0)
              : (point.storyPointsCompletedByMemberId[memberId] ?? 0),
        })),
      }));
  }, [seriesBySprint, appliedMemberIds, appliedMetric, appliedSprintIds]);

  const memberNameById = useMemo(
    () => new Map(members.map(m => [m.id, m.name])),
    [members]
  );

  const maxValue = useMemo(() => {
    const vals = chartRows.flatMap(row => row.values.map(v => v.value));
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [chartRows]);

  const yTicks = useMemo(() => buildYAxisTicks(maxValue), [maxValue]);
  const axisMax = yTicks[yTicks.length - 1] ?? maxValue;

  const {
    barWidthPx,
    barGapPx,
    sprintGroupWidthPx,
    chartMinWidthPx,
  } = useMemo(() => {
    const developerCount = Math.max(appliedMemberIds.length, 1);
    const sprintCount = Math.max(chartRows.length, 1);

    const computedBarWidth = developerCount <= 3
      ? 18
      : developerCount <= 6
        ? 14
        : developerCount <= 10
          ? 10
          : 8;

    const computedBarGap = developerCount <= 3
      ? 10
      : developerCount <= 6
        ? 8
        : developerCount <= 10
          ? 6
          : 4;

    const groupInnerWidth =
      developerCount * computedBarWidth + (developerCount - 1) * computedBarGap;
    const computedGroupWidth = Math.max(120, groupInnerWidth + 24);
    const computedChartMinWidth = Math.max(
      760,
      64 + sprintCount * (computedGroupWidth + 16)
    );

    return {
      barWidthPx: computedBarWidth,
      barGapPx: computedBarGap,
      sprintGroupWidthPx: computedGroupWidth,
      chartMinWidthPx: computedChartMinWidth,
    };
  }, [appliedMemberIds.length, chartRows.length]);

  const handleApply = () => {
    setAppliedMemberIds(pendingMemberIds);
    setAppliedMetric(pendingMetric);
    setAppliedSprintIds(pendingSprintIds);
    setIsMemberMenuOpen(false);
    setIsSprintMenuOpen(false);
  };

  const togglePendingMember = (memberId: number) => {
    setPendingMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    setPendingMemberIds(members.map(m => m.id));
  };

  const clearMemberSelection = () => {
    setPendingMemberIds([]);
  };

  const selectedMembersLabel = useMemo(() => {
    if (pendingMemberIds.length === 0) return 'No members selected';
    if (pendingMemberIds.length === members.length) return 'All members selected';
    if (pendingMemberIds.length === 1) {
      return memberNameById.get(pendingMemberIds[0]) ?? '1 member selected';
    }
    return `${pendingMemberIds.length} members selected`;
  }, [pendingMemberIds, members.length, memberNameById]);

  // ─── Sprint filter helpers (mirror the member helpers above) ─────────────
  const togglePendingSprint = (sprintId: number) => {
    setPendingSprintIds(prev =>
      prev.includes(sprintId)
        ? prev.filter(id => id !== sprintId)
        : [...prev, sprintId]
    );
  };

  const selectAllSprints = () => {
    setPendingSprintIds(sprints.map(s => s.sprId));
  };

  const clearSprintSelection = () => {
    setPendingSprintIds([]);
  };

  const sprintNameById = useMemo(
    () => new Map(sprints.map(s => [s.sprId, s.nameSprint])),
    [sprints]
  );

  const selectedSprintsLabel = useMemo(() => {
    if (pendingSprintIds.length === 0) return 'No sprints selected';
    if (pendingSprintIds.length === sprints.length) return 'All sprints selected';
    if (pendingSprintIds.length === 1) {
      return sprintNameById.get(pendingSprintIds[0]) ?? '1 sprint selected';
    }
    return `${pendingSprintIds.length} sprints selected`;
  }, [pendingSprintIds, sprints.length, sprintNameById]);

  if (loading) {
    return (
      <div className="app-page-bg min-h-full px-6 py-8">
        <div className="container-main">
          <PageLoading
            title="Loading project statistics..."
            subtitle="Fetching project members, sprint history, and completion metrics."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-page-bg min-h-full px-6 py-8">
      <div className="container-main space-y-8">
        <header>
          <h1 className="heading-h2">
            {projectName} - Statistics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Compare member performance by sprint with configurable chart metrics.
          </p>
        </header>

        <ProjectKpiOverview
          sprints={sprints}
          members={members}
          sprintTaskLinksById={sprintTaskLinksById}
          tasks={allTasks}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-stretch mb-8">
          
          {/* Left Column: Bar Graph and Controls */}
          <SprintPerformanceChart
            members={members}
            sprints={sprints}
            pendingMemberIds={pendingMemberIds}
            pendingMetric={pendingMetric}
            isMemberMenuOpen={isMemberMenuOpen}
            memberMenuRef={memberMenuRef}
            selectedMembersLabel={selectedMembersLabel}
            onToggleMemberMenu={() => setIsMemberMenuOpen(open => !open)}
            onSelectAllMembers={selectAllMembers}
            onClearMembers={clearMemberSelection}
            onToggleMember={togglePendingMember}
            onMetricChange={setPendingMetric}
            onApply={handleApply}
            appliedMemberIds={appliedMemberIds}
            appliedMetric={appliedMetric}
            chartRows={chartRows}
            yTicks={yTicks}
            axisMax={axisMax}
            barWidthPx={barWidthPx}
            barGapPx={barGapPx}
            sprintGroupWidthPx={sprintGroupWidthPx}
            chartMinWidthPx={chartMinWidthPx}
            memberNameById={memberNameById}
            // Sprint filter — same pending/applied dance as members.
            pendingSprintIds={pendingSprintIds}
            isSprintMenuOpen={isSprintMenuOpen}
            sprintMenuRef={sprintMenuRef}
            selectedSprintsLabel={selectedSprintsLabel}
            onToggleSprintMenu={() => setIsSprintMenuOpen(open => !open)}
            onSelectAllSprints={selectAllSprints}
            onClearSprints={clearSprintSelection}
            onToggleSprint={togglePendingSprint}
          />

          {/* Right Column: Widgets */}
          <div className="flex flex-col gap-6 h-full">
            <section className="section-card-flex flex-1">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-900">Sprint Task Distribution</h3>
                {activeSprint && (
                  <p className="text-xs text-gray-500 mt-1">{activeSprint.nameSprint}</p>
                )}
              </div>
              <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                {activeSprint ? (
                  <SprintProgressPieChart
                    activeTasks={sprintTasksByState.active}
                    delayedTasks={sprintTasksByState.delayed}
                    doneTasks={sprintTasksByState.done}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 rounded-lg border border-gray-200 p-6">
                    <p className="text-sm text-gray-500">No active sprint</p>
                  </div>
                )}
              </div>
            </section>

            <ProjectProgressBox
              projectName={projectName}
              sprintEndDate={activeSprintEndDate}
              completionPercent={projectProgressPercent}
            />
          </div>
        </div>
      </div>

      <CloseProjectModal
        isOpen={closeModalOpen}
        projectId={projectId ?? null}
        projectName={projectName}
        onClose={() => setCloseModalOpen(false)}
        onClosed={handleProjectClosed}
      />
    </div>
  );
}
