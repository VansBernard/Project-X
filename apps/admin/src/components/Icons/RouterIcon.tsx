import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const RouterIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="5" width="18" height="12" rx="2" />
    <path d="M8 19h8" />
    <path d="M12 17v2" />
    <path d="M6 9h12" />
  </svg>
);
