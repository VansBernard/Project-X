import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const TrendingUpIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
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
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 17" />
    <polyline points="23 6 23 12 17 12" />
  </svg>
);
