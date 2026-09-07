import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { Badge } from '../components/UI';
import { apiClient, type DeviceListItem } from '../lib/api';
import { TableSkeleton } from '../components/TableSkeleton';
import { ListSkeleton } from '../components/Skeleton';
import noDataImg from '../../No data.jpg';

function getStatusVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
    case 'assigned': return 'active' as const;
    case 'locked':
    case 'lost':
    case 'retired': return 'locked' as const;
    case 'inventory':
    case 'released': return 'pending' as const;
    default: return 'warning' as const;
  }
}

function customerName(device: DeviceListItem) {
  const customer = device.customer;
  return customer ? customer.fullName || `${customer.firstName} ${customer.lastName}`.trim() : 'Unassigned';
}

function deviceLabel(device: DeviceListItem) {
  return [device.manufacturer, device.model].filter(Boolean).join(' ') || device.serialNumber;
}

function amountDue(device: DeviceListItem) {
  if (!device.contract) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: device.contract.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(Number(device.contract.remainingBalance));
}

export function DevicesPage() {
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    (async () => {
      try {
        const response = await apiClient.listDevices({ take: 100 });
        if (cancelled) return;

        const list = response.data;

        // Try to fetch active license for each device to ensure permanent keys are surfaced
        const licensePromises = list.map((d) =>
          apiClient.getDeviceActiveLicense(d.id).then(r => r.data).catch(() => null)
        );

        const licenseResults = await Promise.all(licensePromises);

        const merged = list.map((d, i) => ({
          ...d,
          license: licenseResults[i]?.license ?? d.license ?? null
        }));

        setDevices(merged);
        setLoading(false);
        setLoadError(false);
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          setLoadError(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const visibleDevices = useMemo(
    () => devices.slice((page - 1) * itemsPerPage, page * itemsPerPage),
    [devices, page]
  );

  const pageCount = Math.max(1, Math.ceil(devices.length / itemsPerPage));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [pageCount, page]);

  return (
    <>
      <Sidebar />
      <Header title="Devices" subtitle="Monitor device health, payment status, and license compliance" />
      <MainLayout>
        <section className="space-y-6">
          <div className="overflow-hidden rounded-xl border-0 bg-white shadow-none lg:border lg:border-slate-200 lg:shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-5 sm:py-4">
              <div>
                <h3 className="text-base font-medium text-slate-900 sm:text-lg">Devices</h3>
                <p className="text-xs text-slate-500 sm:text-sm">{devices.length} total</p>
              </div>
            </div>

            <div className="lg:hidden">
              {loading ? <ListSkeleton /> : loadError ? <p className="px-3 py-8 text-center text-xs text-slate-500">Could not load devices.</p> : visibleDevices.length === 0 ? <p className="px-3 py-8 text-center text-xs text-slate-500">No devices found.</p> : visibleDevices.map((device) => (
                <button type="button" key={device.id} onClick={() => navigate(`/devices/${device.id}`)} className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-3 text-left last:border-0"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{deviceLabel(device)}</p><p className="truncate text-[10px] text-slate-500">{device.customer ? `Customer: ${customerName(device)}` : 'Assignment: Unassigned'}</p></div><div className="text-right"><p className={`text-[10px] font-medium ${device.customer ? 'text-emerald-600' : 'text-slate-500'}`}>{device.customer ? 'Assigned' : 'Unassigned'}</p><p className="text-[10px] capitalize text-slate-400">{device.status}</p></div></button>
              ))}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 bg-white">
                <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Device</th>
                    <th className="px-5 py-3">Contract</th>
                    <th className="px-5 py-3">Amount Due</th>
                  </tr>
                </thead>
                {loading ? (
                  <TableSkeleton columnCount={5} rowCount={5} />
                ) : visibleDevices.length === 0 ? (
                  <tbody className="text-sm leading-snug">
                    <tr>
                      <td className="px-5 py-10 text-center" colSpan={5}>
                        <div className="flex flex-col items-center gap-4">
                          <img src={noDataImg} alt="No devices" className="max-w-[280px] opacity-95" />
                          <p className="text-sm text-slate-500">{loadError ? 'Could not load devices. Please refresh and try again.' : 'No devices found. Add one to continue.'}</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody className="divide-y divide-slate-200 bg-slate-50 text-sm leading-snug">
                    {visibleDevices.map((device) => (
                      <tr key={device.id} onClick={() => navigate(`/devices/${device.id}`)} className="cursor-pointer transition-colors hover:bg-white">
                        <td className="px-5 py-4 font-semibold"><Badge variant={getStatusVariant(device.status)}>{device.status.toUpperCase()}</Badge></td>
                        <td className="px-5 py-4 font-semibold">{customerName(device)}</td>
                        <td className="px-5 py-4">{deviceLabel(device)}</td>
                        <td className="px-5 py-4">{device.contract?.contractNumber ?? '—'}</td>
                        <td className="px-5 py-4">{amountDue(device)}</td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
            <div className="hidden items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 lg:flex">
              <div>Showing {visibleDevices.length} of {devices.length} devices</div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                <span>Page {page} of {pageCount}</span>
                <button type="button" onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))} disabled={page === pageCount} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>
        </section>
      </MainLayout>
    </>
  );
}
