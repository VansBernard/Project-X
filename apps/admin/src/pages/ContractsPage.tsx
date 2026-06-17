/**
 * Contracts Management Page
 */
import { useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { DataTable, Column } from '../components/DataTable';
import { useContracts } from '../lib/hooks';
import * as Types from '../types';
import { StatusBadge } from '../components/StatusBadge';

export default function ContractsPage() {
  const { contracts, total, loading, error, fetch } = useContracts();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const columns: Column<Types.Contract>[] = [
    { key: 'id', label: 'Contract ID', sortable: true },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <span className="px-2 py-1 rounded text-sm font-medium bg-purple-100 text-purple-800">
          {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
        </span>
      ),
    },
    {
      key: 'value',
      label: 'Value',
      render: (value) => `$${Number(value).toLocaleString()}`,
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
      key: 'startDate',
      label: 'Start Date',
      render: (value) => new Date(String(value)).toLocaleDateString(),
    },
    {
      key: 'endDate',
      label: 'End Date',
      render: (value) => new Date(String(value)).toLocaleDateString(),
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
        title="Contracts"
        subtitle={`Managing ${total} contracts`}
      />

      <Card>
        <DataTable
          columns={columns}
          data={contracts}
          loading={loading}
          error={error}
          emptyMessage="No contracts found"
        />
      </Card>
    </div>
  );
}
