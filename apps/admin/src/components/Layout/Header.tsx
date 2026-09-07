import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogoutIcon, SettingsIcon } from '../Icons';
import { apiClient } from '../../lib/api';

interface HeaderProps {
  title: string;
  subtitle?: string;
  simplified?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, simplified = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [dealerName, setDealerName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient.getDealerProfile()
      .then((response) => {
        if (!cancelled && response.data.name) setDealerName(response.data.name);
      })
      .catch(() => {
        if (!cancelled) setDealerName(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const displayName = dealerName ?? 'Dealer';

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (simplified) {
    return (
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-margin-mobile py-3 lg:ml-[260px] lg:w-[calc(100%-260px)] lg:px-margin-desktop lg:py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary"
            aria-label="Go back"
            title="Back"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        </div>
      </header>
    );
  }

  return (
    <header className={`${title === 'Today' ? '' : 'hidden lg:block '}sticky top-0 z-40 border-b border-transparent px-margin-mobile py-3 lg:ml-[260px] lg:w-[calc(100%-260px)] lg:px-margin-desktop lg:py-4 ${title === 'Today' ? 'bg-primary text-white lg:border-slate-200 lg:bg-white lg:text-slate-900' : 'bg-white lg:border-slate-200'}`}>
      <div className="flex flex-nowrap items-center justify-between gap-2 lg:gap-6">
        <div className="flex min-w-0 items-center gap-2 lg:order-1 lg:block lg:max-w-none">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white p-1.5 lg:hidden">
            <img src="/Project%20X.png" alt="Project X" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            {title === 'Today' && <p className="text-[11px] font-medium leading-4 lg:text-sm text-blue-100 lg:text-slate-500">Welcome,</p>}
            <h1 className={`truncate text-base font-bold leading-5 lg:text-2xl ${title === 'Today' ? 'text-white lg:text-slate-900' : 'text-slate-900'}`}>{title === 'Today' ? displayName : title}</h1>
            {subtitle && <p className={`mt-0.5 truncate text-[10px] leading-4 lg:hidden ${title === 'Today' ? 'text-blue-100' : 'text-slate-500'}`}>{subtitle}</p>}
            {subtitle && <p className="mt-1 hidden truncate text-sm lg:block text-slate-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0 sm:gap-1.5 lg:order-3">
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className={`relative flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10 lg:hidden ${title === 'Today' ? 'text-white' : 'text-slate-700'}`}
            aria-label="Notifications"
            title="Notifications"
          >
            <svg className="h-5 w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17H9m9-4V9a6 6 0 10-12 0v4l-2 3h16l-2-3zM10 20h4" /></svg>
            <span className="absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">1</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-primary lg:hidden ${title === 'Today' ? 'text-white' : 'text-slate-700'}`}
            aria-label="Open settings"
            title="Settings"
          >
            <SettingsIcon size={18} />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-red-500 lg:h-10 lg:w-10 lg:hover:bg-slate-100 ${title === 'Today' ? 'text-white lg:text-slate-700' : 'text-slate-700'}`}
            aria-label="Log out"
            title="Log out"
          >
            <LogoutIcon size={18} />
          </button>

        </div>

        <div className="relative order-2 hidden min-w-0 lg:ml-auto lg:block lg:w-[300px]">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.75 3.75a7.5 7.5 0 0012.9 12.9z" />
            </svg>
          </div>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="w-full rounded-full border border-slate-200 bg-white px-10 py-2 text-sm text-slate-900 outline-none transition duration-150 ease-in-out placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>
    </header>
  );
};
