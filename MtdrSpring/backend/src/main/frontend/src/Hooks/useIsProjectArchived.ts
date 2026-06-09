import { useEffect, useState } from 'react';
import { getFromStorage, STORAGE_KEYS } from '../Utils/storage';

interface ProjectLite {
  pjId: number;
  dateEndRealPj?: string | null;
}

/**
 * Returns true when the given project has been finalized (archived).
 *
 * Reads from the cached project list (filled by Sidebar / HomePage) for
 * instant resolution. Re-fetches from /api/projects/{id} as a fallback when
 * the cache hasn't been seeded yet (e.g. direct deep-link to an archived
 * project URL without visiting Home first).
 *
 * Pages use this to flip into read-only mode: every Add/Edit/Delete control
 * stays rendered but is visually muted and disabled so the user can still
 * tell *what* could be done, while making clear that the project is closed.
 */
export default function useIsProjectArchived(projectId: number | undefined): boolean {
  const [archived, setArchived] = useState<boolean>(() => {
    if (projectId == null || projectId < 0) return false;
    const projects = getFromStorage<ProjectLite[]>(STORAGE_KEYS.PROJECTS) ?? [];
    const match = projects.find(p => p.pjId === projectId);
    return match?.dateEndRealPj != null && match.dateEndRealPj !== '';
  });

  useEffect(() => {
    if (projectId == null || projectId < 0) {
      setArchived(false);
      return;
    }

    // Re-check cache when projectId changes.
    const projects = getFromStorage<ProjectLite[]>(STORAGE_KEYS.PROJECTS) ?? [];
    const cached = projects.find(p => p.pjId === projectId);
    if (cached) {
      setArchived(cached.dateEndRealPj != null && cached.dateEndRealPj !== '');
      return;
    }

    // Cache miss — fetch directly. Defensive, since most navigations go
    // through Sidebar/Home which warm the cache first.
    let cancelled = false;
    fetch(`/api/projects/${projectId}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: ProjectLite | null) => {
        if (cancelled || !data) return;
        setArchived(data.dateEndRealPj != null && data.dateEndRealPj !== '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return archived;
}
