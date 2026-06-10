import React, { useMemo, useState } from 'react';
import {
  TrophyIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  HashtagIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { SprintDTO, SprintTaskDTO, TaskDTO } from '../../Utils/types';
import { normalizeTaskState } from '../../Utils/helpers';
import KpiCard from '../Team/KpiCard';

interface MemberOption {
  id: number;
  name: string;
}

interface ProjectKpiOverviewProps {
  sprints: SprintDTO[];
  members: MemberOption[];
  sprintTaskLinksById: Record<number, SprintTaskDTO[]>;
  tasks: TaskDTO[];
}

interface MemberTotals {
  tasksDone: number;
  storyPointsDone: number;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function formatNumber(value: number, maxFractionDigits = 1): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export default function ProjectKpiOverview({
  sprints,
  members,
  sprintTaskLinksById,
  tasks,
}: ProjectKpiOverviewProps) {
  const [selectedSprintId, setSelectedSprintId] = useState<string>('all');

  const tasksById = useMemo(() => new Map(tasks.map(task => [task.taskId, task])), [tasks]);

  const selectedSprints = useMemo(() => {
    if (selectedSprintId === 'all') return sprints;
    const id = Number(selectedSprintId);
    return sprints.filter(sprint => sprint.sprId === id);
  }, [selectedSprintId, sprints]);

  const memberTotals = useMemo(() => {
    const totals = new Map<number, MemberTotals>();
    members.forEach(member => totals.set(member.id, { tasksDone: 0, storyPointsDone: 0 }));

    const latestTaskById = new Map<number, { state: string; memberId?: number; storyPoints: number }>();

    selectedSprints.forEach(sprint => {
      const links = sprintTaskLinksById[sprint.sprId] ?? [];
      links.forEach(link => {
        const task = tasksById.get(link.taskId);
        if (!task) return;
        latestTaskById.set(link.taskId, {
          state: normalizeTaskState(link.stateTask),
          memberId: task.userId ?? undefined,
          storyPoints: task.storyPoints ?? 0,
        });
      });
    });

    latestTaskById.forEach(entry => {
      if (entry.state !== 'done' || entry.memberId == null) return;
      const totalsEntry = totals.get(entry.memberId);
      if (!totalsEntry) return;
      totalsEntry.tasksDone += 1;
      totalsEntry.storyPointsDone += entry.storyPoints;
    });

    return totals;
  }, [members, selectedSprints, sprintTaskLinksById, tasksById]);

  const taskTotals = useMemo(() => {
    const values = members.map(member => memberTotals.get(member.id)?.tasksDone ?? 0);
    return {
      average: mean(values),
      median: median(values),
    };
  }, [members, memberTotals]);

  const storyPointTotals = useMemo(() => {
    const values = members.map(member => memberTotals.get(member.id)?.storyPointsDone ?? 0);
    return {
      average: mean(values),
      median: median(values),
      total: values.reduce((sum, value) => sum + value, 0),
    };
  }, [members, memberTotals]);

  return (
    <section className="section-card-flex space-y-6" aria-labelledby="developer-kpis-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col space-y-2">
          <h2 id="developer-kpis-heading" className="heading-h4">Developer KPIs</h2>
          <p className="text-sm text-gray-500">
            Summary of effort per developer based on selected sprints.
          </p>
        </div>

        <label className="min-w-[220px]">
          <span className="text-xs font-semibold text-gray-500">Sprint Filter</span>
          <select
            value={selectedSprintId}
            onChange={event => setSelectedSprintId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand focus:outline-none"
          >
            <option value="all">All sprints</option>
            {sprints.map(sprint => (
              <option key={sprint.sprId} value={String(sprint.sprId)}>
                {sprint.nameSprint}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total SP Completed"
          value={`${formatNumber(storyPointTotals.total, 0)} SP`}
          icon={TrophyIcon}
          tone="brand"
        >
          <p className="text-xs text-gray-500">Only completed tasks</p>
        </KpiCard>
        <KpiCard
          label="Average Tasks per Developer"
          value={formatNumber(taskTotals.average)}
          icon={ClipboardDocumentCheckIcon}
          tone="info"
        />
        <KpiCard
          label="Average SP per Developer"
          value={`${formatNumber(storyPointTotals.average)} SP`}
          icon={ChartBarIcon}
          tone="warning"
        />
        <KpiCard
          label="Median Tasks per Developer"
          value={formatNumber(taskTotals.median)}
          icon={HashtagIcon}
          tone="success"
        />
        <KpiCard
          label="Median SP per Developer"
          value={`${formatNumber(storyPointTotals.median)} SP`}
          icon={ArrowTrendingUpIcon}
          tone="brand"
        />
      </div>
    </section>
  );
}
