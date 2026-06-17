/**
 * Customers Management Page
 */
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { DataTable, Column } from '../components/DataTable';
import { useCustomers } from '../lib/hooks';
import { useApp } from '../context/AppContext';
import * as Types from '../types';
import { StatusBadge } from '../components/StatusBadge';

export default function CustomersPage() {
  const { customers, total, loading, error, fetch } = useCustomers();
  const { setSelectedCustomerId } = useApp();
  const [filters, setFilters] = useState<Types.CustomerFilters>({
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleSelectCustomer = (customer: Types.Customer) => {
    setSelectedCustomerId(customer.id);
  };

  const columns: Column<Types.Customer>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'totalSpent',
      label: 'Total Spent',
      render: (value) => `$${Number(value).toLocaleString()}`,
    },
    {
      key: 'activeContracts',
      label: 'Active Contracts',
      render: (value) => (
        <span className="px-2 py-1 rounded text-sm font-medium bg-green-100 text-green-800">
          {value}
        </span>
      ),
    },
    {
      key: 'licenseCount',
      label: 'Licenses',
      render: (value) => (
        <span className="px-2 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800">
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={String(value) as any} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`Managing ${total} customers across all dealers`}
      />

      <Card>
        <DataTable
          columns={columns}
          data={customers}
          loading={loading}
          error={error}
          onRowClick={handleSelectCustomer}
          emptyMessage="No customers found"
        />
      </Card>
    </div>
  );
}
