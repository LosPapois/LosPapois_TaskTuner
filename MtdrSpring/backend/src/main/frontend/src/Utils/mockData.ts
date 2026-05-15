import { AvatarTone } from '../Components/Team';

export interface MockMember {
  id: number;
  name: string;
  role: string;
  rawRole?: string;
  telegram?: string;
  email: string;
  avatarTone: AvatarTone;
}

export const MOCK_MEMBERS: MockMember[] = [
  { id: 1, name: 'Ana García',   role: 'Frontend Developer', rawRole: 'developer', telegram: '@ana_garcia', email: 'ana.garcia@tasktuner.com',   avatarTone: 'brand'   },
  { id: 2, name: 'Carlos Ruiz',  role: 'Backend Developer',  rawRole: 'developer', telegram: '@carlos_ruiz', email: 'carlos.ruiz@tasktuner.com',  avatarTone: 'brand'   },
  { id: 3, name: 'María López',  role: 'QA Engineer',        rawRole: 'developer', telegram: '@maria_lopez', email: 'maria.lopez@tasktuner.com',  avatarTone: 'brand'   },
  { id: 4, name: 'Juan Pérez',   role: 'DevOps Engineer',    rawRole: 'developer', telegram: '@juan_perez', email: 'juan.perez@tasktuner.com',   avatarTone: 'neutral' },
];

export interface MemberKpis {
  tasksCompleted: number;
  cycleTime: string;
  assignedTasks: number;
  features: number;
  progress: string;
}

export const MOCK_MEMBER_KPIS: Record<number, MemberKpis> = {
  1: { tasksCompleted: 2, cycleTime: '2.5 days', assignedTasks: 4, features: 2, progress: '50%' },
  2: { tasksCompleted: 0, cycleTime: '0 days',   assignedTasks: 0, features: 0, progress: '0%'  },
  3: { tasksCompleted: 0, cycleTime: '0 days',   assignedTasks: 0, features: 0, progress: '0%'  },
  4: { tasksCompleted: 0, cycleTime: '0 days',   assignedTasks: 0, features: 0, progress: '0%'  },
};

export const EMPTY_MEMBER_KPIS: MemberKpis = {
  tasksCompleted: 0,
  cycleTime: '—',
  assignedTasks: 0,
  features: 0,
  progress: '—',
};

// MOCK_SPRINT_BASE
export const MOCK_SPRINT_BASE = {
  startDate: '15 mar 2026',
  endDate:   '29 mar 2026',
  totalTasks: 0,
  kpis: {
    progress: 0,
    carryRate: 0,
    carriedFeatures: 0,
    totalFeatures: 2,
    taskDelay: 0,
    delayedTasks: 0,
    cycleTime: '0.0 days',
  },
};
