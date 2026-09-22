import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { PaymentsIcon, RouterIcon, UsersIcon } from '../components/Icons';
import { DeviceAccessDrawer } from '../components/DeviceAccessDrawer';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { apiClient, type CancellationRequest, type ContractListItem, type CustomerListItem, type DashboardStats, type DealerProfile, type DeviceListItem } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
  const [dealerProfile, setDealerProfile] = useState<DealerProfile | null>(null);
  const [onboardingForm, setOnboardingForm] = useState({ name: '', legalName: '', email: '', phone: '', country: '' });
  const [payoutForm, setPayoutForm] = useState({ payoutMethod: 'bank' as 'bank' | 'mobile_money', bankCode: '', accountNumber: '', accountHolderName: '', mobileMoneyProvider: '', currency: '' });
  const [payoutBanks, setPayoutBanks] = useState<Array<{ name: string; code: string }>>([]);
  const [payoutBanksLoading, setPayoutBanksLoading] = useState(false);
  const [payoutAccountName, setPayoutAccountName] = useState('');
  const [onboardingError, setOnboardingError] = useState('');
  const [onboardingStep, setOnboardingStep] = useState<'profile' | 'location' | 'payout'>('profile');
  const [onboardingSaving, setOnboardingSaving] = useState(false);

  const payoutCurrencies: Record<string, string> = { GH: 'GHS', KE: 'KES', NG: 'NGN', ZA: 'ZAR' };
  const mobileMoneyProviders: Record<string, Array<{ value: string; label: string }>> = {
    GH: [{ value: 'MTN', label: 'MTN MoMo' }, { value: 'ATL', label: 'AirtelTigo Money' }, { value: 'VOD', label: 'Telecel Cash' }],
    KE: [{ value: 'MPESA', label: 'Safaricom M-Pesa' }, { value: 'ATL', label: 'Airtel Money' }],
  };

  useEffect(() => {
    if (localStorage.getItem('dealerOnboardingPending') !== 'true') return;

    let cancelled = false;
    apiClient.getDealerProfile().then((response) => {
      if (cancelled) return;
      setDealerProfile(response.data);
      setOnboardingForm({
        name: response.data.name || '',
        legalName: response.data.legalName || response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        country: response.data.country || '',
      });
      setPayoutForm((current) => ({ ...current, currency: payoutCurrencies[response.data.country || ''] || '' }));
    }).catch(() => {
      if (!cancelled) setOnboardingError('We could not load your account details. Please refresh and try again.');
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const country = onboardingForm.country as 'NG' | 'GH' | 'KE' | 'ZA';
    if (!['NG', 'GH', 'KE', 'ZA'].includes(country)) {
      setPayoutBanks([]);
      return;
    }

    let cancelled = false;
    setPayoutBanksLoading(true);
    apiClient.listPayoutBanks(country)
      .then((response) => { if (!cancelled) setPayoutBanks(response.data); })
      .catch(() => { if (!cancelled) setPayoutBanks([]); })
      .finally(() => { if (!cancelled) setPayoutBanksLoading(false); });

    return () => { cancelled = true; };
  }, [onboardingForm.country]);

  const onboardingOpen = localStorage.getItem('dealerOnboardingPending') === 'true' && Boolean(dealerProfile);

  const advanceOnboarding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOnboardingError('');

    if (onboardingStep === 'profile') {
      if (!onboardingForm.name.trim() || !onboardingForm.email.trim() || !onboardingForm.phone.trim()) {
        setOnboardingError('Complete your business profile before continuing.');
        return;
      }
      setOnboardingStep('location');
      return;
    }

    if (onboardingStep === 'location') {
      if (!onboardingForm.country) {
        setOnboardingError('Select your operating country before continuing.');
        return;
      }
      setOnboardingStep('payout');
      return;
    }

    void saveOnboarding(event);
  };

  const saveOnboarding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onboardingForm.name.trim() || !onboardingForm.email.trim() || !onboardingForm.phone.trim() || !onboardingForm.country) {
      setOnboardingError('Complete all required fields before continuing.');
      return;
    }
    if (!payoutForm.currency || !payoutForm.accountNumber.trim()) {
      setOnboardingError('Complete your payout details before continuing.');
      return;
    }
    if (payoutForm.payoutMethod === 'bank' && !payoutForm.bankCode) {
      setOnboardingError('Select your bank before continuing.');
      return;
    }
    if (payoutForm.payoutMethod === 'mobile_money' && !payoutForm.mobileMoneyProvider) {
      setOnboardingError('Select your mobile money provider before continuing.');
      return;
    }

    setOnboardingSaving(true);
    setOnboardingError('');
    try {
      const profileResponse = await apiClient.updateDealerProfile({
        name: onboardingForm.name.trim(),
        legalName: onboardingForm.legalName.trim() || onboardingForm.name.trim(),
        email: onboardingForm.email.trim().toLowerCase(),
        phone: onboardingForm.phone.trim(),
        country: onboardingForm.country,
      });
      let accountHolderName = payoutForm.accountHolderName.trim();
      if (payoutForm.payoutMethod === 'bank' && ['NG', 'GH'].includes(onboardingForm.country)) {
        const resolved = await apiClient.resolvePayoutAccount({
          country: onboardingForm.country as 'NG' | 'GH',
          bankCode: payoutForm.bankCode,
          accountNumber: payoutForm.accountNumber.trim(),
        });
        accountHolderName = resolved.data.accountName;
        setPayoutAccountName(resolved.data.accountName);
      }
      await apiClient.updatePayoutDetails({
        payoutMethod: payoutForm.payoutMethod,
        bankCode: payoutForm.payoutMethod === 'bank' ? payoutForm.bankCode : undefined,
        accountNumber: payoutForm.accountNumber.trim(),
        accountHolderName: accountHolderName || undefined,
        mobileMoneyProvider: payoutForm.payoutMethod === 'mobile_money' ? payoutForm.mobileMoneyProvider : undefined,
        currency: payoutForm.currency,
      });
      setDealerProfile((current) => current ? { ...current, ...profileResponse.data } : current);
      localStorage.removeItem('dealerOnboardingPending');
    } catch (error) {
      setOnboardingError((error as { message?: string }).message || 'We could not save your details. Please try again.');
    } finally {
      setOnboardingSaving(false);
    }
  };

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
      <Modal
        isOpen={onboardingOpen}
        title="Complete your workspace setup"
        onClose={() => undefined}
        hideCancel
        size="lg"
      >
        <form onSubmit={advanceOnboarding} className="space-y-5">
          <div className="overflow-hidden rounded-3xl bg-[#f4f8ff]">
            <div className="bg-primary px-4 py-4 text-white sm:px-5 sm:py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-100">Workspace setup</p>
              <h3 className="mt-1 text-lg font-semibold leading-tight sm:text-xl">Finish your dealer profile</h3>
              <p className="mt-2 max-w-xl text-xs leading-5 text-blue-50 sm:text-sm sm:leading-6">Complete one section at a time. We will unlock your dashboard after payout details are saved.</p>
            </div>

            <ol className="grid grid-cols-3 gap-px bg-blue-100 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <li>
                <button type="button" onClick={() => setOnboardingStep('profile')} className={`flex h-full w-full items-center gap-2 bg-white px-3 py-2.5 text-left sm:block sm:py-3 ${onboardingStep === 'profile' ? 'text-blue-700' : 'text-slate-500'}`}>
                  <span className={`text-[11px] sm:block ${onboardingStep === 'profile' ? 'text-blue-500' : 'text-slate-400'}`}>01</span>
                  Profile
                </button>
              </li>
              <li>
                <button type="button" onClick={() => { if (onboardingForm.name.trim() && onboardingForm.email.trim() && onboardingForm.phone.trim()) setOnboardingStep('location'); }} className={`flex h-full w-full items-center gap-2 bg-white px-3 py-2.5 text-left sm:block sm:py-3 ${onboardingStep === 'location' ? 'text-blue-700' : 'text-slate-500'}`}>
                  <span className={`text-[11px] sm:block ${onboardingStep === 'location' ? 'text-blue-500' : 'text-slate-400'}`}>02</span>
                  Location
                </button>
              </li>
              <li>
                <button type="button" onClick={() => { if (onboardingForm.country) setOnboardingStep('payout'); }} className={`flex h-full w-full items-center gap-2 bg-white px-3 py-2.5 text-left sm:block sm:py-3 ${onboardingStep === 'payout' ? 'text-blue-700' : 'text-slate-500'}`}>
                  <span className={`text-[11px] sm:block ${onboardingStep === 'payout' ? 'text-blue-500' : 'text-slate-400'}`}>03</span>
                  Payout
                </button>
              </li>
            </ol>
          </div>

          {onboardingError && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{onboardingError}</div>}

          {onboardingStep === 'profile' && (
            <section className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">1</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Business profile</h3>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">This is how your dealer workspace appears across receipts, customers, and payment records.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Business name<input value={onboardingForm.name} onChange={(event) => setOnboardingForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-blue-100" required /></label>
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Legal name<input value={onboardingForm.legalName} onChange={(event) => setOnboardingForm((current) => ({ ...current, legalName: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-blue-100" /></label>
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Email address<input type="email" value={onboardingForm.email} onChange={(event) => setOnboardingForm((current) => ({ ...current, email: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-blue-100" required /></label>
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Phone number<input value={onboardingForm.phone} onChange={(event) => setOnboardingForm((current) => ({ ...current, phone: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-blue-100" required /></label>
              </div>
            </section>
          )}

          {onboardingStep === 'location' && (
            <section className="space-y-3 rounded-2xl bg-slate-50 px-3 py-4 sm:rounded-3xl sm:px-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-blue-700">2</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Operating country</h3>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">Your country controls the available payout options and settlement currency.</p>
                </div>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Country<select value={onboardingForm.country} onChange={(event) => { const country = event.target.value; setOnboardingForm((current) => ({ ...current, country })); setPayoutForm((current) => ({ ...current, currency: payoutCurrencies[country] || '', bankCode: '', mobileMoneyProvider: '', accountNumber: '', accountHolderName: '' })); setPayoutAccountName(''); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-blue-100" required><option value="">Select country</option><option value="GH">Ghana</option><option value="NG">Nigeria</option><option value="KE">Kenya</option><option value="ZA">South Africa</option></select></label>
            </section>
          )}

          {onboardingStep === 'payout' && (
            <section className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">3</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Payout destination</h3>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">Choose where successful customer payments should be settled.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <fieldset className="sm:col-span-2">
                  <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Payout method</legend>
                  <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                    {[
                      { value: 'bank' as const, label: 'Bank account', description: 'Settle payments into a bank account.' },
                      { value: 'mobile_money' as const, label: 'Mobile money', description: 'Settle payments into a mobile wallet.', disabled: !mobileMoneyProviders[onboardingForm.country] },
                    ].map((method) => (
                      <label key={method.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${payoutForm.payoutMethod === method.value ? 'border-primary-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-slate-300'} ${method.disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                        <input
                          type="radio"
                          name="payoutMethod"
                          value={method.value}
                          checked={payoutForm.payoutMethod === method.value}
                          disabled={method.disabled}
                          onChange={() => { setPayoutForm((current) => ({ ...current, payoutMethod: method.value, bankCode: '', mobileMoneyProvider: '', accountNumber: '', accountHolderName: '' })); setPayoutAccountName(''); }}
                          className="mt-0.5 h-4 w-4 accent-primary-600"
                        />
                        <span>
                          <span className="block text-sm font-semibold normal-case tracking-normal text-slate-900">{method.label}</span>
                          <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal text-slate-500">{method.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Settlement currency<input value={payoutForm.currency} readOnly className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-600" /></label>
                {payoutForm.payoutMethod === 'bank' ? <>
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:col-span-2">Bank<select value={payoutForm.bankCode} disabled={payoutBanksLoading} onChange={(event) => { setPayoutForm((current) => ({ ...current, bankCode: event.target.value, accountHolderName: '' })); setPayoutAccountName(''); }} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-blue-100"><option value="">{payoutBanksLoading ? 'Loading supported banks...' : 'Select your bank'}</option>{payoutBanks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></label>
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Bank account number<input value={payoutForm.accountNumber} onChange={(event) => { setPayoutForm((current) => ({ ...current, accountNumber: event.target.value, accountHolderName: '' })); setPayoutAccountName(''); }} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-blue-100" required /></label>
                  {['NG', 'GH'].includes(onboardingForm.country) ? <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Verified account name<input value={payoutAccountName} readOnly placeholder="Verified when you save" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-600" /></label> : <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Account holder name<input value={payoutForm.accountHolderName} onChange={(event) => setPayoutForm((current) => ({ ...current, accountHolderName: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-blue-100" required /></label>}
                </> : <>
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Mobile money provider<select value={payoutForm.mobileMoneyProvider} onChange={(event) => setPayoutForm((current) => ({ ...current, mobileMoneyProvider: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-blue-100" required><option value="">Select provider</option>{(mobileMoneyProviders[onboardingForm.country] || []).map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}</select></label>
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Mobile money number<input value={payoutForm.accountNumber} onChange={(event) => setPayoutForm((current) => ({ ...current, accountNumber: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-blue-100" required /></label>
                </>}
              </div>
            </section>
          )}

          <div className="sticky bottom-0 z-20 -mx-4 flex items-center justify-between gap-4 border-t border-slate-100 bg-white px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.04)] sm:-mx-6 sm:px-6">
            {onboardingStep !== 'profile' ? <button type="button" onClick={() => setOnboardingStep(onboardingStep === 'payout' ? 'location' : 'profile')} className="shrink-0 text-sm font-semibold text-slate-600 hover:text-slate-900">Back</button> : <p className="min-w-0 text-xs leading-5 text-slate-500">You can update these details later from settings.</p>}
            <button type="submit" disabled={onboardingSaving} className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60">{onboardingSaving ? 'Saving...' : onboardingStep === 'payout' ? 'Save and continue' : 'Next'}</button>
          </div>
        </form>
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

                <div className="hidden w-full overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-sm lg:block lg:max-w-[calc(100%-0.25rem)]">
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

                  <form onSubmit={handleDesktopRecovery} className="mt-8 border-t border-white/10 pt-5">
                    <label htmlFor="desktop-recovery-id" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Recovery ID</label>
                    <div className="mt-3 flex gap-2">
                      <input
                        id="desktop-recovery-id"
                        value={desktopRecoveryId}
                        onChange={(event) => setDesktopRecoveryId(event.target.value.toUpperCase())}
                        placeholder="eg. PX-8F4A2C91D0B7"
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
                </div>
              </div>
              <div className="hidden lg:col-span-2 lg:block lg:mt-[45px]">
                <div className="bg-surface-container-lowest overflow-hidden rounded-3xl border border-[#EDF2F7] shadow-sm">
                  {selectedAd ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                      <img
                        src={selectedAd.imageUrl}
                        alt={selectedAd.caption}
                        className="h-full w-full object-cover object-center"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 px-4 py-3">
                        <p className="text-sm text-white">{selectedAd.caption}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-[260px] items-center justify-center p-6 text-sm text-slate-500">
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

        <section className="hidden lg:block">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Overview</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Recent Payments</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left table-auto border-collapse">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700">
                  {recentTransactions.slice(0, 5).map((transaction) => (
                    <tr key={transaction.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{transaction.description}</td>
                      <td className="px-4 py-3">{currencyFormatter.format(transaction.amount)}</td>
                      <td className="px-4 py-3">{dateFormatter.format(new Date(transaction.date))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${transaction.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
