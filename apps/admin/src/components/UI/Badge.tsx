import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'pending' | 'locked' | 'success' | 'error' | 'warning';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'active', className = '' }) => {
  const variantStyles = {
    active: 'bg-secondary-container/20 text-on-secondary-container',
    pending: 'bg-tertiary-fixed/30 text-tertiary',
    locked: 'bg-error-container/40 text-on-error-container',
    success: 'bg-secondary-container/20 text-on-secondary-container',
    error: 'bg-error-container/40 text-on-error-container',
    warning: 'bg-tertiary-fixed/30 text-tertiary',
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full ${variantStyles[variant]} text-[11px] font-bold ${className}`}
    >
      {children}
    </span>
  );
};
