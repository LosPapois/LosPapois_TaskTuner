import { useEffect, useState } from 'react';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../Utils/storage';

// ─────────────────────────────────────────────────────────────────────────────
// Backend response shapes — the KPI endpoints return generic Map<String,Object>
// from Spring, but the SQL queries in KpisRepository use stable column aliases
// that we mirror here. If the column aliases ever change, update these types.
// ─────────────────────────────────────────────────────────────────────────────

interface VelocityMetric {
  finished_sprints: number | null;
  avg_velocity: number | null;
}

interface SprintRework {
  sprint: string;
  carried_points: number | null;    // Count of tasks carried over from previous sprint
  total_points: number | null;      // Total task count in this sprint
  carryover_rate: number | null;    // Percentage of tasks carried over (0–100)
  delayed_points: number | null;    // Count of tasks completed after planned end date
}

interface SprintCompletion {
  sprint: string;
  completed_weight: number | null;
  total_weight: number | null;
  pct_weighted: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public hook contract
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectKpis {
  loading: boolean;
  /** Did at least one of the underlying fetches fail? Cards still render with the
   *  partial data we did get; this just lets the page surface a soft warning. */
  hasError: boolean;
  /** Average pct_weighted across all sprints (0–100). null when no data. */
  avgProgress: number | null;
  /** Average carryover rate across all sprints (0–100).
   *  = average percentage of tasks carried over from previous sprints per sprint. */
  carryRate: number | null;
  /** Average task delay rate across all sprints (0–100). null when no data. */
  delayRate: number | null;
  /** Highest carryover_rate among the project's sprints (0–100). null when no data. */
  worstSprintRework: number | null;
  /** Number of sprints with delays. */
  delayedSprintsCount: number;
  /** Total number of sprints reported by the completitud endpoint. */
  sprintsCount: number;
  /** From kpis/project-velocity — weighted points per day, project-wide avg. */
  avgVelocity: number | null;
  /** Number of sprints with state='done' according to project-velocity. */
  finishedSprints: number | null;
}

const EMPTY: ProjectKpis = {
  loading: false,
  hasError: false,
  avgProgress: null,
  carryRate: null,
  delayRate: null,
  worstSprintRework: null,
  delayedSprintsCount: 0,
  sprintsCount: 0,
  avgVelocity: null,
  finishedSprints: null,
};

/** Per-project cache key — mirrors the pattern used by SPRINTS in HomePage. */
const cacheKey = (projectId: number) =>
  `${STORAGE_KEYS.PROJECT_KPIS}_${projectId}`;

/** Strip transient flags before persisting; loading/error are runtime only. */
function toCacheable(state: ProjectKpis): Omit<ProjectKpis, 'loading' | 'hasError'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { loading, hasError, ...rest } = state;
  return rest;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches and aggregates the project-level KPIs exposed by KpisController:
 *
 *   /api/projects/{pjId}/kpis/project-velocity   — single object
 *   /api/projects/{pjId}/kpis/retrabajo          — list per sprint
 *   /api/projects/{pjId}/kpis/completitud        — list per sprint
 *
 * Aggregates to plain numbers ready for the KPI cards. Returns nulls when the
 * endpoint replies with empty data so the cards can render an "—" placeholder
 * instead of a misleading 0.
 *
 * Negative projectIds (used for offline mock projects) skip all fetches and
 * return the EMPTY shape so demo views don't surface phantom errors.
 */
export default function useProjectKpis(projectId: number | undefined): ProjectKpis {
  // Seed from per-project cache for instant paint (consistent with the rest
  // of the app — sidebar, HomePage, TeamPage, etc. all do this). When no
  // cache exists, start from EMPTY and flip loading=true so the cards show
  // a placeholder until the first fetch returns.
  const [state, setState] = useState<ProjectKpis>(() => {
    if (projectId == null || projectId < 0) return EMPTY;
    const cached = getFromStorage<Omit<ProjectKpis, 'loading' | 'hasError'>>(
      cacheKey(projectId)
    );
    if (cached) {
      // Refresh in background but show cached values immediately.
      return { ...cached, loading: true, hasError: false };
    }
    return { ...EMPTY, loading: true };
  });

  useEffect(() => {
    if (projectId == null || projectId < 0) {
      setState(EMPTY);
      return;
    }

    // When the projectId changes between renders, re-seed from that
    // project's cache so we don't show the previous project's numbers.
    const cached = getFromStorage<Omit<ProjectKpis, 'loading' | 'hasError'>>(
      cacheKey(projectId)
    );
    if (cached) {
      setState({ ...cached, loading: true, hasError: false });
    } else {
      setState({ ...EMPTY, loading: true });
    }

    let cancelled = false;

    Promise.allSettled([
      fetch(`/api/projects/${projectId}/kpis/project-velocity`).then(r =>
        r.ok ? (r.json() as Promise<VelocityMetric>) : Promise.reject(r.status)
      ),
      fetch(`/api/projects/${projectId}/kpis/retrabajo`).then(r =>
        r.ok ? (r.json() as Promise<SprintRework[]>) : Promise.reject(r.status)
      ),
      fetch(`/api/projects/${projectId}/kpis/completitud`).then(r =>
        r.ok ? (r.json() as Promise<SprintCompletion[]>) : Promise.reject(r.status)
      ),
    ]).then(results => {
      if (cancelled) return;

      const [velocityRes, reworkRes, completionRes] = results;
      const hasError = results.some(r => r.status === 'rejected');

      const velocity =
        velocityRes.status === 'fulfilled' ? velocityRes.value : null;
      const rework =
        reworkRes.status === 'fulfilled' ? reworkRes.value : [];
      const completion =
        completionRes.status === 'fulfilled' ? completionRes.value : [];

      // ── Aggregations ─────────────────────────────────────────────────────
      const completionWithData = completion.filter(s => s.pct_weighted != null);
      const avgProgress =
        completionWithData.length > 0
          ? completionWithData.reduce((sum, s) => sum + (s.pct_weighted ?? 0), 0) /
            completionWithData.length
          : null;

      const reworkWithData = rework.filter(s => s.carryover_rate != null);
      
      // Average carryover rate across all sprints
      const carryRate =
        reworkWithData.length > 0
          ? reworkWithData.reduce((sum, s) => sum + (s.carryover_rate ?? 0), 0) /
            reworkWithData.length
          : null;

      // Highest carryover rate in any single sprint
      const worstSprintRework =
        reworkWithData.length > 0
          ? Math.max(...reworkWithData.map(s => s.carryover_rate ?? 0))
          : null;

      // Number of sprints with any carryover
      const delayedSprintsCount = reworkWithData.filter(
        s => (s.carryover_rate ?? 0) > 0
      ).length;

      // Calculate delay rate: average percentage of tasks delayed across all sprints
      const delayRate =
        reworkWithData.length > 0
          ? reworkWithData.reduce((sum, s) => {
              const sprintDelayRate = s.total_points && s.total_points > 0
                ? (s.delayed_points ?? 0) / s.total_points * 100
                : 0;
              return sum + sprintDelayRate;
            }, 0) / reworkWithData.length
          : null;

      const next: ProjectKpis = {
        loading: false,
        hasError,
        avgProgress,
        carryRate,
        delayRate,
        worstSprintRework,
        delayedSprintsCount,
        sprintsCount: completion.length,
        avgVelocity: velocity?.avg_velocity ?? null,
        finishedSprints: velocity?.finished_sprints ?? null,
      };

      setState(next);

      // Only persist when at least one underlying request succeeded —
      // otherwise we'd overwrite a previously-good cache with empty data
      // just because the network blipped.
      if (!hasError || velocity != null || rework.length > 0 || completion.length > 0) {
        saveToStorage(cacheKey(projectId), toCacheable(next));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return state;
}
