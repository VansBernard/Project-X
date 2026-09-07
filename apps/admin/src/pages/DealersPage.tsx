import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { TableSkeleton } from '../components/TableSkeleton';
import { apiClient, type DealerListItem } from '../lib/api';
import noTenantsImg from '../../No tenants.jpg';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function DealersPage() {
  const [dealers, setDealers] = useState<DealerListItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const itemsPerPage = 10;
  const totalDealers = dealers.length;
  const pageCount = Math.max(1, Math.ceil(totalDealers / itemsPerPage));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    apiClient.listDealers({ take: 100 })
      .then((response) => {
        if (!cancelled) {
          setDealers(response.data);
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

  const currentDealers = useMemo(
    () => dealers.slice((page - 1) * itemsPerPage, page * itemsPerPage),
    [dealers, page]
  );

  return (
    <>
      <Sidebar />
      <Header title="Dealers" subtitle="Review dealer accounts and earnings." />
      <MainLayout>
        <div className="space-y-6">
          <section className="space-y-6">
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-2 p-5 border-b border-slate-200 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-900">Dealer list</p>
                <p className="text-sm font-medium text-slate-700">{totalDealers} dealers</p>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="min-w-full divide-y divide-slate-200 bg-white">
                  <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Dealer</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Devices</th>
                      <th className="px-4 py-3">Revenue</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  {loading ? (
                    <TableSkeleton columnCount={6} rowCount={5} />
                  ) : currentDealers.length === 0 ? (
                    <tbody className="text-sm leading-snug bg-white">
                      <tr>
                        <td className="px-4 py-10 text-center" colSpan={6}>
                          <div className="flex flex-col items-center gap-4">
                            <img src={noTenantsImg} alt="No dealers" className="max-w-[280px] opacity-95" />
                            <p className="text-sm text-slate-500">{loadError ? 'Could not load dealers. Please refresh and try again.' : 'No dealers yet. Add one to start.'}</p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  ) : (
                    <tbody className="divide-y divide-slate-200 bg-slate-50">
                      {currentDealers.map((dealer) => (
                        <tr key={dealer.id} className="hover:bg-white transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-900">{dealer.name}</div>
                            <div className="text-sm text-slate-500">{dealer.email || 'No email'}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">{dealer.phone || '—'}</td>
                          <td className="px-4 py-4 text-sm text-slate-700">{dealer.deviceCount ?? 0}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">{formatCurrency(dealer.totalRevenue ?? 0)}</td>
                          <td className="px-4 py-4 text-sm text-slate-500">{dateFormatter.format(new Date(dealer.createdAt))}</td>
                          <td className="px-4 py-4"><StatusBadge status={dealer.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                <div>Showing {currentDealers.length} of {totalDealers} dealers</div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                  <span className="px-2">Page {page} of {pageCount}</span>
                  <button type="button" onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))} disabled={page === pageCount} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </MainLayout>
    </>
  );
}
