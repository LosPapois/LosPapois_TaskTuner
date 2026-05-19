import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronDownIcon,
  PlusIcon,
  XCircleIcon,
  PlayCircleIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  EllipsisVerticalIcon,
  Cog6ToothIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import TeamMemberKPIs from '../Components/TeamMemberKPIs';
import CloseProjectModal from '../Components/Common/CloseProjectModal';
import DeleteProjectModal from '../Components/Common/DeleteProjectModal';
import { saveToStorage, getFromStorage, removeFromStorage, STORAGE_KEYS } from '../Utils/storage';
import { toast } from '../Utils/toast';

const mockMemberKPIs = {
  member: { name: 'Ana Ramírez', role: 'Frontend Developer' },
  progress: { value: 6, total: 8 },
  carryover: { value: 2, total: 8 },
  delayed: { value: 1, total: 8 },
  velocity: { storyPoints: 21 },
};

type ProjectDTO = {
  pjId: number;
  namePj: string;
  dateStartPj: string | null;
  dateEndSetPj: string | null;
  dateEndRealPj: string | null;
  autoRollover: boolean;
  autoCloseSprints: boolean;
};

type SprintDTO = {
  sprId: number;
  nameSprint: string;
  dateStartSpr: string | null;
  dateEndSpr: string | null;
  taskGoal: number | null;
  stateSprint: string;
  pjId: number;
};

type SprintMetrics = {
  sprintId: number;
  totalPoints: number;
  taskCount: number;
};

type Project = {
  id: number;
  name: string;
  autoRollover: boolean;
  autoCloseSprints: boolean;
  dateStartPj: string | null;
  dateEndSetPj: string | null;
};

type Sprint = { id: number; name: string; endDate: string; taskCount: number };

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toProject(p: ProjectDTO): Project {
  return {
    id: p.pjId,
    name: p.namePj,
    autoRollover: p.autoRollover ?? false,
    autoCloseSprints: p.autoCloseSprints ?? false,
    dateStartPj: p.dateStartPj,
    dateEndSetPj: p.dateEndSetPj,
  };
}

// ─── New Project Modal ────────────────────────────────────────────────────────

