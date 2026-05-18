import React from 'react';

const sizeClasses = {
  sm: 'h-16 max-w-[200px]',
  md: 'h-20 max-w-[260px] md:h-24',
  lg: 'h-24 max-w-[320px] md:h-28',
};

/**
 * gostaff.in logo on dark UI — black wordmark needs a light surface for contrast.
 */
const BrandLogo = ({ size = 'lg', className = '', shellClassName = '' }) => (
  <div
    className={`inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-slate-200/30 ${shellClassName} ${className}`}
  >
    <img
      src="/logo.png"
      alt="gostaff.in"
      className={`w-auto object-contain ${sizeClasses[size] || sizeClasses.lg}`}
    />
  </div>
);

export default BrandLogo;
