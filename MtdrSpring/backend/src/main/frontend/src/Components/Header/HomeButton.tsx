import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

/**
 * Header button that navigates back to the post-login landing page (/home).
 * Sits next to the SidebarToggle so it's reachable from any project view.
 */
function HomeButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/home')}
      aria-label="Go to Home"
      title="Home"
      className="btn-icon-light text-gray-500 hover:text-brand-dark"
    >
      <HomeIcon className="size-6" aria-hidden="true" />
    </button>
  );
}

export default React.memo(HomeButton);
