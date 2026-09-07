import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { Badge } from '../components/UI';
import { PaymentsIcon, RouterIcon, UsersIcon } from '../components/Icons';
import { DeviceAccessDrawer } from '../components/DeviceAccessDrawer';
import { Modal } from '../components/Modal';
import { TableSkeleton } from '../components/TableSkeleton';
import { Skeleton } from '../components/Skeleton';
import { apiClient, type CancellationRequest, type ContractListItem, type CustomerListItem, type DashboardStats, type DeviceListItem } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import noDataImg from '../../No data.jpg';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'GHS',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const transactionBadge: Record<'success' | 'pending' | 'failed', 'success' | 'pending' | 'error'> = {
  success: 'success',
  pending: 'pending',
  failed: 'error',
};

function formatAmount(value: number) {
  return currencyFormatter.formatToParts(value);
}

export function DashboardPage() {
  const { user } = useAuth();
  const [deviceAccessOpen, setDeviceAccessOpen] = useState(false);
  const [desktopRecoveryId, setDesktopRecoveryId] = useState('');
  const [desktopRecoveryCode, setDesktopRecoveryCode] = useState<string | null>(null);
  const [desktopRecoveryExpiresAt, setDesktopRecoveryExpiresAt] = useState<string | null>(null);
  const [desktopRecoveryError, setDesktopRecoveryError] = useState<string | null>(null);
  const [desktopRecoveryLoading, setDesktopRecoveryLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<'payments' | 'devices' | 'customers'>('devices');
  const [mobileSearch, setMobileSearch] = useState('');
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [cancellationContract, setCancellationContract] = useState<ContractListItem | null>(null);
  const [cancellationRequest, setCancellationRequest] = useState<CancellationRequest | null>(null);
  const [cancellationBusy, setCancellationBusy] = useState(false);

  const loadCancellationRequest = async () => {
    try {
      const response = await apiClient.listContracts({ take: 100, status: 'active' });
      const pendingContract = response.data.find((contract) => {
        const request = contract.metadata?.cancellationRequest;
        return request && typeof request === 'object' && (request as { status?: string }).status === 'pending';
      });

      if (!pendingContract) {
        setCancellationContract(null);
        setCancellationRequest(null);
        return;
      }

      const requestResponse = await apiClient.getCancellationRequest(pendingContract.id);
      if (requestResponse.data?.status === 'pending') {
        setCancellationContract(pendingContract);
        setCancellationRequest(requestResponse.data);
      }
    } catch {
      // Dashboard data can retry on the next polling interval.
    }
  };

  useEffect(() => {
    void loadCancellationRequest();
    const interval = window.setInterval(() => void loadCancellationRequest(), 15000);
    return () => window.clearInterval(interval);
  }, []);

  const decideCancellation = async (decision: 'approved' | 'rejected') => {
    if (!cancellationContract) return;
    setCancellationBusy(true);
    try {
      await apiClient.decideCancellation(cancellationContract.id, decision);
      setCancellationContract(null);
      setCancellationRequest(null);
    } finally {
      setCancellationBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    setLoadingStats(true);
    setStatsError(false);

    apiClient.getDashboardStats()
      .then((response) => {
        if (!cancelled) {
          setStats(response.data);
          setStatsError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setStatsError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.listDevices({ take: 20 }),
      apiClient.searchCustomers({ take: 20 }),
    ]).then(([deviceResponse, customerResponse]) => {
      if (!cancelled) {
        setDevices(deviceResponse.data);
        setCustomers(customerResponse.data);
      }
    }).catch(() => {
      if (!cancelled) {
        setDevices([]);
        setCustomers([]);
      }
    });

    return () => { cancelled = true; };
  }, []);

  const recentTransactions = stats?.recentTransactions ?? [];
  const successfulTransactions = recentTransactions.filter((transaction) => transaction.status === 'success');
  const normalizedSearch = mobileSearch.trim().toLowerCase();
  const filteredPayments = successfulTransactions.filter((transaction) => (
    !normalizedSearch || `${transaction.description} ${transaction.status} ${transaction.amount} ${transaction.date}`.toLowerCase().includes(normalizedSearch)
  ));
  const filteredDevices = devices.filter((device) => (
    !normalizedSearch || `${device.manufacturer ?? ''} ${device.model ?? ''} ${device.serialNumber} ${device.status} ${device.customer?.fullName ?? ''} ${device.customer?.firstName ?? ''} ${device.customer?.lastName ?? ''}`.toLowerCase().includes(normalizedSearch)
  ));
  const filteredCustomers = customers.filter((customer) => (
    !normalizedSearch || `${customer.fullName ?? ''} ${customer.firstName} ${customer.lastName} ${customer.email ?? ''} ${customer.phone ?? ''} ${customer.status}`.toLowerCase().includes(normalizedSearch)
  ));
  const desktopRecoveryIdValid = /^PX-[A-F0-9]{12}$/i.test(desktopRecoveryId.trim());

  const handleDesktopRecovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDesktopRecoveryError(null);
    setDesktopRecoveryCode(null);
    setDesktopRecoveryExpiresAt(null);

    if (!desktopRecoveryIdValid) {
      setDesktopRecoveryError('Enter a valid Recovery ID, for example PX-8F4A2C91D0B7.');
      return;
    }

    setDesktopRecoveryLoading(true);
    try {
      const result = await apiClient.issueRecoveryAuthorization({ recoveryId: desktopRecoveryId.trim().toUpperCase() });
      setDesktopRecoveryCode(result.data.authorization);
      setDesktopRecoveryExpiresAt(result.data.expiresAt);
    } catch (error) {
      setDesktopRecoveryError((error as Error)?.message || 'Unable to generate a recovery authorization.');
    } finally {
      setDesktopRecoveryLoading(false);
    }
  };
  const selectedAd = stats?.adsEnabled && stats.ads?.length ? stats.ads[stats.ads.length - 1] : null;
  const dashboardLoading = loadingStats && !statsError;
  const isSuperAdmin = user?.roleName === 'Super Admin';
  return (
    <>
      <Modal
        isOpen={Boolean(cancellationContract && cancellationRequest)}
        title="Plan cancellation request"
        onClose={() => undefined}
        onConfirm={() => void decideCancellation('approved')}
        confirmText={cancellationBusy ? 'Processing...' : 'Approve cancellation'}
        isDangerous
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            {cancellationContract?.customerName || 'A customer'} requested cancellation of contract{' '}
            <strong className="text-slate-900">{cancellationContract?.contractNumber}</strong>.
          </p>
          <p>{cancellationRequest?.reason || 'No reason was provided.'}</p>
          <button
            type="button"
            onClick={() => void decideCancellation('rejected')}
            disabled={cancellationBusy}
            className="text-sm font-semibold text-slate-700 underline disabled:opacity-50"
          >
            Reject request
          </button>
        </div>
      </Modal>
      <Sidebar />
      <Header title="Today" />
      <MainLayout showBack={false}>
        <section className="space-y-4 lg:grid lg:grid-cols-5 lg:gap-gutter lg:space-y-0">
          {dashboardLoading ? (
            <>
              <div className="lg:col-span-3 rounded-xl border border-[#EDF2F7] bg-slate-100 p-4">
                <Skeleton className="mb-4 h-4 w-32 rounded-full" />
                <Skeleton className="h-60 rounded-3xl" />
              </div>
              <div className="lg:col-span-2 rounded-xl border border-[#EDF2F7] bg-slate-100 p-4">
                <Skeleton className="mb-3 h-3 w-40 rounded-full" />
                <Skeleton className="mb-5 h-3 w-1/2 rounded-full" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900 sm:text-lg">My Accounts</h2>
                  <label className="flex min-w-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-slate-500 lg:hidden">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 5.75 5.75a7.5 7.5 0 0 0 10.9 10.9Z" />
                    </svg>
                    <input
                      type="search"
                      value={mobileSearch}
                      onChange={(event) => setMobileSearch(event.target.value)}
                      placeholder="Search"
                      aria-label="Search payments, devices, and customers"
                      className="w-24 bg-transparent text-[11px] text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </label>
                </div>
                <div className="flex overflow-hidden rounded-3xl border-0 bg-white shadow-none lg:border lg:border-slate-200">
                  <div className="min-w-0 flex-1 p-3 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="whitespace-nowrap text-[10px] text-slate-500 sm:text-xs">Total Amount Made</p>
                        <p className="mt-1 whitespace-nowrap text-lg font-semibold text-slate-900 sm:mt-3 sm:text-2xl">
                          {formatAmount(stats?.totalRevenue ?? 0).map((part, index) => (
                            <span key={`${part.type}-${index}`} className={part.type === 'currency' ? 'text-primary' : undefined}>{part.value}</span>
                          ))}
                        </p>
                      </div>
                      <div className="hidden h-10 w-10 shrink-0 items-center justify-center bg-slate-100 text-slate-700 sm:inline-flex">
                        <PaymentsIcon size={20} />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 border-l border-slate-200 p-3 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 sm:text-xs">No. of devices</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900 sm:mt-3 sm:text-2xl">{stats?.activeDevices ?? 0}</p>
                      </div>
                      <div className="hidden h-10 w-10 shrink-0 items-center justify-center bg-slate-100 text-slate-700 sm:inline-flex">
                        <RouterIcon size={20} />
                      </div>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="min-w-0 flex-1 border-l border-slate-200 p-3 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] text-slate-500 sm:text-xs">No. of dealers</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900 sm:mt-3 sm:text-2xl">{stats?.dealerCount ?? 0}</p>
                        </div>
                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center bg-slate-100 text-slate-700 sm:inline-flex">
                          <UsersIcon size={20} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden lg:col-span-2 lg:block">
                <div className="bg-surface-container-lowest rounded-3xl border border-[#EDF2F7] shadow-sm overflow-hidden h-full">
                  {selectedAd ? (
                    <div className="relative h-full min-h-[260px]">
                      <img
                        src={selectedAd.imageUrl}
                        alt={selectedAd.caption}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute left-0 bottom-0 w-full bg-slate-900/60 px-4 py-3">
                        <p className="text-sm text-white">{selectedAd.caption}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
                      No active ad configured.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        <nav className="flex items-center rounded-full bg-[#f1f2f7] p-1 lg:hidden" aria-label="Account sections">
          <div className="flex h-10 min-w-0 flex-1 items-center">
            <button type="button" onClick={() => setMobileTab('devices')} className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1 text-xs font-medium transition ${mobileTab === 'devices' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>
              <RouterIcon size={15} />
              <span>Devices</span>
            </button>
            <button type="button" onClick={() => setMobileTab('payments')} className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1 text-xs font-semibold transition ${mobileTab === 'payments' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>
              <PaymentsIcon size={15} />
              <span>Payments</span>
            </button>
            <button type="button" onClick={() => setMobileTab('customers')} className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1 text-xs font-medium transition ${mobileTab === 'customers' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>
              <UsersIcon size={15} />
              <span>Customers</span>
            </button>
          </div>
        </nav>

        <section className="overflow-hidden bg-white lg:hidden">
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-xs font-semibold text-slate-800">
              {mobileTab === 'payments' ? `Payments (${filteredPayments.length})` : mobileTab === 'devices' ? `Devices (${filteredDevices.length})` : `Customers (${filteredCustomers.length})`}
            </h3>
          </div>
          {mobileTab === 'payments' && filteredPayments.map((transaction) => (
            <Link to={`/payments/${transaction.id}`} key={transaction.id} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 transition-colors last:border-0 hover:bg-slate-50 active:bg-slate-100">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-primary"><PaymentsIcon size={15} /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{transaction.description}</p><p className="truncate text-[10px] text-slate-500">{dateFormatter.format(new Date(transaction.date))}</p></div>
              <div className="text-right"><p className="text-xs font-semibold text-slate-900">{currencyFormatter.format(transaction.amount)}</p><p className="text-[10px] text-emerald-600">{transaction.status}</p></div>
            </Link>
          ))}
          {mobileTab === 'devices' && filteredDevices.map((device) => (
            <Link to={`/devices/${device.id}`} key={device.id} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 last:border-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-primary"><RouterIcon size={15} /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{[device.manufacturer, device.model].filter(Boolean).join(' ') || device.serialNumber}</p><p className="truncate text-[10px] text-slate-500">{device.customer ? `Customer: ${device.customer.fullName || `${device.customer.firstName} ${device.customer.lastName}`}` : 'Assignment: Unassigned'}</p></div>
              <div className="text-right"><p className={`text-[10px] font-medium ${device.customer ? 'text-emerald-600' : 'text-slate-500'}`}>{device.customer ? 'Assigned' : 'Unassigned'}</p><p className="text-[9px] capitalize text-slate-400">Status: {device.status}</p></div>
            </Link>
          ))}
          {mobileTab === 'customers' && filteredCustomers.map((customer) => (
            <Link to={`/customers/${customer.id}`} key={customer.id} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 transition-colors last:border-0 hover:bg-slate-50 active:bg-slate-100">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-primary"><UsersIcon size={15} /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{customer.fullName || `${customer.firstName} ${customer.lastName}`}</p><p className="truncate text-[10px] text-slate-500">{customer.email || customer.phone || 'No contact details'}</p></div>
              <span className="text-[10px] text-slate-500">{customer.status}</span>
            </Link>
          ))}
          {((mobileTab === 'payments' && filteredPayments.length === 0) || (mobileTab === 'devices' && filteredDevices.length === 0) || (mobileTab === 'customers' && filteredCustomers.length === 0)) && <p className="px-3 py-6 text-center text-xs text-slate-500">No {normalizedSearch ? 'matching results' : mobileTab === 'payments' ? 'successful payments' : mobileTab} found.</p>}
        </section>

        <section className="hidden grid-cols-1 gap-gutter lg:grid lg:grid-cols-2 lg:gap-6">
          <div className="overflow-hidden bg-white lg:rounded-3xl lg:border lg:border-slate-200 lg:shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant bg-slate-50/70 p-3 sm:p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Overview</p>
                <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">Recent Payments</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full text-left table-auto border-collapse">
                  <thead className="bg-[#F7FAFC] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  {dashboardLoading ? (
                    <TableSkeleton columnCount={4} rowCount={5} />
                  ) : statsError ? (
                    <tbody className="text-xs leading-snug sm:text-sm">
                      <tr>
                        <td className="px-4 py-8 text-center" colSpan={4}>
                          <p className="text-sm text-error">Unable to load recent payments. Please refresh and try again.</p>
                        </td>
                      </tr>
                    </tbody>
                  ) : recentTransactions.length === 0 ? (
                    <tbody className="text-xs leading-snug sm:text-sm">
                      <tr>
                        <td className="px-4 py-8 text-center" colSpan={4}>
                          <div className="flex flex-col items-center gap-4">
                            <img src={noDataImg} alt="No payments" className="max-w-[280px] opacity-95" />
                            <p className="text-sm text-slate-500">No payments yet. They will appear here when received.</p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  ) : (
                    <tbody className="text-xs leading-snug sm:text-sm">
                      {recentTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-4 py-2 font-semibold">{transaction.description}</td>
                          <td className="px-4 py-2">{currencyFormatter.format(transaction.amount)}</td>
                          <td className="px-4 py-2">{dateFormatter.format(new Date(transaction.date))}</td>
                          <td className="px-4 py-2"><Badge variant={transactionBadge[transaction.status]}>{transaction.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            </div>
          </div>
          <section className="h-fit self-start overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-amber-300">Device access</p>
                  <h2 className="mt-3 text-2xl font-semibold">Recovery console</h2>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-slate-950">
                  <RouterIcon size={20} />
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">Enter a Recovery ID to generate a signed offline authorization.</p>
            </div>
            <form onSubmit={handleDesktopRecovery} className="mt-8 border-t border-white/10 pt-5">
              <label htmlFor="desktop-recovery-id" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Recovery ID</label>
              <div className="mt-3 flex gap-2">
                <input
                  id="desktop-recovery-id"
                  value={desktopRecoveryId}
                  onChange={(event) => setDesktopRecoveryId(event.target.value.toUpperCase())}
                  placeholder="PX-8F4A2C91D0B7"
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                />
                <button type="submit" disabled={desktopRecoveryLoading} className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60">
                  {desktopRecoveryLoading ? 'Working...' : 'Generate'}
                </button>
              </div>
              {desktopRecoveryError && <p className="mt-3 rounded-xl bg-red-400/10 px-3 py-2 text-sm text-red-200">{desktopRecoveryError}</p>}
              {desktopRecoveryCode && (
                <div className="mt-4 rounded-xl bg-amber-300/10 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Authorization</p>
                  <p className="mt-2 break-all rounded-lg bg-black/30 p-3 font-mono text-xs leading-5 text-amber-50">{desktopRecoveryCode}</p>
                  <p className="mt-2 text-xs text-slate-300">Valid until {desktopRecoveryExpiresAt ? new Date(desktopRecoveryExpiresAt).toLocaleString() : 'the expiration time'}.</p>
                </div>
              )}
            </form>
          </section>
        </section>
      </MainLayout>
      <button
        type="button"
        onClick={() => setDeviceAccessOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-amber-300 shadow-lg transition hover:scale-105 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-950/25 lg:hidden"
        aria-label="Open device access"
        title="Device access"
      >
        <RouterIcon size={23} />
      </button>
      {deviceAccessOpen && <div className="lg:hidden"><DeviceAccessDrawer open onClose={() => setDeviceAccessOpen(false)} /></div>}
    </>
  );
}
