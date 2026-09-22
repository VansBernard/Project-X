import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { apiClient, type NotificationItem } from '../lib/api';

const severityStyles: Record<NotificationItem['severity'], string> = {
  info: 'bg-blue-500 text-blue-600',
  warning: 'bg-amber-500 text-amber-600',
  critical: 'bg-red-500 text-red-600',
  success: 'bg-emerald-500 text-emerald-600',
};

const categoryLabel: Record<string, string> = {
  security: 'Security',
  system: 'System',
  dealer: 'Dealer',
  device: 'Device',
  payment: 'Payment',
  account: 'Account',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiClient.listNotifications()
      .then((response) => {
        if (!cancelled) {
          setNotifications(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotifications([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(() => notifications, [notifications]);

  return (
    <>
      <Sidebar />
      <Header title="Notifications" />
      <MainLayout showBack={false}>
        <section className="mx-auto max-w-[520px] lg:max-w-none lg:space-y-4">
          <div className="bg-white lg:overflow-hidden lg:rounded-xl lg:border lg:border-slate-200 lg:shadow-sm">
            <div className="bg-blue-50/60 px-3 py-3 lg:flex lg:items-center lg:justify-between lg:border-b lg:border-slate-200 lg:bg-slate-50 lg:px-4">
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-blue-700 transition hover:text-blue-900 lg:hidden"
                  aria-label="Go back"
                  title="Back"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
                  </svg>
                </button>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600 lg:hidden">Activity</p>
                  <h3 className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950 lg:mt-0 lg:text-base">Latest notifications</h3>
                </div>
              </div>
              <p className="mt-1 pl-9 text-[11px] text-blue-500 lg:mt-0 lg:pl-0 lg:text-sm lg:text-slate-500">{list.length} total</p>
            </div>

            {loading ? (
              <div className="space-y-4 px-3 py-4 lg:px-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="space-y-2 py-1">
                    <div className="h-3 w-24 animate-pulse bg-blue-100" />
                    <div className="h-4 w-4/5 animate-pulse bg-slate-100" />
                    <div className="h-3 w-full animate-pulse bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="px-3 py-10 text-center text-[12px] text-slate-500 lg:text-sm">No notifications yet.</div>
            ) : (
              <div className="px-3 py-2 lg:divide-y lg:divide-slate-200 lg:px-0 lg:py-0">
                {list.map((item) => (
                  <article key={item.id} className="py-3 lg:px-5 lg:py-4">
                    <div className="flex items-start gap-2.5 lg:gap-3">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityStyles[item.severity].split(' ')[0]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${severityStyles[item.severity].split(' ')[1]}`}>
                            {item.severity}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {categoryLabel[item.category] ?? item.category}
                          </span>
                          {item.dealerName && (
                            <span className="truncate text-[10px] text-slate-400">
                              {item.dealerName} / {item.dealerSlug}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                          <div className="min-w-0">
                            <h4 className="text-[13px] font-semibold leading-5 text-slate-950 lg:text-sm">{item.title}</h4>
                            <p className="mt-0.5 text-[12px] leading-5 text-slate-600 lg:text-sm lg:leading-6">{item.message}</p>
                          </div>
                          <time className="shrink-0 text-[10px] text-slate-400 lg:text-[11px] lg:text-slate-500">{formatDate(item.createdAt)}</time>
                        </div>

                        {(item.customerName || item.source) && (
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-blue-500 lg:text-[11px] lg:text-slate-500">
                            {item.customerName && <span>Customer: {item.customerName}</span>}
                            {item.source && <span>Source: {item.source}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </MainLayout>
    </>
  );
}