import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  AddTeamMemberModal,
  ConfirmMemberDeleteModal,
  KpiCard,
  MemberDetailPanel,
  MemberListItem,
} from '../Components/Team';
import AddOrSelectTeamMemberModal from '../Components/Team/AddOrSelectTeamMemberModal';
import type {
  NewTeamMemberData,
  AvatarTone,
  MemberTaskLite,
  MemberTaskPriority,
  ExistingUser,
} from '../Components/Team';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../Utils/storage';
import TaskDetailModal from '../Components/Common/TaskDetailModal';
import type { TaskDetailData } from '../Components/Common/TaskDetailModal';
import PageLoading from '../Components/Common/PageLoading';
import ProgressBar from '../Components/Common/ProgressBar';
import Sparkline from '../Components/Common/Sparkline';
import useProjectKpis from '../Hooks/useProjectKpis';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — visual-only until the team / KPI endpoints are wired.
// Each section is grouped + commented so the swap to real data is mechanical:
// replace the constant with a hook (e.g. useProjectKpis(projectId)) and pipe
// the same shape into the components.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ProjectDTO,
  MembershipDTO,
  UserDTO,
  TaskDTO,
  FeatureDTO,
} from '../Utils/types';
import { mapTaskPriority } from '../Utils/helpers';
import {
  MockMember,
  MOCK_MEMBERS,
  MemberKpis,
  MOCK_MEMBER_KPIS,
  EMPTY_MEMBER_KPIS,
} from '../Utils/mockData';
import { computeMemberKpis } from '../Utils/kpiUtils';

/** Rank priorities so "Alta" sorts above "Media" etc. in the tasks list. */
const PRIORITY_ORDER: Record<MemberTaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

/** Per-project cache key — team rosters are stored separately for each project. */
const teamCacheKey = (projectId: number) =>
  `${STORAGE_KEYS.TEAM_MEMBERS}_${projectId}`;

