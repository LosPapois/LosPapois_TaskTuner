import React from 'react';

/** Linear progress bar used by KPI cards to show completion percentage. */
export default function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(value, 100));
  const rounded = Math.round(safe);

  return (
    <div className="space-y-1.5">
      <div
        className="w-full h-2.5 rounded-full bg-green-50 border border-green-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-400 via-green-500 to-emerald-600 transition-[width] duration-500"
          style={{ width: `${safe}%` }}
        />
      </div>
      <div className="text-[11px] text-green-700 font-medium">Progress tracked at {rounded}%</div>
    </div>
  );
}
