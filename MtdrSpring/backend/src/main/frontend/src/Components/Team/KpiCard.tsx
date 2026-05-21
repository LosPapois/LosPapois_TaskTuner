import React from 'react';

export type KpiTone = 'success' | 'warning' | 'danger' | 'info' | 'brand';

/** Mapping of tones to icon badge classes (from globals.css design system) */
const TONE_TO_ICON_CLASS: Record<KpiTone, string> = {
  success: 'icon-badge-success',
  warning: 'icon-badge-warning',
  danger: 'icon-badge-danger',
  info: 'icon-badge-info',
  brand: 'icon-badge-brand',
};

export interface KpiCardProps {
  /** Small label shown in the top-left of the card. */
  label: string;
  /** Big bold value shown beneath the label (e.g. "50%", "2.9 days"). */
  value: string;
  /** Heroicon component rendered inside the colored badge in the top-right. */
  icon: React.ComponentType<{ className?: string }>;
  /** Visual tone applied to the icon badge. Defaults to brand. */
  tone?: KpiTone;
  /**
   * Optional content rendered below the value — typically a chart, sparkline,
   * or contextual subtitle. Kept generic so the same card supports many shapes.
   */
  children?: React.ReactNode;
}

/**
 * KPI Card Component
 * 
 * Generic card for displaying key performance indicators with icon badges and optional children.
 * Uses centralized design system classes for consistency across dashboards.
 * 
 * Layout:
 *   ┌──────────────────────────┐
 *   │ label           [icon]   │
 *   │ BIG VALUE                │
 *   │ {children: chart/note}   │
 *   └──────────────────────────┘
 * 
 * @example
 * <KpiCard 
 *   label="Completed Tasks"
 *   value="24"
 *   icon={CheckIcon}
 *   tone="success"
 * >
 *   <p>3 more than last week</p>
 * </KpiCard>
 */
function KpiCard({ label, value, icon: Icon, tone = 'brand', children }: KpiCardProps) {
  return (
    <div className="card-interactive">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-gray-500">{label}</span>
        <span className={TONE_TO_ICON_CLASS[tone]} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {/* Brand-dark color tints every KPI value with the green palette — */}
      {/* one of the small accent points that distributes the brand across */}
      {/* the page instead of concentrating it in headers. */}
      <div className="mt-2 text-3xl font-bold text-brand-dark">{value}</div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default React.memo(KpiCard);
