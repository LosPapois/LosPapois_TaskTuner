import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  EllipsisVerticalIcon,
  FolderIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import SidebarItem from './SidebarItem';
import SidebarSectionLabel from './SidebarSectionLabel';
import CloseProjectModal from '../Common/CloseProjectModal';
import DeleteProjectModal from '../Common/DeleteProjectModal';
import {
  getFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from '../../Utils/storage';
import { toast } from '../../Utils/toast';

export interface SprintLite {
  id: number;
  name: string;
}

export interface SidebarProjectGroupProps {
  projectId: number;
  projectName: string;
  autoRollover?: boolean;
  autoCloseSprints?: boolean;
  defaultOpen?: boolean;
  onAddSprint?: (projectId: number) => void;
  refreshToken?: number;
  onProjectClosed?: (projectId: number) => void;
  onProjectDeleted?: (projectId: number) => void;
  onProjectUpdated?: (projectId: number, name: string, autoRollover: boolean, autoCloseSprints: boolean) => void;
}

interface SprintDTO {
  sprId: number;
  nameSprint: string;
  dateStartSpr: string | null;
}

const MOCK_SPRINTS: SprintLite[] = [
  { id: 1, name: 'Sprint 1' },
  { id: 2, name: 'Sprint 2' },
  { id: 3, name: 'Sprint 3' },
];

const sprintsCacheKey = (projectId: number) =>
  `${STORAGE_KEYS.SPRINTS}_${projectId}`;

// ─── Inline Settings Modal ────────────────────────────────────────────────────

function ProjectSettingsModal({
  projectName,
  autoRollover,
  autoCloseSprints,
  onClose,
  onSave,
}: {
  projectName: string;
  autoRollover: boolean;
  autoCloseSprints: boolean;
  onClose: () => void;
  onSave: (name: string, autoRollover: boolean, autoCloseSprints: boolean) => Promise<void>;
}) {
  const [name, setName] = useState(projectName);
  const [rollover, setRollover] = useState(autoRollover);
  const [closeSprints, setCloseSprints] = useState(autoCloseSprints);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSave(name.trim(), rollover, closeSprints);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
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
              onClick={() => setRollover((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                rollover ? 'bg-brand' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={rollover}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  rollover ? 'translate-x-5' : 'translate-x-0'
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

// ─── Main Component ───────────────────────────────────────────────────────────

function SidebarProjectGroup({
  projectId,
  projectName,
  autoRollover = false,
  autoCloseSprints = false,
  defaultOpen = false,
  onAddSprint,
  refreshToken = 0,
  onProjectClosed,
  onProjectDeleted,
  onProjectUpdated,
}: SidebarProjectGroupProps) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [liveAutoRollover, setLiveAutoRollover] = useState<boolean>(autoRollover);
  const [liveAutoCloseSprints, setLiveAutoCloseSprints] = useState<boolean>(autoCloseSprints);

  // Sync whenever parent prop changes (e.g. after save updates Sidebar state)
  useEffect(() => { setLiveAutoRollover(autoRollover); }, [autoRollover]);
  useEffect(() => { setLiveAutoCloseSprints(autoCloseSprints); }, [autoCloseSprints]);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [sprints, setSprints] = useState<SprintLite[]>(() => {
    if (projectId < 0) return MOCK_SPRINTS;
    return getFromStorage<SprintLite[]>(sprintsCacheKey(projectId)) ?? [];
  });

  useEffect(() => {
    if (projectId < 0) return;
    let cancelled = false;
    fetch(`/api/sprints/project/${projectId}`)
      .then(res => (res.ok ? res.json() : null))
      .then((data: SprintDTO[] | null) => {
        if (cancelled || !data) return;
        const sorted = [...data].sort((a, b) => {
          const aTime = a.dateStartSpr ? new Date(a.dateStartSpr).getTime() : Infinity;
          const bTime = b.dateStartSpr ? new Date(b.dateStartSpr).getTime() : Infinity;
          return aTime - bTime;
        });
        const mapped = sorted.map<SprintLite>(s => ({ id: s.sprId, name: s.nameSprint }));
        setSprints(mapped);
        saveToStorage(sprintsCacheKey(projectId), mapped);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectId, refreshToken]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        menuBtnRef.current && !menuBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setMenuPos(null);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const toggle = useCallback(() => setIsOpen(o => !o), []);
  const handleAddSprint = useCallback(() => { onAddSprint?.(projectId); }, [onAddSprint, projectId]);

  async function handleSaveSettings(name: string, rollover: boolean, closeSprints: boolean) {
    const res = await fetch(`/api/projects/${projectId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namePj: name, autoRollover: rollover, autoCloseSprints: closeSprints }),
    });
    if (!res.ok) {
      toast('Failed to save changes', 'error');
      throw new Error(`PATCH /api/projects/settings failed: ${res.status}`);
    }
    toast('Project settings saved');
    setLiveAutoRollover(rollover);
    setLiveAutoCloseSprints(closeSprints);
    onProjectUpdated?.(projectId, name, rollover, closeSprints);
  }

  return (
    <div>
      {/* Project header row */}
      <div className="flex items-center w-full group/row">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium
                     text-gray-700 hover:bg-brand-lighter hover:text-brand-dark
                     transition-colors text-left"
        >
          <ChevronRightIcon
            className={`size-4 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
          <FolderIcon className="size-5 shrink-0" aria-hidden="true" />
          <span className="truncate">{projectName}</span>
        </button>

        {/* Three-dots button — portal dropdown escapes sidebar overflow-hidden */}
        {projectId > 0 && (
          <div className="shrink-0 mr-1">
            <button
              ref={menuBtnRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (menuOpen) {
                  setMenuOpen(false);
                  setMenuPos(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuPos({ top: rect.bottom + 4, left: rect.left });
                  setMenuOpen(true);
                }
              }}
              className="flex items-center justify-center rounded-md p-1
                         text-gray-400 hover:text-gray-700 hover:bg-gray-100
                         opacity-0 group-hover/row:opacity-100 focus:opacity-100
                         transition-opacity"
              aria-label="Project options"
            >
              <EllipsisVerticalIcon className="size-4" />
            </button>

            {menuOpen && menuPos && createPortal(
              <div
                ref={menuRef}
                style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
                className="w-52 rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl shadow-gray-200/80"
              >
                <button
                  onClick={async () => {
                    setMenuOpen(false); setMenuPos(null);
                    // Fetch fresh value from DB so modal shows current state, not cached prop
                    try {
                      const r = await fetch(`/api/projects/${projectId}`);
                      if (r.ok) {
                        const p = await r.json();
                        setLiveAutoRollover(p.autoRollover ?? false);
                        setLiveAutoCloseSprints(p.autoCloseSprints ?? false);
                      }
                    } catch {
                      setLiveAutoRollover(autoRollover);
                      setLiveAutoCloseSprints(autoCloseSprints);
                    }
                    setShowSettings(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-brand-lighter"
                >
                  <Cog6ToothIcon className="size-4 text-gray-500" />
                  Project Settings
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setMenuPos(null); setShowCloseModal(true); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50"
                >
                  <XCircleIcon className="size-4 text-orange-500" />
                  Close Project
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { setMenuOpen(false); setMenuPos(null); setShowDeleteModal(true); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <TrashIcon className="size-4" />
                  Delete Project
                </button>
              </div>,
              document.body
            )}
          </div>
        )}
      </div>

      {/* Children — Team + SPRINTS list */}
      {isOpen && (
        <div className="ml-4 mt-1 mb-1 border-l border-gray-100 pl-2 space-y-0.5">
          <SidebarItem icon={UserGroupIcon} label="Team" to={`/projects/${projectId}/team`} dense />
          <SidebarItem icon={ChartBarIcon} label="Statistics" to={`/projects/${projectId}/statistics`} dense />
          <SidebarSectionLabel>Sprints</SidebarSectionLabel>

          {sprints.length === 0 ? (
            <p className="px-3 py-1.5 text-xs text-gray-400">No sprints yet</p>
          ) : (
            sprints.map(s => (
              <SidebarItem
                key={s.id}
                icon={CalendarDaysIcon}
                label={s.name}
                to={`/projects/${projectId}/sprints/${s.id}`}
                dense
              />
            ))
          )}

          <button
            type="button"
            onClick={handleAddSprint}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm font-medium
                       text-brand-dark hover:bg-brand-lighter transition-colors text-left"
          >
            <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">Add Sprint</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {showSettings && (
        <ProjectSettingsModal
          projectName={projectName}
          autoRollover={liveAutoRollover}
          autoCloseSprints={liveAutoCloseSprints}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )}
      <CloseProjectModal
        isOpen={showCloseModal}
        projectId={projectId}
        projectName={projectName}
        onClose={() => setShowCloseModal(false)}
        onClosed={() => {
          setShowCloseModal(false);
          onProjectClosed?.(projectId);
        }}
      />
      <DeleteProjectModal
        isOpen={showDeleteModal}
        projectId={projectId}
        projectName={projectName}
        onClose={() => setShowDeleteModal(false)}
        onDeleted={() => {
          setShowDeleteModal(false);
          onProjectDeleted?.(projectId);
        }}
      />
    </div>
  );
}

export default React.memo(SidebarProjectGroup);
