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
}

function SidebarItem({ icon: Icon, label, to, onClick, active, dense }: SidebarItemProps) {
  const baseClass = dense ? 'sidebar-item-dense' : 'sidebar-item';
  const stateClass = active ? 'sidebar-item-active' : 'sidebar-item-idle';

  if (to) {
    return (
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          `${baseClass} ${isActive ? 'sidebar-item-active' : 'sidebar-item-idle'}`
        }
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
    >
      <Icon className="size-5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

// Memoized: items rarely change after mount; only re-render when props differ.
export default React.memo(SidebarItem);
