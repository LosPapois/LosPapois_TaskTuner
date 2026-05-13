import React from 'react';

/** Decorative cycle-time sparkline used in KPI cards. */
export default function Sparkline() {
  return (
    <svg
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      className="w-full h-5"
      aria-hidden="true"
    >
      <path
        d="M 0 14 Q 25 6, 50 10 T 100 12"
        fill="none"
        stroke="#3B82F6"
        strokeWidth="2"
      />
    </svg>
  );
}
