import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = true }) => {
  return (
    <div
      className={`bg-surface-container-lowest p-6 rounded-xl border border-[#EDF2F7] card-shadow ${
        hover ? 'group hover:border-primary/30 transition-all' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