/** Convert a backend UserTT into the display shape used by the page/components. */
function mapBackendUser(u: UserDTO): MockMember {
  return {
    id: u.userId,
    name: u.nameUser,
    // Backend role is just 'manager' | 'developer' — capitalize for display.
    // Real job titles ("Frontend Developer", etc.) live elsewhere; we only
    // have the platform-level role here.
    role: u.role
      ? u.role.charAt(0).toUpperCase() + u.role.slice(1)
      : 'Member',
    rawRole: u.role,
    telegram: u.idTelegram,
    email: u.mail ?? u.idTelegram, // fall back to telegram handle if no email
    avatarTone: 'brand',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline visualizations — kept here because they're throwaway shapes specific
// to these mock cards. Promote to /Components when real data drives them.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  // The route is /projects/:projectId/team — every "Team" link in the
  // sidebar carries its own projectId, so this param uniquely identifies
  // which project's team we're viewing (no more cross-group highlight bugs).
  const { projectId: rawProjectId } = useParams<{ projectId: string }>();
  const projectId = rawProjectId ? Number(rawProjectId) : undefined;

  // Members are seeded from per-project cache for instant paint, then
  // refreshed by the parallel fetch below. Mock projects (negative IDs)
  // permanently use MOCK_MEMBERS — they don't exist in the backend.
  const [members, setMembers] = useState<MockMember[]>(() => {
    if (projectId == null || projectId < 0) return MOCK_MEMBERS;
    return getFromStorage<MockMember[]>(teamCacheKey(projectId)) ?? [];
  });

  // All tasks across the system (cache shared with TasksPage). Filtered to
  // this project's tasks at compute time — keeps the cache simple (one key,
  // one fetch covers the whole app's task data).
  const [allTasks, setAllTasks] = useState<TaskDTO[]>(
    () => getFromStorage<TaskDTO[]>(STORAGE_KEYS.TASKS) ?? []
  );

  // All features across the system — used to map featureId → name when
  // showing "Features Asignadas" inside the member detail panel.
  const [allFeatures, setAllFeatures] = useState<FeatureDTO[]>([]);

  // All users in the system — used to populate the "Add Existing User" dropdown
  const [allUsers, setAllUsers] = useState<UserDTO[]>([]);

  // Cross-project membership snapshot — needed to enforce the "a user can
  // only belong to one active project at a time" rule. Both pieces are
  // refreshed alongside membersRefreshToken so the modal sees up-to-date
  // assignments after every add/remove.
  const [allProjects, setAllProjects] = useState<ProjectDTO[]>([]);
  const [allMemberships, setAllMemberships] = useState<MembershipDTO[]>([]);

  // Selection is nullable so we can render an empty state when no members.
  const [selectedId, setSelectedId] = useState<number | null>(
    () => members[0]?.id ?? null
  );

  const [selectedTaskForModal, setSelectedTaskForModal] = useState<TaskDetailData | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberSubmitting, setAddMemberSubmitting] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [editMemberSubmitting, setEditMemberSubmitting] = useState(false);
  const [editMemberError, setEditMemberError] = useState<string | null>(null);
  const [isDeleteMemberModalOpen, setIsDeleteMemberModalOpen] = useState(false);
  const [deleteMemberSubmitting, setDeleteMemberSubmitting] = useState(false);
  const [deleteMemberError, setDeleteMemberError] = useState<string | null>(null);
  const [membersRefreshToken, setMembersRefreshToken] = useState(0);
  const [tasksRefreshToken, setTasksRefreshToken] = useState(0);
  const [membersLoading, setMembersLoading] = useState(
    projectId != null && projectId >= 0
  );
  const [tasksLoading, setTasksLoading] = useState(allTasks.length === 0);
  const [featuresLoading, setFeaturesLoading] = useState(true);

  // Re-seed + refetch whenever the project changes.
  useEffect(() => {
    if (projectId == null) return;
    setMembersLoading(false);

    if (projectId < 0) {
      // Demo project — keep mock data, no backend call.
      setMembers(MOCK_MEMBERS);
      setSelectedId(prev =>
        prev != null && MOCK_MEMBERS.some(m => m.id === prev)
          ? prev
          : MOCK_MEMBERS[0].id
      );
      return;
    }

    setMembersLoading(true);

    // Reset to whatever's cached for this project so the previous project's
    // members don't briefly leak across navigations.
    const cached = getFromStorage<MockMember[]>(teamCacheKey(projectId)) ?? [];
    setMembers(cached);
    setSelectedId(prev =>
      prev != null && cached.some(m => m.id === prev) ? prev : cached[0]?.id ?? null
    );

    // Two-step fetch: memberships give us the userIds in this project, then
    // we filter the full users list. Two requests instead of N+1 lookups.
    let cancelled = false;
    Promise.all([
      fetch(`/api/project-memberships/project/${projectId}`)
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('/api/users-tt')
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([memberships, allUsers]: [MembershipDTO[], UserDTO[]]) => {
      if (cancelled) return;
      const memberIds = new Set(memberships.map(m => m.userId));
      const mapped = allUsers
        .filter(u => memberIds.has(u.userId))
        .map(mapBackendUser);
      setMembers(mapped);
      setSelectedId(prev =>
        prev != null && mapped.some(m => m.id === prev)
          ? prev
          : mapped[0]?.id ?? null
      );
      saveToStorage(teamCacheKey(projectId), mapped);
      setMembersLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, membersRefreshToken]);

  // Background refresh of the task list (used by the per-member KPIs).
  // Runs once on mount — the cache holds across project switches so we
  // don't re-fetch the whole task table every time the user changes
  // projects in the sidebar.
  useEffect(() => {
    let cancelled = false;
    setTasksLoading(true);
    fetch('/api/tasks')
      .then(r => (r.ok ? r.json() : null))
      .then((data: TaskDTO[] | null) => {
        if (cancelled || !data) return;
        setAllTasks(data);
        saveToStorage(STORAGE_KEYS.TASKS, data);
      })
      .catch(() => {
        /* Keep cached tasks on failure. */
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tasksRefreshToken]);

  // One-time fetch of all features for the per-member feature list lookup.
  // Small payload, doesn't change often — no per-project caching needed.
  useEffect(() => {
    let cancelled = false;
    setFeaturesLoading(true);
    fetch('/api/features')
      .then(r => (r.ok ? r.json() : []))
      .then((data: FeatureDTO[]) => {
        if (cancelled) return;
        setAllFeatures(data);
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setFeaturesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch all users for the "Add Existing User" modal dropdown
  useEffect(() => {
    let cancelled = false;
    fetch('/api/users-tt')
      .then(r => (r.ok ? r.json() : []))
      .then((data: UserDTO[]) => {
        if (cancelled) return;
        setAllUsers(data);
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch all projects + all memberships so the "Add Existing User" modal
  // can warn when a candidate is already in another active project.
  // Tied to membersRefreshToken so the snapshot stays fresh after the
  // current page itself adds or removes a member.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/projects')
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('/api/project-memberships')
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([projects, memberships]: [ProjectDTO[], MembershipDTO[]]) => {
      if (cancelled) return;
      setAllProjects(projects ?? []);
      setAllMemberships(memberships ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [membersRefreshToken]);

  // userId → name of the OTHER active project the user is already on.
  // Built fresh from the latest memberships + projects snapshot.
  // Active = dateEndRealPj is null/empty. The current project is excluded
  // because users in it are already filtered out via currentTeamMemberIds.
  const blockedUsersByActiveProject = useMemo(() => {
    const map = new Map<number, string>();
    if (projectId == null) return map;

    const activeProjectsById = new Map<number, ProjectDTO>();
    for (const p of allProjects) {
      const isActive = p.dateEndRealPj == null || p.dateEndRealPj === '';
      if (isActive && p.pjId !== projectId) {
        activeProjectsById.set(p.pjId, p);
      }
    }

    for (const m of allMemberships) {
      const proj = activeProjectsById.get(m.pjId);
      if (proj && !map.has(m.userId)) {
        map.set(m.userId, proj.namePj);
      }
    }
    return map;
  }, [allProjects, allMemberships, projectId]);

  // ─── Project-level KPIs ────────────────────────────────────────────────
  // Source of truth for the "Average Project KPIs" section. The hook hits
  // /api/projects/{pjId}/kpis/{velocity,retrabajo,completitud}. Cycle time
  // and project delay aren't backend KPIs (yet) so we compute them client-
  // side from data the page already loads (allTasks + allProjects).
  const projectKpis = useProjectKpis(projectId);

  /** Average days from dateStartTask → dateEndRealTask across this project's
   *  finished tasks. Returns null when no task has both dates filled. */
  const avgCycleTimeDays = useMemo<number | null>(() => {
    if (projectId == null || projectId < 0) return null;
    const finished = allTasks.filter(
      t => t.pjId === projectId && t.dateStartTask && t.dateEndRealTask
    );
    if (finished.length === 0) return null;

    const totalDays = finished.reduce((sum, t) => {
      const start = new Date(t.dateStartTask!).getTime();
      const end = new Date(t.dateEndRealTask!).getTime();
      if (Number.isNaN(start) || Number.isNaN(end)) return sum;
      const days = (end - start) / (1000 * 60 * 60 * 24);
      // Clamp negatives in case of clock skew or out-of-order dates.
      return sum + Math.max(0, days);
    }, 0);

    return totalDays / finished.length;
  }, [allTasks, projectId]);

  /** Project delay relative to its planned end date. Positive = late, zero or
   *  negative = on track. When the project is finalized we anchor against
   *  dateEndRealPj; otherwise we compare against today. */
  const projectDelayInfo = useMemo<{
    days: number;
    label: string;
    expectedDate: string | null;
    tone: 'success' | 'warning' | 'danger';
  } | null>(() => {
    if (projectId == null || projectId < 0) return null;
    const project = allProjects.find(p => p.pjId === projectId);
    if (!project?.dateEndSetPj) return null;

    const expected = new Date(project.dateEndSetPj);
    if (Number.isNaN(expected.getTime())) return null;

    const reference = project.dateEndRealPj
      ? new Date(project.dateEndRealPj)
      : new Date();
    if (Number.isNaN(reference.getTime())) return null;

    const diffMs = reference.getTime() - expected.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const expectedFormatted = expected.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    if (days <= 0) {
      return {
        days: 0,
        label: 'On track',
        expectedDate: expectedFormatted,
        tone: 'success',
      };
    }
    return {
      days,
      label: `${days} day${days === 1 ? '' : 's'} late`,
      expectedDate: expectedFormatted,
      tone: days > 7 ? 'danger' : 'warning',
    };
  }, [allProjects, projectId]);

  const isPageLoading =
    projectId != null
    && projectId >= 0
    && (membersLoading || tasksLoading || featuresLoading);

  // Tasks scoped to the current project — feeds every per-member KPI calc.
  const projectTasks = useMemo(
    () =>
      projectId != null ? allTasks.filter(t => t.pjId === projectId) : [],
    [allTasks, projectId]
  );

  // Current team member IDs for filtering in the "Add Existing User" modal
  const currentTeamMemberIds = useMemo(
    () => new Set(members.map(m => m.id)),
    [members]
  );

  // Resolve the project name from the cached project list (filled by the
  // sidebar fetch). The URL provides the ID; the name follows.
  const projectName = useMemo(() => {
    const projects = getFromStorage<ProjectDTO[]>(STORAGE_KEYS.PROJECTS) ?? [];
    const match = projectId != null
      ? projects.find(p => p.pjId === projectId)
      : undefined;
    return match?.namePj
      ?? projects[0]?.namePj
      ?? 'Inventory Management System';
  }, [projectId]);

  // Member KPIs:
  //   - Demo projects (negative IDs) keep the per-id MOCK_MEMBER_KPIS table.
  //   - Real projects compute live from the project's tasks filtered by user.
  const selectedMember = members.find(m => m.id === selectedId) ?? null;
  const selectedKpis = useMemo<MemberKpis>(() => {
    if (!selectedMember) return EMPTY_MEMBER_KPIS;
    if (projectId != null && projectId < 0) {
      return MOCK_MEMBER_KPIS[selectedMember.id] ?? EMPTY_MEMBER_KPIS;
    }
    return computeMemberKpis(projectTasks, selectedMember.id);
  }, [selectedMember, projectId, projectTasks]);

  // Tasks assigned to the selected member in this project. Each task is
  // enriched with its parent feature name (if any) for context. Skipped
  // for demo projects so the mock UI stays untouched.
  const selectedTasks = useMemo<MemberTaskLite[] | undefined>(() => {
    if (!selectedMember) return undefined;
    if (projectId != null && projectId < 0) return undefined;

    const myTasks = projectTasks.filter(t => t.userId === selectedMember.id);
    if (myTasks.length === 0) return [];

    const featuresById = new Map(allFeatures.map(f => [f.featureId, f]));

    return myTasks
      .map<MemberTaskLite>(t => {
        const f = t.featureId != null ? featuresById.get(t.featureId) : undefined;
        return {
          id: t.taskId,
          name: t.nameTask ?? `Task #${t.taskId}`,
          description: t.infoTask,
          featureName: f?.nameFeature,
          priority: mapTaskPriority(t.priority) as MemberTaskPriority,
          storyPoints: t.storyPoints,
          done: t.dateEndRealTask != null,
        };
      })
      // Pending tasks on top, then by priority (high → low), then by name.
      // Lets the member see what still needs doing at a glance.
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (pDiff !== 0) return pDiff;
        return a.name.localeCompare(b.name);
      });
  }, [selectedMember, projectId, projectTasks, allFeatures]);

  const handleTaskClick = (taskId: number) => {
    const taskDTO = projectTasks.find(t => t.taskId === taskId);
    if (!taskDTO) return;

    // Get developer name if needed, though they clicked from selectedMember list so it's selectedMember.name
    const dev = members.find(m => m.id === taskDTO.userId);

    setSelectedTaskForModal({
      id: taskDTO.taskId,
      name: taskDTO.nameTask ?? `Task #${taskDTO.taskId}`,
      description: taskDTO.infoTask ?? null,
      storyPoints: taskDTO.storyPoints,
      priority: mapTaskPriority(taskDTO.priority) as MemberTaskPriority,
      developerName: dev?.name ?? 'Unassigned',
      state: taskDTO.dateEndRealTask ? 'Closed' : 'Active',
    });
  };

  const handleOpenAddMember = () => {
    setAddMemberError(null);
    setIsAddMemberModalOpen(true);
  };

  const handleCloseAddMember = () => {
    if (addMemberSubmitting) return;
    setAddMemberError(null);
    setIsAddMemberModalOpen(false);
  };

  const handleConfirmAddNewMember = async (data: NewTeamMemberData) => {
    if (projectId == null || projectId < 0) {
      setAddMemberError('Cannot add members to demo projects.');
      return;
    }

    setAddMemberSubmitting(true);
    setAddMemberError(null);

    try {
      // Check for duplicate email or telegram in existing users
      const emailLower = data.mail.trim().toLowerCase();
      const telegramLower = data.idTelegram.trim().toLowerCase();

      const duplicateEmail = allUsers.find(
        u => u.mail && u.mail.toLowerCase() === emailLower
      );
      const duplicateTelegram = allUsers.find(
        u => u.idTelegram.toLowerCase() === telegramLower
      );

      if (duplicateEmail && duplicateTelegram) {
        setAddMemberError(
          `Email and Telegram ID are already registered. User: ${duplicateEmail.nameUser}`
        );
        setAddMemberSubmitting(false);
        return;
      }

      if (duplicateEmail) {
        setAddMemberError(
          `Email is already registered to user: ${duplicateEmail.nameUser}`
        );
        setAddMemberSubmitting(false);
        return;
      }

      if (duplicateTelegram) {
        setAddMemberError(
          `Telegram ID is already registered to user: ${duplicateTelegram.nameUser}`
        );
        setAddMemberSubmitting(false);
        return;
      }

      const newUserPayload = {
        nameUser: data.nameUser,
        password: null,
        idTelegram: data.idTelegram,
        mail: data.mail,
        role: 'developer',
      };

      const userResponse = await fetch('/api/users-tt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserPayload),
      });
      if (!userResponse.ok) {
        throw new Error(`Failed to create user (${userResponse.status})`);
      }

      const createdUser = (await userResponse.json()) as UserDTO;

      const membershipResponse = await fetch(
        `/api/project-memberships?pjId=${projectId}&userId=${createdUser.userId}`,
        { method: 'POST' }
      );
      if (!membershipResponse.ok) {
        throw new Error(`Failed to add project membership (${membershipResponse.status})`);
      }

      setIsAddMemberModalOpen(false);
      setMembersRefreshToken(t => t + 1);
    } catch (error) {
      console.error('[TeamPage] add member failed', error);
      setAddMemberError('Could not add the new team member. Please check the data and try again.');
    } finally {
      setAddMemberSubmitting(false);
    }
  };

  const handleConfirmAddExistingMember = async (userId: number) => {
    if (projectId == null || projectId < 0) {
      setAddMemberError('Cannot add members to demo projects.');
      return;
    }

    // Defense-in-depth: even though the modal disables blocked users, we
    // re-check here in case the snapshot changed between render and submit
    // (e.g. another tab added the user to a different project meanwhile).
    const blockingProject = blockedUsersByActiveProject.get(userId);
    if (blockingProject) {
      setAddMemberError(
        `This user is already assigned to "${blockingProject}". A user can only belong to one active project at a time.`
      );
      return;
    }

    setAddMemberSubmitting(true);
    setAddMemberError(null);

    try {
      const membershipResponse = await fetch(
        `/api/project-memberships?pjId=${projectId}&userId=${userId}`,
        { method: 'POST' }
      );
      if (!membershipResponse.ok) {
        throw new Error(`Failed to add project membership (${membershipResponse.status})`);
      }

      setIsAddMemberModalOpen(false);
      setMembersRefreshToken(t => t + 1);
    } catch (error) {
      console.error('[TeamPage] add existing member failed', error);
      setAddMemberError('Could not add the user to the team. They may already be a member.');
    } finally {
      setAddMemberSubmitting(false);
    }
  };

  const handleOpenEditMember = () => {
    if (!selectedMember || projectId == null || projectId < 0) return;
    setEditMemberError(null);
    setIsEditMemberModalOpen(true);
  };

  const handleCloseEditMember = () => {
    if (editMemberSubmitting) return;
    setEditMemberError(null);
    setIsEditMemberModalOpen(false);
  };

  const handleConfirmEditMember = async (data: NewTeamMemberData) => {
    if (!selectedMember || projectId == null || projectId < 0) {
      setEditMemberError('Cannot edit members in demo projects.');
      return;
    }

    setEditMemberSubmitting(true);
    setEditMemberError(null);
    try {
      const payload: UserDTO = {
        userId: selectedMember.id,
        nameUser: data.nameUser,
        password: null,
        idTelegram: data.idTelegram,
        mail: data.mail,
        role: selectedMember.rawRole ?? 'developer',
      };

      const response = await fetch(`/api/users-tt/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to update user (${response.status})`);
      }

      setIsEditMemberModalOpen(false);
      setMembersRefreshToken(t => t + 1);
    } catch (error) {
      console.error('[TeamPage] edit member failed', error);
      setEditMemberError('Could not update team member data. Please try again.');
    } finally {
      setEditMemberSubmitting(false);
    }
  };

  const handleOpenDeleteMember = () => {
    if (!selectedMember || projectId == null || projectId < 0) return;
    setDeleteMemberError(null);
    setIsDeleteMemberModalOpen(true);
  };

  const handleCloseDeleteMember = () => {
    if (deleteMemberSubmitting) return;
    setDeleteMemberError(null);
    setIsDeleteMemberModalOpen(false);
  };

  const handleConfirmDeleteMember = async () => {
    if (!selectedMember || projectId == null || projectId < 0) {
      setDeleteMemberError('Cannot remove members in demo projects.');
      return;
    }

    setDeleteMemberSubmitting(true);
    setDeleteMemberError(null);
    try {
      const response = await fetch(
        `/api/project-memberships/project/${projectId}/user/${selectedMember.id}/with-tasks`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete member and tasks (${response.status})`);
      }

      setIsDeleteMemberModalOpen(false);
      setMembersRefreshToken(t => t + 1);
      setTasksRefreshToken(t => t + 1);
    } catch (error) {
      console.error('[TeamPage] delete member failed', error);
      setDeleteMemberError('Could not remove team member. Please try again.');
    } finally {
      setDeleteMemberSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-full px-6 py-8">
      <TaskDetailModal
        isOpen={selectedTaskForModal !== null}
        onClose={() => setSelectedTaskForModal(null)}
        task={selectedTaskForModal}
      />
      <AddOrSelectTeamMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={handleCloseAddMember}
        onConfirmNew={handleConfirmAddNewMember}
        onConfirmExisting={handleConfirmAddExistingMember}
        existingUsers={allUsers.map(u => ({
          userId: u.userId,
          nameUser: u.nameUser,
          mail: u.mail ?? undefined,
          idTelegram: u.idTelegram,
          role: u.role,
        }))}
        currentTeamMemberIds={currentTeamMemberIds}
        blockedUsersByActiveProject={blockedUsersByActiveProject}
        submitting={addMemberSubmitting}
        error={addMemberError}
      />
      <AddTeamMemberModal
        isOpen={isEditMemberModalOpen}
        onClose={handleCloseEditMember}
        onConfirm={handleConfirmEditMember}
        initialData={
          selectedMember
            ? {
              nameUser: selectedMember.name,
              idTelegram: selectedMember.telegram ?? '',
              mail: selectedMember.email,
            }
            : null
        }
        title="Edit Team Member"
        confirmLabel="Save Changes"
        submitting={editMemberSubmitting}
        error={editMemberError}
      />
      <ConfirmMemberDeleteModal
        isOpen={isDeleteMemberModalOpen}
        memberName={selectedMember?.name}
        onClose={handleCloseDeleteMember}
        onConfirm={handleConfirmDeleteMember}
        submitting={deleteMemberSubmitting}
        error={deleteMemberError}
      />

      {isPageLoading ? (
        <div className="container-main">
          <PageLoading
            title="Loading project team..."
            subtitle="Fetching members, tasks, and features to render the full view."
          />
        </div>
      ) : (
        <div className="container-main space-y-8">
          {/* Page header */}
          <header>
            <h1 className="heading-h2">
              {projectName} - Team
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage team members and track their KPIs
            </p>
          </header>

          {/* Project-level KPIs */}
          <section aria-labelledby="project-kpis-heading">
            <h2
              id="project-kpis-heading"
              className="flex items-center gap-3 text-xl font-bold text-gray-800 mb-4"
            >
              <span className="h-5 w-1 bg-brand rounded-full" aria-hidden="true" />
              Average Project KPIs
            </h2>
            {projectKpis.hasError && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                Some KPI metrics could not be loaded. Showing the values that were
                available; refresh the page to retry.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard
                label="Average Progress"
                value={
                  projectKpis.loading
                    ? '…'
                    : projectKpis.avgProgress != null
                      ? `${projectKpis.avgProgress.toFixed(0)}%`
                      : '—'
                }
                icon={ArrowTrendingUpIcon}
                tone="success"
              >
                {projectKpis.avgProgress != null ? (
                  <ProgressBar value={projectKpis.avgProgress} />
                ) : (
                  <p className="text-xs text-gray-500">
                    No completed tasks reported by any sprint yet.
                  </p>
                )}
              </KpiCard>

              <KpiCard
                label="Average Carryover Rate"
                value={
                  projectKpis.loading
                    ? '…'
                    : projectKpis.carryRate != null
                      ? `${projectKpis.carryRate.toFixed(0)}%`
                      : '—'
                }
                icon={ExclamationCircleIcon}
                tone="warning"
              >
                <p className="text-xs text-gray-500">
                  {projectKpis.sprintsCount > 0
                    ? `Average across ${projectKpis.sprintsCount} ${projectKpis.sprintsCount === 1 ? 'sprint' : 'sprints'
                    }`
                    : 'No sprints recorded yet.'}
                </p>
              </KpiCard>

              <KpiCard
                label="Average Task Delay"
                value={
                  projectKpis.loading
                    ? '…'
                    : projectKpis.worstSprintRework != null
                      ? `${projectKpis.worstSprintRework.toFixed(0)}%`
                      : '—'
                }
                icon={ExclamationCircleIcon}
                tone="danger"
              >
                <p className="text-xs text-gray-500">
                  {projectKpis.sprintsCount > 0
                    ? `${projectKpis.delayedSprintsCount} of ${projectKpis.sprintsCount} ${projectKpis.sprintsCount === 1 ? 'sprint' : 'sprints'
                    } had delays`
                    : 'No sprints recorded yet.'}
                </p>
              </KpiCard>

              <KpiCard
                label="Average Cycle Time"
                value={
                  avgCycleTimeDays == null
                    ? '—'
                    : `${avgCycleTimeDays.toFixed(1)} ${avgCycleTimeDays === 1 ? 'day' : 'days'
                    }`
                }
                icon={ClockIcon}
                tone="info"
              >
                {avgCycleTimeDays != null ? (
                  <Sparkline />
                ) : (
                  <p className="text-xs text-gray-500">
                    Tracked once tasks have both a start and a real end date.
                  </p>
                )}
              </KpiCard>

              <KpiCard
                label="Project Delay"
                value={projectDelayInfo?.label ?? '—'}
                icon={CalendarDaysIcon}
                tone={projectDelayInfo?.tone ?? 'info'}
              >
                <p className="text-xs text-gray-500">
                  {projectDelayInfo?.expectedDate
                    ? `Expected date: ${projectDelayInfo.expectedDate}`
                    : 'No planned end date set.'}
                </p>
              </KpiCard>
            </div>
          </section>

          {/* Members section */}
          <section
            aria-labelledby="members-heading"
            className="section-card"
          >
            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
              <h2
                id="members-heading"
                className="heading-h4"
              >
                Team Members
              </h2>

              <button
                type="button"
                onClick={handleOpenAddMember}
                disabled={projectId == null || projectId < 0}
                className="px-4 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm
                         hover:bg-brand-dark transition-colors disabled:opacity-60"
              >
                Add Team Member
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
              {/* Left: members list */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserGroupIcon
                    className="h-5 w-5 text-gray-700"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-gray-800">
                    Members ({members.length})
                  </span>
                </div>
                {members.length === 0 ? (
                  <p className="text-sm text-gray-400 px-1">
                    No members yet in this project.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {members.map(m => (
                      <MemberListItem
                        key={m.id}
                        name={m.name}
                        role={m.role}
                        selected={m.id === selectedId}
                        avatarTone={m.avatarTone}
                        onSelect={() => setSelectedId(m.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: selected member detail */}
              {selectedMember ? (
                <MemberDetailPanel
                  member={selectedMember}
                  kpis={selectedKpis}
                  tasks={selectedTasks}
                  onEdit={handleOpenEditMember}
                  onDelete={handleOpenDeleteMember}
                  onTaskClick={handleTaskClick}
                />
              ) : (
                <p className="text-sm text-gray-400 self-center text-center">
                  Select a member to view details.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
