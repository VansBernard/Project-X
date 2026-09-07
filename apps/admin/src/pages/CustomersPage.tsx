import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { apiClient, type CustomerListItem } from '../lib/api';
import { TableSkeleton } from '../components/TableSkeleton';
import { ListSkeleton } from '../components/Skeleton';
import noTenantsImg from '../../No tenants.jpg';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const search = '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    apiClient.searchCustomers({ q: search, take: 100 })
      .then((response) => {
        if (!cancelled) {
          setCustomers(response.data);
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
  }, [search]);

  const currentCustomers = useMemo(
    () => customers.slice((page - 1) * itemsPerPage, page * itemsPerPage),
    [customers, page]
  );

  const pageCount = Math.max(1, Math.ceil(customers.length / itemsPerPage));

  return (
    <>
      <Sidebar />
      <Header title="Customers" subtitle="Search and manage customer accounts." />
      <MainLayout>
        <div className="space-y-6">
          <section className="overflow-hidden bg-surface-container-lowest lg:rounded-xl lg:border lg:border-[#EDF2F7] lg:card-shadow">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low/50 p-3 sm:p-6">
              <div>
                <p className="text-sm font-semibold text-slate-900 sm:text-base">Customer list</p>
                <p className="text-xs text-slate-500 sm:text-sm">Showing {customers.length} customer{customers.length === 1 ? '' : 's'}.</p>
              </div>
              <p className="text-xs text-slate-700 sm:text-sm">Updated just now</p>
            </div>

            <div className="bg-white lg:hidden">
              {loading ? <ListSkeleton /> : error ? <p className="px-3 py-8 text-center text-xs text-slate-500">Unable to load customers.</p> : currentCustomers.length === 0 ? <p className="px-3 py-8 text-center text-xs text-slate-500">No customers found.</p> : currentCustomers.map((customer) => (
                <Link to={`/customers/${customer.id}`} key={customer.id} className="flex min-h-16 w-full items-center gap-2 border-b border-slate-100 px-3 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{customer.fullName ?? `${customer.firstName} ${customer.lastName}`}</p><p className="truncate text-[10px] text-slate-500">{customer.email || customer.phone || 'No contact details'}</p></div><div className="text-right"><p className="text-[10px] capitalize text-slate-500">{customer.status}</p><p className="text-[10px] text-slate-400">{customer.contractCount ?? 0} contracts</p></div></Link>
              ))}
            </div>
            <div className="hidden overflow-x-auto bg-white lg:block">
              <table className="w-full text-left">
                <thead className="bg-[#F1F5F9] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4">Contracts</th>
                  </tr>
                </thead>
                {loading ? (
                  <TableSkeleton columnCount={5} rowCount={5} />
                ) : error ? (
                  <tbody>
                    <tr>
                      <td className="px-4 py-10 text-center" colSpan={5}>
                        <p className="text-sm text-slate-500">Unable to load customers. Please refresh and try again.</p>
                      </td>
                    </tr>
                  </tbody>
                ) : currentCustomers.length === 0 ? (
                  <tbody>
                    <tr>
                      <td className="px-4 py-10 text-center" colSpan={5}>
                        <div className="flex flex-col items-center gap-4">
                          <img src={noTenantsImg} alt="No customers" className="max-w-[280px] opacity-95" />
                          <p className="text-sm text-slate-500">No customers match your search.</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody className="divide-y divide-outline-variant text-sm">
                    {currentCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/customers/${customer.id}`);
                          }
                        }}
                        tabIndex={0}
                        className="cursor-pointer hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                      >
                        <td className="px-6 py-4">
                          <Link to={`/customers/${customer.id}`} className="block hover:text-primary">
                            <div className="font-medium text-slate-900">{customer.fullName ?? `${customer.firstName} ${customer.lastName}`}</div>
                          <div className="text-sm text-slate-500">{customer.email || 'No email'}</div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{customer.phone || '—'}</td>
                        <td className="px-6 py-4"><StatusBadge status={customer.status} /></td>
                        <td className="px-6 py-4 text-sm text-slate-500">{dateFormatter.format(new Date(customer.createdAt))}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{customer.contractCount ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>

            <div className="flex items-center justify-center border-t border-outline-variant bg-surface-container-low/50 p-3 sm:p-4 text-sm text-slate-600">
              <div>Showing {currentCustomers.length} of {customers.length} customers</div>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                <span className="px-2">Page {page} of {pageCount}</span>
                <button type="button" onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))} disabled={page === pageCount} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </div>
          </section>
        </div>
      </MainLayout>
    </>
  );
}
