/**
 * Versioned localStorage helpers.
 *
 * Every value is stored as a JSON envelope:
 *   { data: T, timestamp: number, version: number }
 *
 * The `timestamp` and `version` fields are reserved for future cache-busting
 * strategies (e.g. TTL invalidation or schema migrations). All reads and
 * writes go through `getFromStorage` / `saveToStorage` so this detail stays
 * internal to this module.
 */

interface StorageOptions {
  key: string;
  version?: number; 
}

/**
 * Serialises `data` into the versioned envelope and writes it to localStorage.
 * Returns `true` on success, `false` if the write fails (e.g. quota exceeded).
 */
export function saveToStorage<T>(key: string, data: T): boolean {
  try {
    const serialized = JSON.stringify({
      data,
      timestamp: Date.now(),
      version: 1,
    });
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.warn(`Failed to save to storage (${key}):`, error);
    return false;
  }
}

/**
 * Reads and unwraps the versioned envelope from localStorage.
 * Returns `defaultValue` (or `null`) when the key is absent or the stored
 * value cannot be parsed.
 */
export function getFromStorage<T>(key: string, defaultValue?: T): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue ?? null;

    const parsed = JSON.parse(item);
    return parsed.data ?? defaultValue ?? null;
  } catch (error) {
    console.warn(`Failed to retrieve from storage (${key}):`, error);
    return defaultValue ?? null;
  }
}

/** Removes a single key from localStorage. Returns `true` on success. */
export function removeFromStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove from storage (${key}):`, error);
    return false;
  }
}

/**
 * Returns the raw envelope metadata (timestamp, version, computed age in ms)
 * for a given key without deserialising the full data payload.
 * Useful for TTL checks or debug logging.
 */
export function getStorageMetadata(key: string) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const parsed = JSON.parse(item);
    return {
      timestamp: parsed.timestamp,
      version: parsed.version,
      age: Date.now() - parsed.timestamp, // in milliseconds
    };
  } catch (error) {
    console.warn(`Failed to get storage metadata (${key}):`, error);
    return null;
  }
}

/**
 * Removes all localStorage keys whose name matches `pattern`.
 * Useful for bulk-invalidating per-project or per-sprint caches
 * (e.g. `clearStorageByPattern(/^task_tuner_sprints_/)`).
 */
export function clearStorageByPattern(pattern: RegExp): boolean {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && pattern.test(key)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.warn(`Failed to clear storage by pattern:`, error);
    return false;
  }
}

export const STORAGE_KEYS = {
  /** Logged-in UserDTO ({ userId, username, role, … }) */
  USER: 'task_tuner_user',
  /** Flat list of TaskTT objects for the current view */
  TASKS: 'task_tuner_tasks',
  /** ProjectUserTT membership list */
  TEAM_MEMBERS: 'task_tuner_team_members',
  /** Extended profile info for the profile page */
  PROFILE: 'task_tuner_profile',
  /** ProjectDTO[] — full project list fetched by the sidebar */
  PROJECTS: 'task_tuner_projects',
  /** The currently active ProjectDTO */
  CURRENT_PROJECT: 'task_tuner_current_project',
  /**
   * Per-project SprintLite[] cache — always paired with the projectId:
   * `${SPRINTS}_${pjId}` (e.g. `task_tuner_sprints_42`).
   * Written by SidebarProjectGroup; read by PageBreadcrumb and HomePage.
   */
  SPRINTS: 'task_tuner_sprints',
  /** The currently active SprintTT */
  CURRENT_SPRINT: 'task_tuner_current_sprint',
  /** JWT string returned by AuthController on login */
  AUTH_TOKEN: 'task_tuner_auth_token',
  /** boolean — whether the sidebar is currently open */
  SIDEBAR_OPEN: 'task_tuner_sidebar_open',
  /**
   * Per-project KPI cache prefix — paired with the projectId at runtime
   * (e.g. `${PROJECT_KPIS}_${pjId}`) so each project keeps its own cached
   * snapshot, just like the SPRINTS cache.
   */
  PROJECT_KPIS: 'task_tuner_project_kpis',
} as const;
