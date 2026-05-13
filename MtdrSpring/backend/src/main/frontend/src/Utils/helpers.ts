/**
 * Shared utility functions for formatting and mapping data.
 */

/**
 * Parses a backend priority string to a known enum union.
 * @param p The backend priority string
 * @returns 'high' | 'medium' | 'low' | 'none'
 */
export function mapTaskPriority(p: string | null | undefined): 'high' | 'medium' | 'low' | 'none' {
  switch ((p ?? '').toLowerCase()) {
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'none';
  }
}

/**
 * Normalizes backend state string to a known union.
 * @param s The backend state string
 * @returns 'active' | 'done' | 'delayed'
 */
export function normalizeTaskState(s: string | null | undefined): 'active' | 'done' | 'delayed' {
  const state = (s ?? '').toLowerCase();
  if (state === 'done') return 'done';
  if (state === 'delayed') return 'delayed';
  return 'active';
}

/**
 * Formats an ISO string to a display-friendly date: "15 Mar 2026".
 * @param iso ISO string like "2026-03-15"
 * @returns Formatted date string or '—'
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
