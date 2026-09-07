import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  showBack?: boolean;
}

export const MainLayout: React.FC<LayoutProps> = ({ children, showBack = true }) => {
  const navigate = useNavigate();

  return (
    <main className="relative lg:ml-[260px] px-margin-mobile pt-margin-mobile lg:px-margin-desktop lg:pt-4 lg:pb-24 space-y-section-gap max-w-[1600px] mx-auto">
      {showBack && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary hover:text-primary lg:hidden"
          aria-label="Go back"
          title="Back"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
          </svg>
        </button>
      )}
      {children}
    </main>
  );
};
