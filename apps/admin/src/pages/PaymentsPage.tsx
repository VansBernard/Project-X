import { useEffect, useState } from 'react';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { Button, Badge } from '../components/UI';
import { Link } from 'react-router-dom';
import { apiClient, type PaymentListItem } from '../lib/api';
import { TableSkeleton } from '../components/TableSkeleton';
import { ListSkeleton } from '../components/Skeleton';
import noTenantsImg from '../../No tenants.jpg';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

function customerName(payment: PaymentListItem) {
  return payment.customer.fullName || `${payment.customer.firstName} ${payment.customer.lastName}`.trim();
}

function formattedAmount(payment: PaymentListItem) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: payment.currency || 'NGN', maximumFractionDigits: 0,
  }).format(Number(payment.amount));
}

function statusBadge(status: PaymentListItem['status']) {
  if (status === 'successful') return <Badge variant="success">SUCCESS</Badge>;
  if (status === 'pending') return <Badge variant="pending">PENDING</Badge>;
  return <Badge variant="error">{status.toUpperCase()}</Badge>;
}

export function PaymentsPage() {
  const [transactions, setTransactions] = useState<PaymentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const successfulTransactions = transactions.filter((transaction) => transaction.status === 'successful');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    apiClient.listPayments({ take: 100 })
      .then((response) => {
        if (!cancelled) {
          setTransactions(response.data);
          setLoading(false);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setLoadError(true);
        }
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Sidebar />
      <Header title="Payments" subtitle="Monitor and manage all payment transactions" />
      <MainLayout>
        <section className="overflow-hidden bg-surface-container-lowest lg:rounded-xl lg:border lg:border-[#EDF2F7] lg:card-shadow">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low/50 p-3 sm:p-6">
            <h3 className="text-base font-semibold sm:font-headline-sm sm:text-headline-sm">Recent Transactions</h3>
            <Button variant="primary" size="md" disabled className="hidden sm:inline-flex">Export Report</Button>
          </div>
          <div className="lg:hidden">
            {loading ? <ListSkeleton /> : loadError ? <p className="px-3 py-8 text-center text-xs text-slate-500">Could not load payments.</p> : successfulTransactions.length === 0 ? <p className="px-3 py-8 text-center text-xs text-slate-500">No successful payments found.</p> : successfulTransactions.map((transaction) => (
              <Link to={`/payments/${transaction.id}`} key={transaction.id} className="flex items-center gap-2 border-b border-slate-100 px-3 py-3 transition-colors last:border-0 hover:bg-slate-50 active:bg-slate-100">
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{customerName(transaction)}</p><p className="truncate text-[10px] text-slate-500">{dateFormatter.format(new Date(transaction.paidAt || transaction.createdAt))}</p></div>
                <div className="text-right"><p className="text-xs font-semibold text-slate-900">{formattedAmount(transaction)}</p><p className="text-[10px] text-emerald-600">Successful</p></div>
              </Link>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left">
              <thead className="bg-[#F1F5F9] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              {loading ? (
                <TableSkeleton columnCount={6} rowCount={5} />
              ) : transactions.length === 0 ? (
                <tbody className="text-sm leading-snug">
                  <tr>
                    <td className="px-6 py-10 text-center" colSpan={6}>
                      <div className="flex flex-col items-center gap-4">
                        <img src={noTenantsImg} alt="No transactions" className="max-w-[280px] opacity-95" />
                        <p className="text-sm text-slate-500">{loadError ? 'Could not load transactions. Please refresh and try again.' : 'No transactions yet. Record one to continue.'}</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="divide-y divide-outline-variant text-sm">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">{transaction.providerReference}</td>
                      <td className="px-6 py-4 text-sm">{customerName(transaction)}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">{dateFormatter.format(new Date(transaction.paidAt || transaction.createdAt))}</td>
                      <td className="px-6 py-4 text-sm font-bold text-on-surface">{formattedAmount(transaction)}</td>
                      <td className="px-6 py-4 text-sm capitalize">{transaction.provider}</td>
                      <td className="px-6 py-4">{statusBadge(transaction.status)}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
          <div className="flex items-center justify-center border-t border-outline-variant bg-surface-container-low/50 p-3 sm:p-4">
            <span className="text-xs font-bold text-slate-500 sm:text-body-md">Showing <span className="sm:hidden">{successfulTransactions.length} successful payment{successfulTransactions.length === 1 ? '' : 's'}</span><span className="hidden sm:inline">{transactions.length} transaction{transactions.length === 1 ? '' : 's'}</span></span>
          </div>
        </section>
      </MainLayout>
    </>
  );
}