import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { apiClient, type DealerListItem } from '../lib/api';

export function TenantsPage() {
  const [dealers, setDealers] = useState<DealerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDealers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.listDealers({ take: 50 });
        if (!cancelled) {
          setDealers(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'Unable to load tenants.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDealers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Tenants"
          description="View tenant organizations and their status within Project X."
          action={<Button variant="primary" disabled>Create Tenant</Button>}
        />

        {loading ? (
          <LoadingState message="Loading tenants..." />
        ) : error ? (
          <ErrorState title="Unable to load tenants" description={error} />
        ) : dealers.length === 0 ? (
          <EmptyState
            title="No tenants found"
            description="No tenant organizations are available yet. Create one once the tenant onboarding flow is implemented."
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {dealers.map((dealer) => (
                  <tr key={dealer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{dealer.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{dealer.slug}</td>
                    <td className="px-4 py-4 text-sm">
                      <StatusBadge status={dealer.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{dealer.email || '-'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{dealer.phone || '-'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{new Date(dealer.createdAt).toLocaleDateString()}</td>
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
