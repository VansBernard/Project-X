import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { apiClient, type CustomerListItem } from '../lib/api';

export function UsersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCustomers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.searchCustomers({ take: 50 });
        if (!cancelled) {
          setCustomers(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'Unable to load users.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="View customers and their account status. This page uses the backend customer listing API because a dedicated admin users endpoint is not available yet."
          action={<Button variant="primary" disabled>Invite User</Button>}
        />

        {loading ? (
          <LoadingState message="Loading users..." />
        ) : error ? (
          <ErrorState title="Unable to load users" description={error} />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No users found"
            description="No customer records are available yet. Create or import customers once the customer onboarding flow is implemented."
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {customer.fullName || `${customer.firstName} ${customer.lastName}`}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{customer.email || '-'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{customer.phone || '-'}</td>
                    <td className="px-4 py-4 text-sm">
                      <StatusBadge status={customer.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{new Date(customer.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