function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, endDate: string, autoRollover: boolean) => Promise<void>;
}) {
  const [projectName, setProjectName] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRollover, setAutoRollover] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!projectName.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(projectName.trim(), endDate, autoRollover);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl shadow-brand-dark/30">
        <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>

        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Project Name</label>
            <input
              type="text"
              placeholder="E.g.: Management System"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-800 placeholder-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand-lighter"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Expected End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-800 placeholder-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand-lighter"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Auto Rollover</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Incomplete tasks move to next sprint automatically
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoRollover((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                autoRollover ? 'bg-brand' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={autoRollover}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoRollover ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting || !projectName.trim()}
            className="flex-1 rounded-xl bg-brand py-3 text-base font-semibold text-white shadow-md shadow-brand/25 hover:bg-brand-dark disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Project Modal (Settings) ───────────────────────────────────────────

function EditProjectModal({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: (name: string, autoRollover: boolean, autoCloseSprints: boolean) => Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [autoRollover, setAutoRollover] = useState(project.autoRollover);
  const [closeSprints, setCloseSprints] = useState(project.autoCloseSprints);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSave(name.trim(), autoRollover, closeSprints);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl shadow-brand-dark/30">
        <h2 className="text-2xl font-bold text-gray-900">Project Settings</h2>

        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand-lighter"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Auto Rollover</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Incomplete tasks move to next sprint automatically
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoRollover((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                autoRollover ? 'bg-brand' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={autoRollover}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoRollover ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Auto Close Sprints</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Sprints close automatically when their end date passes
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCloseSprints((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                closeSprints ? 'bg-brand' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={closeSprints}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  closeSprints ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || !name.trim()}
            className="flex-1 rounded-xl bg-brand py-3 text-base font-semibold text-white shadow-md shadow-brand/25 hover:bg-brand-dark disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Sprint Modal ─────────────────────────────────────────────────────────

function NewSprintModal({
  currentSprint,
  onClose,
  onStart,
}: {
  currentSprint: Sprint | null;
  onClose: () => void;
  onStart: (durationDays: number) => Promise<void>;
}) {
  const [duration, setDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const nextSprintNumber = currentSprint ? currentSprint.id + 1 : 1;

  async function handleStart() {
    const n = parseInt(duration, 10);
    if (!n || n <= 0) return;
    setSubmitting(true);
    try {
      await onStart(n);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl shadow-brand-dark/30">
        <h2 className="text-2xl font-bold text-gray-900">Start New Sprint</h2>

        <p className="mt-3 text-base text-gray-500">
          {currentSprint
            ? `Starting Sprint ${nextSprintNumber} for this project.`
            : 'No active sprint. A new sprint will be started.'}
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Sprint Duration (days)
            </label>
            <input
              type="number"
              placeholder="E.g.: 14"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-800 placeholder-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand-lighter"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={submitting || !duration}
            className="flex-1 rounded-xl bg-brand py-3 text-base font-semibold text-white shadow-md shadow-brand/25 hover:bg-brand-dark disabled:opacity-50"
          >
            {submitting ? 'Starting…' : 'Start Sprint'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);
  const [metrics, setMetrics] = useState<SprintMetrics | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadProjects = useCallback(async (): Promise<Project[]> => {
    // Scope the project list to the logged-in user, then filter to the
    // open ones (no real end date) client-side so this page only ever
    // shows the user's own active projects.
    const currentUser = getFromStorage<{ userId?: number }>(STORAGE_KEYS.USER);
    if (!currentUser?.userId) {
      setProjects([]);
      return [];
    }
    const res = await fetch(`/api/projects/user/${currentUser.userId}`);
    if (!res.ok) throw new Error(`GET /api/projects/user → ${res.status}`);
    const data: ProjectDTO[] = await res.json();
    const mapped = data
      .filter(p => !p.dateEndRealPj)
      .map(toProject);
    setProjects(mapped);
    return mapped;
  }, []);

  const loadActiveSprint = useCallback(async (pjId: number) => {
    setCurrentSprint(null);
    setMetrics(null);
    const res = await fetch(`/api/sprints/project/${pjId}/active`);
    if (res.status === 404) return;
    if (!res.ok) throw new Error(`GET active sprint → ${res.status}`);
    const s: SprintDTO = await res.json();
    setCurrentSprint({
      id: s.sprId,
      name: s.nameSprint,
      endDate: formatDate(s.dateEndSpr),
      taskCount: 0,
    });

    const mRes = await fetch(`/api/sprints/${s.sprId}/metrics`);
    if (mRes.ok) {
      const m: SprintMetrics = await mRes.json();
      setMetrics(m);
      setCurrentSprint((prev) => (prev ? { ...prev, taskCount: m.taskCount } : prev));
    }
  }, []);

  useEffect(() => {
    loadProjects()
      .then((list) => {
        if (list.length === 0) return;
        const savedId = getFromStorage<number>(STORAGE_KEYS.CURRENT_PROJECT);
        const match = savedId != null ? list.find((p) => p.id === savedId) : undefined;
        setSelectedProject(match ?? list[0]);
      })
      .catch((e) => setError(e.message));
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProject) {
      saveToStorage(STORAGE_KEYS.CURRENT_PROJECT, selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject) return;
    loadActiveSprint(selectedProject.id).catch((e) => setError(e.message));
  }, [selectedProject, loadActiveSprint]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleCreateProject(name: string, endDate: string, autoRollover: boolean) {
    const body: Partial<ProjectDTO> = {
      namePj: name,
      dateStartPj: new Date().toISOString().slice(0, 10),
      dateEndSetPj: endDate || null,
      autoRollover,
    };
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast(`Failed to create project`, 'error');
      throw new Error(`POST /api/projects → ${res.status}`);
    }
    const created: ProjectDTO = await res.json();
    const list = await loadProjects();
    const match = list.find((p) => p.id === created.pjId);
    if (match) setSelectedProject(match);
    toast(`Project "${name}" created`);
  }

  async function handleSaveSettings(name: string, autoRollover: boolean, autoCloseSprints: boolean) {
    if (!selectedProject) return;
    const res = await fetch(`/api/projects/${selectedProject.id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namePj: name, autoRollover, autoCloseSprints }),
    });
    if (!res.ok) {
      toast('Failed to save settings', 'error');
      throw new Error(`PATCH /api/projects/settings → ${res.status}`);
    }
    const list = await loadProjects();
    const updated = list.find((p) => p.id === selectedProject.id);
    if (updated) setSelectedProject(updated);
    toast('Project settings saved');
  }

  async function handleStartSprint(durationDays: number) {
    if (!selectedProject) return;
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + durationDays);
    const nextNum = currentSprint ? currentSprint.id + 1 : 1;
    const body: Partial<SprintDTO> = {
      nameSprint: `Sprint ${nextNum}`,
      dateStartSpr: start.toISOString().slice(0, 10),
      dateEndSpr: end.toISOString().slice(0, 10),
      stateSprint: 'active',
      pjId: selectedProject.id,
      taskGoal: 0,
    };
    const res = await fetch('/api/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST /api/sprints → ${res.status}`);
    const newSprint: SprintDTO = await res.json();

    await loadActiveSprint(selectedProject.id);
    toast(`${newSprint.nameSprint} started`);
  }

  const progressPct = 0;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Project selector + three-dots menu */}
          <div className="flex flex-1 max-w-2xl items-center gap-2">
            <div className="relative flex-1" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={projects.length === 0}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-left text-lg font-semibold text-gray-800 shadow-md shadow-brand/10 hover:shadow-lg hover:shadow-brand/15 transition-shadow disabled:opacity-60"
              >
                {selectedProject ? selectedProject.name : 'No projects yet'}
                <ChevronDownIcon
                  className={`size-5 text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {dropdownOpen && projects.length > 0 && (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-100 bg-white py-2 shadow-xl shadow-brand-dark/15">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setDropdownOpen(false);
                      }}
                      className={`block w-full px-5 py-3 text-left text-base hover:bg-brand-lighter ${
                        selectedProject?.id === project.id
                          ? 'bg-brand-lighter font-semibold text-brand-dark'
                          : 'text-gray-700'
                      }`}
                    >
                      {project.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Three-dots menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                disabled={!selectedProject}
                className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-3 shadow-md shadow-brand/10 hover:shadow-lg hover:shadow-brand/15 transition-shadow disabled:opacity-40"
                aria-label="Project options"
              >
                <EllipsisVerticalIcon className="size-5 text-gray-600" />
              </button>

              {menuOpen && selectedProject && (
                <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-gray-100 bg-white py-2 shadow-xl shadow-brand-dark/15">
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      // Re-fetch fresh project data so settings modal shows DB value
                      if (selectedProject) {
                        try {
                          const r = await fetch(`/api/projects/${selectedProject.id}`);
                          if (r.ok) {
                            const p = await r.json();
                            setSelectedProject(prev => prev ? { ...prev, autoRollover: p.autoRollover ?? false, autoCloseSprints: p.autoCloseSprints ?? false } : prev);
                          }
                        } catch { /* use cached value */ }
                      }
                      setShowSettings(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-lighter"
                  >
                    <Cog6ToothIcon className="size-4 text-gray-500" />
                    Project Settings
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setShowCloseModal(true); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-lighter"
                  >
                    <XCircleIcon className="size-4 text-orange-500" />
                    Close Project
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={() => { setMenuOpen(false); setShowDeleteModal(true); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="size-4" />
                    Delete Project
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-md shadow-brand/25 hover:bg-brand-dark"
            >
              <PlusIcon className="size-5" />
              New Project
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-lg shadow-brand/10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentSprint ? currentSprint.name : 'No active sprint'}
            </h2>
            <div className="mt-2 flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <CalendarDaysIcon className="size-4" />
                Ends: {currentSprint ? currentSprint.endDate : '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <ChartBarIcon className="size-4" />
                {currentSprint ? currentSprint.taskCount : 0} tasks
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowNewSprint(true)}
            disabled={!selectedProject}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-md shadow-brand/25 hover:bg-brand-dark disabled:opacity-50"
          >
            <PlayCircleIcon className="size-5" />
            Start New Sprint
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-lg shadow-brand/10 hover:shadow-xl hover:shadow-brand/15 transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Sprint Progress</span>
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-lighter">
                <ChartBarIcon className="size-5 text-brand" />
              </span>
            </div>
            <p className="mt-2 text-4xl font-bold text-gray-900">{progressPct}%</p>
            <p className="mt-1 text-sm text-gray-500">
              {metrics ? `${metrics.totalPoints} story points` : 'No metrics yet'}
            </p>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-lg shadow-brand/10 hover:shadow-xl hover:shadow-brand/15 transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Cycle Time</span>
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-lighter">
                <ClockIcon className="size-5 text-secondary" />
              </span>
            </div>
            <p className="mt-2 text-4xl font-bold text-gray-900">—</p>
            <p className="mt-1 text-sm text-gray-500">Average per completed task</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="size-5 text-brand-dark" />
            <h2 className="text-lg font-semibold text-gray-800">Team Performance</h2>
            <span className="text-sm text-gray-400">— individual KPIs for the active sprint</span>
          </div>

          <TeamMemberKPIs
            member={mockMemberKPIs.member}
            sprintLabel={currentSprint?.name}
            progress={mockMemberKPIs.progress}
            carryover={mockMemberKPIs.carryover}
            delayed={mockMemberKPIs.delayed}
            velocity={mockMemberKPIs.velocity}
          />
        </div>

      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreateProject}
        />
      )}
      {showNewSprint && (
        <NewSprintModal
          currentSprint={currentSprint}
          onClose={() => setShowNewSprint(false)}
          onStart={handleStartSprint}
        />
      )}
      {showSettings && selectedProject && (
        <EditProjectModal
          project={selectedProject}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )}
      {showCloseModal && selectedProject && (
        <CloseProjectModal
          isOpen={showCloseModal}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => setShowCloseModal(false)}
          onClosed={async () => {
            setShowCloseModal(false);
            const list = await loadProjects();
            const next = list[0] ?? null;
            setSelectedProject(next);
            if (!next) removeFromStorage(STORAGE_KEYS.CURRENT_PROJECT);
          }}
        />
      )}
      {showDeleteModal && selectedProject && (
        <DeleteProjectModal
          isOpen={showDeleteModal}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={async () => {
            setShowDeleteModal(false);
            const list = await loadProjects();
            const next = list[0] ?? null;
            setSelectedProject(next);
            if (!next) removeFromStorage(STORAGE_KEYS.CURRENT_PROJECT);
          }}
        />
      )}
    </div>
  );
}
