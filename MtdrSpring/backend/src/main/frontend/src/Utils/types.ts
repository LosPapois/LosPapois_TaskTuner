/**
 * Shared API Data Transfer Objects (DTOs).
 * These interfaces represent the shapes returned by the backend endpoints.
 */

export interface ProjectDTO {
  pjId: number;
  namePj: string;
  dateEndSetPj?: string | null;
  dateEndRealPj?: string | null;
}

export interface SprintDTO {
  sprId: number;
  nameSprint: string;
  dateStartSpr: string | null;
  dateEndSpr: string | null;
  taskGoal?: number | null;
  stateSprint: string | null;
  pjId?: number;
}

export interface TaskDTO {
  taskId: number;
  nameTask?: string | null;
  infoTask?: string | null;
  priority?: string | null;
  storyPoints: number | null;
  dateStartTask?: string | null;
  dateEndSetTask?: string | null;
  dateEndRealTask?: string | null;
  userId?: number;
  pjId?: number;
  featureId?: number | null;
}

export interface SprintTaskDTO {
  sprId: number;
  taskId: number;
  stateTask: string;
}

export interface FeatureDTO {
  featureId: number;
  nameFeature: string;
  priorityFeature: string | null;
  descriptionFeature?: string | null;
  sprId: number;
}

export interface UserDTO {
  userId: number;
  nameUser: string;
  mail?: string | null;
  idTelegram?: string;
  role?: string;
  password?: string | null;
}

export interface MembershipDTO {
  pjId: number;
  userId: number;
}
