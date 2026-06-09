import React from 'react';

/**
 * Sidebar brand header: TaskTuner "TT" wordmark logo + name.
 * Mirrors the AuthBrandHeader style used on Login/Signup so the brand
 * identity stays consistent across the app. Pure presentational, memoized.
 */
function SidebarHeader() {
  return (
    // Solid brand background matches the "Add Project" primary button color
    // so the brand row and the CTA below it read as a single visual identity.
    // h-16 matches the main header so the seam between the two is flush.
    <div className="flex items-center gap-3 px-4 h-16 bg-brand">
      {/* TT block — white square with brand-dark text for high contrast
          against the dark sidebar. Matches the size and shape of the
          AuthBrandHeader logo on the Login/Signup pages. */}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-2xl
                   bg-white shadow-lg shadow-black/20 shrink-0"
        aria-hidden="true"
      >
        <span className="text-sm font-extrabold tracking-[0.22em] text-brand-dark">
          TT
        </span>
      </div>
      <span className="text-lg font-bold text-white tracking-tight">TaskTuner</span>
    </div>
  );
}

export default React.memo(SidebarHeader);
