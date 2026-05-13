import { TaskDTO, SprintTaskDTO } from './types';
import { MemberKpis, EMPTY_MEMBER_KPIS } from './mockData';

export interface SprintTaskJoined extends TaskDTO {
  stateTask: string;
}

export interface ComputedKpis {
  progress: number;
  carryRate: number;
  carriedFeatures: number;
  totalFeatures: number;
  taskDelay: number;
  delayedTasks: number;
  cycleTime: string;
  totalTasks: number;
}

export const ZERO_KPIS: ComputedKpis = {
  progress: 0,
  carryRate: 0,
  carriedFeatures: 0,
  totalFeatures: 0,
  taskDelay: 0,
  delayedTasks: 0,
  cycleTime: '0.0 days',
  totalTasks: 0,
};

/**
 * Derive the four sprint KPIs from the joined task list.
 */
export function computeSprintKpis(tasks: SprintTaskJoined[]): ComputedKpis {
  const total = tasks.length;
  if (total === 0) return ZERO_KPIS;

  const done    = tasks.filter(t => t.stateTask === 'done').length;
  const delayed = tasks.filter(t => t.stateTask === 'delayed').length;

  const todayIso = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter(
    t => t.stateTask !== 'done' && t.dateEndSetTask != null && t.dateEndSetTask < todayIso
  ).length;

  // Cycle time only meaningful for tasks that actually closed.
  const completed = tasks.filter(
    t => t.stateTask === 'done' && t.dateStartTask && t.dateEndRealTask
  );
  const dayMs = 1000 * 60 * 60 * 24;
  const avgCycleDays = completed.length === 0
    ? 0
    : completed.reduce((sum, t) => {
        const start = new Date(t.dateStartTask!).getTime();
        const end   = new Date(t.dateEndRealTask!).getTime();
        return sum + Math.max(0, (end - start) / dayMs);
      }, 0) / completed.length;

  return {
    progress:        Math.round((done / total) * 100),
    carryRate:       Math.round((delayed / total) * 100),
    carriedFeatures: delayed,
    totalFeatures:   total,
    taskDelay:       Math.round((overdue / total) * 100),
    delayedTasks:    overdue,
    cycleTime:       `${avgCycleDays.toFixed(1)} days`,
    totalTasks:      total,
  };
}

/**
 * Compute the 4 KPI tiles shown in the member detail panel from the
 * backing task list.
 */
export function computeMemberKpis(
  projectTasks: TaskDTO[],
  memberId: number
): MemberKpis {
  const myTasks = projectTasks.filter(t => t.userId === memberId);
  const total = myTasks.length;
  if (total === 0) return EMPTY_MEMBER_KPIS;

  const completed = myTasks.filter(t => t.dateEndRealTask != null);
  const completedCount = completed.length;

  // Cycle time: only meaningful for tasks that have both dates.
  const dayMs = 1000 * 60 * 60 * 24;
  const withDates = completed.filter(t => t.dateStartTask && t.dateEndRealTask);
  const avgCycleDays = withDates.length === 0
    ? 0
    : withDates.reduce((sum, t) => {
        const start = new Date(t.dateStartTask!).getTime();
        const end   = new Date(t.dateEndRealTask!).getTime();
        return sum + Math.max(0, (end - start) / dayMs);
      }, 0) / withDates.length;

  const distinctFeatures = new Set(
    myTasks.map(t => t.featureId).filter((f): f is number => f != null)
  );

  return {
    tasksCompleted: completedCount,
    cycleTime:      `${avgCycleDays.toFixed(1)} days`,
    assignedTasks:  total,
    features:       distinctFeatures.size,
    progress:       `${Math.round((completedCount / total) * 100)}%`,
  };
}
