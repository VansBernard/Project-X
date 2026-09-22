import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { DetailSkeleton } from '../components/Skeleton';
import { apiClient, type PaymentListItem } from '../lib/api';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function customerName(payment: PaymentListItem) {
  return payment.customer.fullName || `${payment.customer.firstName} ${payment.customer.lastName}`.trim();
}

function formattedAmount(payment: PaymentListItem) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: payment.currency || 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(payment.amount));
}

function DetailIcon({ type }: { type: 'user' | 'calendar' | 'hash' | 'method' }) {
  const paths = {
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    hash: <><path d="M10 3 8 21M16 3l-2 18M4 9h16M3 15h16" /></>,
    method: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 14h4" /></>,
  };

  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export function PaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [payment, setPayment] = useState<PaymentListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!paymentId) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    apiClient.listPayments({ take: 100 })
      .then((response) => {
        if (!cancelled) {
          setPayment(response.data.find((item) => item.id === paymentId) ?? null);
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
  }, [paymentId]);

  return (
    <>
      <Sidebar />
      <Header title="Payment receipt" simplified />
      <MainLayout showBack={false}>
        <div className="space-y-4 sm:space-y-6">
          {loading ? (
            <div className="bg-white"><DetailSkeleton /></div>
          ) : error ? (
            <div className="bg-white p-4 text-sm text-red-500 sm:p-8">Unable to load payment details.</div>
          ) : payment ? (
            <section className="mx-auto max-w-[420px] bg-white pb-2 lg:max-w-none lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm">
              <div className="px-3 pb-5 pt-2 lg:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-500 lg:text-[10px]">Payment receipt</p>
                    <h2 className="mt-1 break-all text-xl font-semibold leading-tight text-slate-950 lg:text-2xl">{payment.providerReference}</h2>
                  </div>
                  <span className={`mt-1 shrink-0 text-[10px] font-medium capitalize lg:text-xs ${payment.status === 'successful' ? 'text-blue-600' : 'text-slate-500'}`}>{payment.status}</span>
                </div>

                <dl className="mt-5 grid gap-y-4 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-5">
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="user" /></span>
                    <div className="min-w-0">
                      <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400 lg:text-xs">Customer</dt>
                      <dd className="mt-0.5 break-words text-[12px] font-medium leading-5 text-slate-800 lg:text-sm">{customerName(payment)}</dd>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="calendar" /></span>
                    <div className="min-w-0">
                      <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400 lg:text-xs">Payment date</dt>
                      <dd className="mt-0.5 text-[12px] font-medium leading-5 text-slate-800 lg:text-sm">{dateFormatter.format(new Date(payment.paidAt || payment.createdAt))}</dd>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="method" /></span>
                    <div className="min-w-0">
                      <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400 lg:text-xs">Method</dt>
                      <dd className="mt-0.5 text-[12px] font-medium capitalize leading-5 text-slate-800 lg:text-sm">{payment.provider}</dd>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-500"><DetailIcon type="hash" /></span>
                    <div className="min-w-0">
                      <dt className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400 lg:text-xs">Transaction ID</dt>
                      <dd className="mt-0.5 break-all text-[12px] font-medium leading-5 text-slate-800 lg:text-sm">{payment.id}</dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="bg-blue-50/55 px-3 py-4 lg:px-8 lg:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Amount received</p>
                    <p className="mt-1 text-2xl font-semibold leading-tight text-slate-950 lg:text-4xl">{formattedAmount(payment)}</p>
                  </div>
                  <p className="shrink-0 text-right text-[11px] font-medium leading-5 text-blue-600 lg:text-sm">
                    {payment.status === 'successful' ? 'Received successfully' : 'Awaiting confirmation'}
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <div className="bg-white p-4 text-sm text-slate-500 sm:p-8">No payment matched this route.</div>
          )}
        </div>
      </MainLayout>
    </>
  );
}

export default PaymentDetailPage;