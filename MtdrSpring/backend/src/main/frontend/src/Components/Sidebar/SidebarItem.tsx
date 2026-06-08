import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Generic sidebar entry. Renders as a NavLink when `to` is provided
 * (auto-handles active state via React Router), or as a button when
 * `onClick` is provided (for actions like Sign out, or items without
 * a real route yet — pass `active` to force the highlighted style).
 */
export interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to?: string;
  onClick?: () => void;
  /**
   * Forces the active visual state when the item is rendered as a button.
   * Ignored in NavLink mode — there React Router determines active state.
   */
  active?: boolean;
  /** Optional density override for nested items (sprints under a project). */
  dense?: boolean;
  /**
   * When true, the item is grayed out and non-interactive: ignores `to` /
   * `onClick`, drops mouse hover effects, shows a "not-allowed" cursor.
   * Used to leave a once-meaningful entry visible (so the layout doesn't
   * jump) while signaling that its purpose has been absorbed elsewhere.
   */
  disabled?: boolean;
  /** Native tooltip — handy for explaining why something is disabled. */
  title?: string;
}

function SidebarItem({
  icon: Icon,
  label,
  to,
  onClick,
  active,
  dense,
  disabled,
  title,
}: SidebarItemProps) {
  const baseClass = dense ? 'sidebar-item-dense' : 'sidebar-item';
  const stateClass = active ? 'sidebar-item-active' : 'sidebar-item-idle';
  const disabledClass = 'sidebar-item-idle text-gray-400 opacity-60 cursor-not-allowed pointer-events-none';

  // Disabled: skip the link/button entirely and render a flat div, so
  // keyboard tab navigation + screen readers also see it as inert.
  if (disabled) {
    return (
      <div
        className={`${baseClass} ${disabledClass}`}
        title={title}
        aria-disabled="true"
      >
        <Icon className="size-5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
    );
  }

  if (to) {
    return (
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          `${baseClass} ${isActive ? 'sidebar-item-active' : 'sidebar-item-idle'}`
        }
        title={title}
      >
        <Icon className="size-5 shrink-0" />
        <span className="truncate">{label}</span>
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClass} ${stateClass}`}
      aria-current={active ? 'page' : undefined}
      title={title}
    >
      <Icon className="size-5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

// Memoized: items rarely change after mount; only re-render when props differ.
export default React.memo(SidebarItem);
