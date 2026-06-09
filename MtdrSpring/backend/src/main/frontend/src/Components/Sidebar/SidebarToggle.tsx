import React from 'react';
import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';

export interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Standalone button that toggles the sidebar open/closed.
 * Lives in the main content header so it stays visible in both states.
 *
 * The icon flips with the state — a left-pointing double chevron when the
 * sidebar is open (hint: "click to collapse it to the left") and a
 * right-pointing one when it's closed (hint: "click to expand it to the
 * right"). This pattern is more discoverable than a static hamburger menu
 * because it tells the user *what will happen* before they click.
 */
function SidebarToggle({ isOpen, onToggle }: SidebarToggleProps) {
  const Icon = isOpen ? ChevronDoubleLeftIcon : ChevronDoubleRightIcon;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Hide sidebar' : 'Show sidebar'}
      title={isOpen ? 'Hide sidebar' : 'Show sidebar'}
      className="btn-icon-light text-white hover:text-white hover:bg-white/15 transition-transform"
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}

export default React.memo(SidebarToggle);
