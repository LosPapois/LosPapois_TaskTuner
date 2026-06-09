/**
 * Shared API Data Transfer Objects (DTOs).
 * These interfaces represent the shapes returned by the backend endpoints.
 */

export interface ProjectDTO {
  pjId: number;
  namePj: string;
  dateEndSetPj?: string | null;
  dateEndRealPj?: string | null;
  /** Project setting — when false, the user closes sprints manually via the */
  /** "Finalize Sprint" button on SprintPage. */
  autoCloseSprints?: boolean;
  autoRollover?: boolean;
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
  /** Null when the task has no assignee (allowed since the USER_ID column
   *  became nullable). UI should fall back to "Unassigned" in this case. */
  userId?: number | null;
  pjId?: number;
  featureId?: number | null;
  carriedOver?: boolean;
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
