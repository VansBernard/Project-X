import { useEffect, useMemo, useState } from 'react';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { apiClient, type NotificationItem } from '../lib/api';

const severityStyles: Record<NotificationItem['severity'], string> = {
  info: 'bg-sky-100 text-sky-700 ring-sky-200',
  warning: 'bg-amber-100 text-amber-700 ring-amber-200',
  critical: 'bg-red-100 text-red-700 ring-red-200',
  success: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
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
      <Header title="Notifications" subtitle="System activity, alerts, and dealer events." />
      <MainLayout>
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Latest notifications</h3>
                <p className="text-xs text-slate-500">Recent activity from the full system</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                {list.length} total
              </span>
            </div>

            {loading ? (
              <div className="space-y-3 px-4 py-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">No notifications yet.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {list.map((item) => (
                  <article key={item.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ${severityStyles[item.severity]}`}>
                            {item.severity}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                            {categoryLabel[item.category] ?? item.category}
                          </span>
                          {item.dealerName && (
                            <span className="text-[10px] text-slate-500">
                              {item.dealerName} · {item.dealerSlug}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 sm:text-base">{item.title}</h4>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                      </div>
                      <time className="shrink-0 text-[11px] text-slate-500">{formatDate(item.createdAt)}</time>
                    </div>
                    {item.customerName && (
                      <p className="mt-3 text-[11px] text-slate-500">Related customer: {item.customerName}</p>
                    )}
                    {item.source && (
                      <p className="mt-1 text-[11px] text-slate-500">Source: {item.source}</p>
                    )}
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
