import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DashboardIcon, RouterIcon, UsersIcon, PaymentsIcon, SettingsIcon, LogoutIcon, TrendingUpIcon } from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { apiClient, type DeviceListItem } from '../../lib/api';

interface NavLink {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const dealerNavLinks: NavLink[] = [
  { path: '/dashboard', label: 'Home', icon: <DashboardIcon size={20} /> },
  { path: '/customers', label: 'Customers', icon: <UsersIcon size={20} /> },
  { path: '/devices', label: 'Devices', icon: <RouterIcon size={20} /> },
  { path: '/payments', label: 'Payments', icon: <PaymentsIcon size={20} /> },
];

const superAdminNavLink: NavLink = { path: '/dealers', label: 'Dealers', icon: <UsersIcon size={20} /> };

const systemLinks: NavLink[] = [
  { path: '/notifications', label: 'Notifications', icon: <TrendingUpIcon size={20} /> },
  { path: '/settings', label: 'Settings', icon: <SettingsIcon size={20} /> },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [recentDevices, setRecentDevices] = useState<DeviceListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    apiClient.listDevices({ take: 100 })
      .then((response) => {
        if (!cancelled) {
          setRecentDevices(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecentDevices([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const unreadDeviceCount = recentDevices.filter((device) => {
    if (!device.createdAt) return false;
    const createdAt = new Date(device.createdAt).getTime();
    const now = Date.now();
    return now - createdAt <= 24 * 60 * 60 * 1000;
  }).length;

  const navLinks: NavLink[] = user?.roleName === 'Super Admin'
    ? [dealerNavLinks[0], superAdminNavLink, ...dealerNavLinks.slice(1),
      { path: '/contracts', label: 'Contracts', icon: <TrendingUpIcon size={20} /> },
      { path: '/licenses', label: 'Licenses', icon: <TrendingUpIcon size={20} /> }]
    : dealerNavLinks;

  const visibleNavLinks = navLinks.map((link) => {
    if (link.path === '/devices') {
      const shouldHideBadge = location.pathname === '/devices';
      return { ...link, badge: shouldHideBadge ? 0 : unreadDeviceCount };
    }
    return link;
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <aside className="w-[260px] h-screen fixed left-0 top-0 hidden lg:flex flex-col bg-[#f8f9ff] shadow-sm z-50 border-r border-outline-variant">
        <div className="flex flex-col h-full py-5 px-3">
          {/* Brand Logo */}
          <div className="mb-8 flex items-center gap-3 rounded-2xl bg-primary px-4 py-4 text-white shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
              <img src="/Project%20X.png" alt="Project X" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-headline-md text-lg font-bold">Project X</h1>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-blue-100">PayGo Dealer</p>
            </div>
          </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1">
          {visibleNavLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                isActive(link.path)
                  ? 'bg-white font-bold text-primary shadow-sm ring-1 ring-primary/10'
                  : 'text-on-surface-variant hover:bg-white/80 active:scale-[.98]'
              }`}
            >
              <span className="flex-shrink-0">{link.icon}</span>
              <span className="font-body-md text-body-md flex-1">{link.label}</span>
              {typeof link.badge === 'number' && link.badge > 0 ? (
                <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                  {link.badge}
                </span>
              ) : null}
            </Link>
          ))}

          {/* System Section Divider */}
          <div className="pb-2 pt-6">
            <span className="px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
              System
            </span>
          </div>

          {systemLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                isActive(link.path)
                  ? 'bg-white font-bold text-primary shadow-sm ring-1 ring-primary/10'
                  : 'text-on-surface-variant hover:bg-white/80 active:scale-[.98]'
              }`}
            >
              <span className="flex-shrink-0">{link.icon}</span>
              <span className="font-body-md text-body-md">{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer Section */}
        <div className="mt-auto border-t border-outline-variant pt-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-error transition-all hover:bg-error-container/10 active:scale-[.98]">
            <span className="flex-shrink-0">
              <LogoutIcon size={20} />
            </span>
            <span className="font-body-md text-body-md font-bold">Logout</span>
          </button>
        </div>
      </div>
    </aside>

      <div className="hidden lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant bg-white shadow-[0_-12px_24px_rgba(15,23,42,0.08)]">
        <nav className="flex items-center justify-between px-3 py-2">
          {visibleNavLinks.slice(0, 5).map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-3xl px-2 py-2 text-[10px] transition-all ${
                isActive(link.path)
                  ? 'text-primary'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                {link.icon}
              </span>
              <span className="truncate text-xs font-medium">{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};
