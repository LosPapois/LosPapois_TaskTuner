import React from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';

export interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Standalone button that toggles the sidebar open/closed.
 * Lives in the main content header so it stays visible in both states.
 */
function SidebarToggle({ isOpen, onToggle }: SidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Hide sidebar' : 'Show sidebar'}
      className="btn-icon-light text-gray-500 hover:text-brand-dark"
    >
      <Bars3Icon className="size-6" aria-hidden="true" />
    </button>
  );
}

export default React.memo(SidebarToggle);
