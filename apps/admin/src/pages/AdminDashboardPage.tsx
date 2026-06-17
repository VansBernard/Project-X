/**
 * Admin Dashboard Page
 */
import { useEffect } from 'react';
import { KPIGrid, StatCard, ChartContainer, MetricBadge, ProgressBar } from '../components/Analytics';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { DataTable, Column } from '../components/DataTable';
import { useDashboardStats, useAnalyticsData } from '../lib/hooks';
import { useApp } from '../context/AppContext';
import * as Types from '../types';

export default function AdminDashboardPage() {
  const { stats, loading, fetch } = useDashboardStats();
  const { addNotification } = useApp();
  const { data: analyticsData } = useAnalyticsData([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date().toISOString().split('T')[0],
  ]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (stats) {
      addNotification('info', 'Dashboard data loaded');
    }
  }, [stats, addNotification]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to Project X Admin Dashboard"
      />

      {/* Key Performance Indicators */}
      {stats && (
        <KPIGrid>
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            change={{ value: 12, direction: 'up', period: 'vs last month' }}
            icon="💰"
          />
          <StatCard
            title="Outstanding Balance"
            value={`$${stats.outstandingBalance.toLocaleString()}`}
            change={{ value: 5, direction: 'down', period: 'vs last month' }}
            icon="📊"
          />
          <StatCard
            title="Active Devices"
            value={stats.activeDevices}
            change={{ value: 8, direction: 'up', period: 'vs last month' }}
            icon="📱"
          />
          <StatCard
            title="Active Contracts"
            value={stats.activeContracts}
            change={{ value: 3, direction: 'up', period: 'vs last month' }}
            icon="📋"
          />
          <StatCard
            title="Licenses Issued"
            value={stats.licensesIssued}
            change={{ value: 15, direction: 'up', period: 'vs last month' }}
            icon="🔑"
          />
        </KPIGrid>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Breakdown */}
        <div className="lg:col-span-2">
          <ChartContainer
            title="Revenue Trend"
            subtitle="Last 30 days performance"
          >
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Chart visualization placeholder</p>
            </div>
          </ChartContainer>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Revenue Target</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">75%</span>
                </div>
                <ProgressBar value={75} color="green" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Collection Rate</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">92%</span>
                </div>
                <ProgressBar value={92} color="blue" />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Status Summary</h3>
            <div className="space-y-3">
              <MetricBadge label="Active Dealers" value={stats?.activeDevices || 0} color="green" />
              <MetricBadge label="Pending Payments" value={stats?.outstandingBalance || 0} color="yellow" />
              <MetricBadge label="Expired Licenses" value="12" color="red" />
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Transactions */}
      {stats && stats.recentTransactions && (
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Transactions</h3>
          <RecentTransactionsTable transactions={stats.recentTransactions} />
        </Card>
      )}
    </div>
  );
}

function RecentTransactionsTable({ transactions }: { transactions: Types.Transaction[] }) {
  const columns: Column<Types.Transaction>[] = [
    {
      key: 'id',
      label: 'Transaction ID',
      render: (value) => <code className="text-sm">{String(value).slice(0, 8)}</code>,
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          value === 'payment' ? 'bg-green-100 text-green-800' :
          value === 'refund' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
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
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
        </span>
      ),
    },
    {
      key: 'timestamp',
      label: 'Date',
      render: (value) => new Date(String(value)).toLocaleDateString(),
    },
  ];

  return (
    <DataTable<Types.Transaction>
      columns={columns}
      data={transactions.slice(0, 5)}
      emptyMessage="No transactions available"
    />
  );
}
