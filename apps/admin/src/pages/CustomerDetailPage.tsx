import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { DetailSkeleton } from '../components/Skeleton';
import { apiClient, type CustomerListItem, type DeviceListItem } from '../lib/api';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function customerName(customer: CustomerListItem | null) {
  if (!customer) return 'Customer';
  return customer.fullName || `${customer.firstName} ${customer.lastName}`.trim();
}

function deviceName(device: DeviceListItem) {
  return [device.manufacturer, device.model].filter(Boolean).join(' ') || device.serialNumber;
}

function DetailIcon({ type }: { type: 'user' | 'calendar' | 'mail' | 'phone' | 'hash' | 'chevron' }) {
  const paths = {
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.1L8 9.91a16 16 0 0 0 6.1 6.1l1.47-1.23a2 2 0 0 1 2.1-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92Z" /></>,
    hash: <><path d="M10 3 8 21M16 3l-2 18M4 9h16M3 15h16" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
  };

  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<CustomerListItem | null>(null);
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!customerId) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    apiClient.getCustomer(customerId)
      .then((response) => {
        if (!cancelled) {
          setCustomer(response.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    apiClient.getCustomerDevices(customerId)
      .then((response) => {
        if (!cancelled) setDevices(response.data);
      })
      .catch(() => {
        if (!cancelled) setDevices([]);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return (
    <>
      <Sidebar />
      <Header title="Customer details" simplified />
      <MainLayout showBack={false}>
        <div className="space-y-4 sm:space-y-6">
          {loading ? (
            <DetailSkeleton />
          ) : error ? (
            <div className="bg-white p-4 text-sm text-red-500 sm:p-8">Unable to load customer details.</div>
          ) : customer ? (
            <div className="bg-white lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm">
              <div className="mx-auto max-w-[420px] pb-2 lg:hidden">
                <section className="bg-white px-3 pb-5 pt-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-500">Customer</p>
                      <h2 className="mt-1 break-words text-xl font-semibold leading-tight text-slate-950">{customerName(customer)}</h2>
                    </div>
                    <span className="mt-1 shrink-0 text-[10px] font-medium capitalize text-blue-600">{customer.status}</span>
                  </div>

                  <dl className="mt-5 grid gap-y-4">
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="mail" /></span>
                      <div className="min-w-0">
                        <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Email</dt>
                        <dd className="mt-0.5 break-words text-[12px] font-medium leading-5 text-slate-800">{customer.email || 'Not provided'}</dd>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="phone" /></span>
                      <div className="min-w-0">
                        <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Phone</dt>
                        <dd className="mt-0.5 text-[12px] font-medium leading-5 text-slate-800">{customer.phone || 'Not provided'}</dd>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="calendar" /></span>
                      <div className="min-w-0">
                        <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Joined</dt>
                        <dd className="mt-0.5 text-[12px] font-medium leading-5 text-slate-800">{dateFormatter.format(new Date(customer.createdAt))}</dd>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="hash" /></span>
                      <div className="min-w-0">
                        <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Customer ID</dt>
                        <dd className="mt-0.5 break-all text-[12px] font-medium leading-5 text-slate-800">{customer.id}</dd>
                      </div>
                    </div>
                  </dl>
                </section>

                <section className="bg-blue-50/55 px-3 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Registered devices</p>
                    <span className="text-[11px] text-blue-500">{devices.length} total</span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {devices.length > 0 ? devices.map((device) => (
                      <div key={device.id} className="py-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold leading-5 text-slate-900">{deviceName(device)}</p>
                            <p className="mt-0.5 break-all text-[10px] leading-4 text-slate-500">{device.serialNumber}</p>
                          </div>
                          <span className="shrink-0 text-[10px] font-medium capitalize text-slate-500">{device.status}</span>
                        </div>
                        <p className="mt-1 text-[10px] leading-4 text-slate-400">Last seen: {device.lastSeenAt ? dateFormatter.format(new Date(device.lastSeenAt)) : 'Never'}</p>
                      </div>
                    )) : (
                      <p className="py-4 text-[12px] leading-5 text-slate-500">No devices registered to this customer.</p>
                    )}
                  </div>
                </section>
              </div>

              <section className="hidden border-b border-slate-200 p-4 sm:p-8 lg:block lg:border-b-0 lg:border-r">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Customer</p>
                    <h2 className="mt-1 break-words text-xl font-semibold text-slate-900 sm:text-2xl">{customerName(customer)}</h2>
                  </div>
                  <StatusBadge status={customer.status} />
                </div>

                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-slate-900">{customer.email || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Phone</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">{customer.phone || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Joined</dt>
                    <dd className="mt-1 text-sm text-slate-700">{dateFormatter.format(new Date(customer.createdAt))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Customer ID</dt>
                    <dd className="mt-1 break-all text-sm text-slate-700">{customer.id}</dd>
                  </div>
                </dl>
              </section>

              <section className="hidden bg-slate-50 p-4 sm:p-8 lg:block">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Registered devices</h3>
                  <span className="text-sm text-slate-500">{devices.length}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {devices.length > 0 ? devices.map((device) => (
                    <div key={device.id} className="bg-white px-3 py-3 sm:px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{deviceName(device)}</p>
                          <p className="mt-1 break-all text-xs text-slate-500">{device.serialNumber}</p>
                        </div>
                        <StatusBadge status={device.status} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Last seen: {device.lastSeenAt ? dateFormatter.format(new Date(device.lastSeenAt)) : 'Never'}</p>
                    </div>
                  )) : (
                    <p className="bg-white px-3 py-4 text-sm text-slate-500 sm:px-4">No devices registered to this customer.</p>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="bg-white p-4 text-sm text-slate-500 sm:p-8">No customer matched this route.</div>
          )}
        </div>
      </MainLayout>
    </>
  );
}

export default CustomerDetailPage;
