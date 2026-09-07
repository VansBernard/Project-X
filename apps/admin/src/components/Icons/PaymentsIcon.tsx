import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const PaymentsIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
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
    <rect x="2" y="6" width="16" height="12" rx="2" />
    <path d="M6 10h4" />
    <path d="M6 14h4" />
    <circle cx="19" cy="12" r="3" />
    <path d="M18 11h2v2" />
  </svg>
);
