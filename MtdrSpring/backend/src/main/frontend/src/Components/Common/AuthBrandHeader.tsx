import React from 'react';

function AuthBrandHeader() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark shadow-lg shadow-brand/20">
          <span className="text-sm font-extrabold tracking-[0.22em] text-white">TT</span>
        </div>

        <div className="text-left">
          <p className="text-2xl font-bold tracking-tight text-gray-900">TaskTuner</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-dark/70">
            Administrator Site
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthBrandHeader;