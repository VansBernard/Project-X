import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { Badge } from '../components/UI';
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
            <section className="bg-white p-4 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Payment receipt</p>
                  <h2 className="mt-1 break-all text-xl font-semibold text-slate-900 sm:text-2xl">{payment.providerReference}</h2>
                </div>
                <Badge variant={payment.status === 'successful' ? 'success' : 'pending'}>{payment.status.toUpperCase()}</Badge>
              </div>

              <div className="mt-6 bg-slate-50 p-4 sm:p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount received</p>
                <p className="mt-2 text-3xl font-semibold text-primary sm:text-4xl">{formattedAmount(payment)}</p>
              </div>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Customer</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{customerName(payment)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Payment date</dt>
                  <dd className="mt-1 text-sm text-slate-700">{dateFormatter.format(new Date(payment.paidAt || payment.createdAt))}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Method</dt>
                  <dd className="mt-1 text-sm capitalize text-slate-700">{payment.provider}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Transaction ID</dt>
                  <dd className="mt-1 break-all text-sm text-slate-700">{payment.id}</dd>
                </div>
              </dl>
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
