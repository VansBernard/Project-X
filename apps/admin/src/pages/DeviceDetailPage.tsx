import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { DetailSkeleton } from '../components/Skeleton';
import { apiClient, type DeviceListItem } from '../lib/api';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function customerName(device: DeviceListItem | null) {
  if (!device?.customer) return 'Unassigned';
  return device.customer.fullName || `${device.customer.firstName} ${device.customer.lastName}`.trim();
}

function deviceLabel(device: DeviceListItem | null) {
  if (!device) return '—';
  return [device.manufacturer, device.model].filter(Boolean).join(' ') || device.serialNumber;
}

function DetailIcon({ type }: { type: 'device' | 'user' | 'calendar' | 'hash' | 'settings' | 'chevron' }) {
  const paths = {
    device: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    hash: <><path d="M10 3 8 21M16 3l-2 18M4 9h16M3 15h16" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6.3v-2.6H6a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 7.5l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V6h2.6v.3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.3v2.6H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
  };

  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export function DeviceDetailPage() {
  const { deviceId } = useParams();
  const [device, setDevice] = useState<DeviceListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!deviceId) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    apiClient.listDevices({ take: 100 })
      .then((deviceResponse) => {
        if (!cancelled) {
          const selected = deviceResponse.data.find((item) => item.id === deviceId) ?? null;
          setDevice(selected);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  return (
    <>
      <Sidebar />
      <Header title="Device details" simplified />
      <MainLayout showBack={false}>
        <div className="space-y-4 sm:space-y-6">
          <div className="overflow-hidden bg-white lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm">
            {loading ? (
              <DetailSkeleton />
            ) : error ? (
              <div className="p-4 text-sm text-red-500 sm:p-8">Unable to load device details.</div>
            ) : device ? (
              <>
                <div className="mx-auto max-w-[420px] pb-2 lg:hidden">
                  <section className="bg-white px-3 pb-5 pt-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-500">Device</p>
                        <h2 className="mt-1 break-words text-xl font-semibold leading-tight text-slate-950">{deviceLabel(device)}</h2>
                      </div>
                      <span className="mt-1 shrink-0 text-[10px] font-medium capitalize text-blue-600">{device.status}</span>
                    </div>

                    <dl className="mt-5 grid gap-y-4">
                      <div className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="user" /></span>
                        <div className="min-w-0">
                          <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Customer</dt>
                          <dd className="mt-0.5 truncate text-[12px] font-medium leading-5 text-slate-800">{customerName(device)}</dd>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="calendar" /></span>
                        <div className="min-w-0">
                          <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Last seen</dt>
                          <dd className="mt-0.5 text-[12px] font-medium leading-5 text-slate-800">{device.lastSeenAt ? dateFormatter.format(new Date(device.lastSeenAt)) : 'Never'}</dd>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="hash" /></span>
                        <div className="min-w-0">
                          <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Serial number</dt>
                          <dd className="mt-0.5 break-all text-[12px] font-medium leading-5 text-slate-800">{device.serialNumber}</dd>
                        </div>
                      </div>
                    </dl>
                  </section>

                  <section className="bg-blue-50/55 px-3 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Contract</p>
                        <p className="mt-0.5 truncate text-[13px] font-semibold leading-5 text-slate-900">{device.contract?.contractNumber ?? 'No contract assigned'}</p>
                      </div>
                      <p className="shrink-0 text-right text-[13px] font-semibold leading-5 text-slate-900">{device.contract ? new Intl.NumberFormat('en-US', { style: 'currency', currency: device.contract.currency || 'NGN', maximumFractionDigits: 0 }).format(Number(device.contract.remainingBalance)) : '-'}</p>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3">
                      <div className="min-w-0">
                        <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Manufacturer</dt>
                        <dd className="mt-0.5 truncate text-[12px] font-medium leading-5 text-slate-800">{device.manufacturer || 'Not provided'}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Model</dt>
                        <dd className="mt-0.5 truncate text-[12px] font-medium leading-5 text-slate-800">{device.model || 'Not provided'}</dd>
                      </div>
                    </dl>
                  </section>
                </div>
                <div className="hidden grid gap-0 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
                <div className="border-b border-slate-200 p-4 sm:p-8 lg:border-b-0 lg:border-r">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Device</p>
                      <h2 className="mt-1 break-words text-xl font-semibold text-slate-900 sm:text-2xl">{deviceLabel(device)}</h2>
                    </div>
                    <StatusBadge status={device.status} />
                  </div>

                  <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Serial number</p>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-900">{device.serialNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Customer</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{customerName(device)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Last seen</p>
                      <p className="mt-1 text-sm text-slate-700">{device.lastSeenAt ? dateFormatter.format(new Date(device.lastSeenAt)) : 'Never'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Contract</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{device.contract?.contractNumber ?? '—'}</p>
                    </div>
                  </dl>
                </div>

                <div className="bg-slate-50 p-4 sm:p-8">
                  <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Contract & billing</h3>
                  <div className="mt-4 space-y-4 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3 bg-white px-3 py-3 sm:px-4">
                      <span>Balance due</span>
                      <span className="text-right font-semibold text-slate-900">{device.contract ? new Intl.NumberFormat('en-US', { style: 'currency', currency: device.contract.currency || 'NGN', maximumFractionDigits: 0 }).format(Number(device.contract.remainingBalance)) : '—'}</span>
                    </div>
                    <div className="bg-white px-3 py-3 sm:px-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Status notes</p>
                      <p className="mt-2 leading-6">This device record is reachable from the Devices list.</p>
                    </div>
                  </div>
                </div>
                </div>
              </>
            ) : (
              <div className="p-4 text-sm text-slate-500 sm:p-8">No device matched this route.</div>
            )}
          </div>
        </div>
      </MainLayout>
    </>
  );
}
