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
              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
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
            ) : (
              <div className="p-4 text-sm text-slate-500 sm:p-8">No device matched this route.</div>
            )}
          </div>
        </div>
      </MainLayout>
    </>
  );
}
