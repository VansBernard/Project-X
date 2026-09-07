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
              <section className="border-b border-slate-200 p-4 sm:p-8 lg:border-b-0 lg:border-r">
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

              <section className="bg-slate-50 p-4 sm:p-8">
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
