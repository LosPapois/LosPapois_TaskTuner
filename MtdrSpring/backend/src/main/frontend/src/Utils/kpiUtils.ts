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

/** Priority weight matching backend formula: high=3, medium=2, low=1. */
export function taskWeight(t: { priority?: string | null; storyPoints?: number | null }): number {
  const sp = t.storyPoints ?? 1;
  const w  = t.priority === 'high' ? 3 : t.priority === 'medium' ? 2 : 1;
  return sp * w;
}

/**
 * Derive the four sprint KPIs from the joined task list.
 * progress and carryRate use weighted SP × priority — same formula as backend KpisRepository.
 */
export function computeSprintKpis(tasks: SprintTaskJoined[]): ComputedKpis {
  const total = tasks.length;
  if (total === 0) return ZERO_KPIS;

  const totalWeight   = tasks.reduce((sum, t) => sum + taskWeight(t), 0);
  const doneWeight    = tasks.filter(t => t.stateTask === 'done').reduce((sum, t) => sum + taskWeight(t), 0);
  const delayedWeight = tasks.filter(t => t.stateTask === 'delayed').reduce((sum, t) => sum + taskWeight(t), 0);
  const delayed = tasks.filter(t => t.stateTask === 'delayed').length;

  const todayIso = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter(
    t => t.stateTask !== 'done' && t.dateEndSetTask != null && t.dateEndSetTask < todayIso
  ).length;

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
    progress:        totalWeight === 0 ? 0 : Math.round((doneWeight    / totalWeight) * 100),
    carryRate:       totalWeight === 0 ? 0 : Math.round((delayedWeight / totalWeight) * 100),
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
