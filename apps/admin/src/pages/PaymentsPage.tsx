/**
 * Payments Management Page
 */
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { DataTable, Column } from '../components/DataTable';
import { usePayments } from '../lib/hooks';
import { KPIGrid, StatCard } from '../components/Analytics';
import * as Types from '../types';
import { StatusBadge } from '../components/StatusBadge';

export default function PaymentsPage() {
  const { payments, total, loading, error, fetch } = usePayments();
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalPending: 0,
    totalFailed: 0,
  });

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (payments.length > 0) {
      const collected = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      const pending = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);
      const failed = payments
        .filter(p => p.status === 'failed')
        .reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalCollected: collected,
        totalPending: pending,
        totalFailed: failed,
      });
    }
  }, [payments]);

  const columns: Column<Types.Payment>[] = [
    { key: 'id', label: 'Payment ID', sortable: true },
    {
      key: 'method',
      label: 'Method',
      render: (value) => (
        <span className="px-2 py-1 rounded text-sm font-medium bg-indigo-100 text-indigo-800">
          {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => `$${Number(value).toLocaleString()}`,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (value) => new Date(String(value)).toLocaleDateString(),
    },
    {
      key: 'paidDate',
      label: 'Paid Date',
      render: (value) => value ? new Date(String(value)).toLocaleDateString() : '-',
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
        title="Payments"
        subtitle={`Managing ${total} payments`}
      />

      <KPIGrid>
        <StatCard
          title="Total Collected"
          value={`$${stats.totalCollected.toLocaleString()}`}
          icon="💵"
        />
        <StatCard
          title="Pending"
          value={`$${stats.totalPending.toLocaleString()}`}
          icon="⏳"
        />
        <StatCard
          title="Failed"
          value={`$${stats.totalFailed.toLocaleString()}`}
          icon="❌"
        />
      </KPIGrid>

      <Card>
        <DataTable
          columns={columns}
          data={payments}
          loading={loading}
          error={error}
          emptyMessage="No payments found"
        />
      </Card>
    </div>
  );
}
