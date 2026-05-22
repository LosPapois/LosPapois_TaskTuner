import React from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Mapping of tones to global design system badge classes (from globals.css) */
const TONE_TO_CLASS: Record<StatusTone, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

/**
 * Status Badge Component
 * 
 * Renders a small pill-shaped badge with semantic coloring.
 * Uses centralized design system classes to ensure consistency.
 * 
 * @example
 * <StatusBadge label="Completed" tone="success" />
 * <StatusBadge label="In Progress" tone="warning" />
 */
function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span className={TONE_TO_CLASS[tone]}>
      {label}
    </span>
  );
}

export default React.memo(StatusBadge);
