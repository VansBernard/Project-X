import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { apiClient } from '../lib/api';

type HealthState = 'checking' | 'connected' | 'offline';

export function DashboardPage() {
  const { user } = useAuth();
  const [healthState, setHealthState] = useState<HealthState>('checking');

  const stats = [
    { label: 'Total Tenants', value: '-', marker: 'T' },
    { label: 'Active Users', value: '-', marker: 'U' },
    { label: 'Devices', value: '-', marker: 'D' },
    { label: 'Licenses', value: '-', marker: 'L' },
  ];

  useEffect(() => {
    let cancelled = false;

    apiClient.health()
      .then((response) => {
        if (!cancelled) {
          setHealthState(response.data.status === 'ok' ? 'connected' : 'offline');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealthState('offline');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const healthBadge = {
    checking: {
      className: 'bg-gray-100 text-gray-700',
      text: 'Checking',
    },
    connected: {
      className: 'bg-green-100 text-green-800',
      text: 'Connected',
    },
    offline: {
      className: 'bg-red-100 text-red-800',
      text: 'Offline',
    },
  }[healthState];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-2">
            Welcome, {user?.roleName || 'Administrator'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-gray-500 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 font-semibold">
                  {stat.marker}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/tenants"
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Manage Tenants</p>
                <p className="text-sm text-gray-500">View and manage tenant organizations</p>
              </Link>
              <Link
                to="/users"
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-500">Control user accounts and permissions</p>
              </Link>
              <Link
                to="/devices"
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Manage Devices</p>
                <p className="text-sm text-gray-500">Track and manage registered devices</p>
              </Link>
              <Link
                to="/licenses"
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Manage Licenses</p>
                <p className="text-sm text-gray-500">Issue and revoke licenses and unlock tokens</p>
              </Link>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">API Connection</span>
              <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full font-medium ${healthBadge.className}`}>
                {healthBadge.text}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">Database</span>
              <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full font-medium ${healthBadge.className}`}>
                {healthState === 'connected' ? 'Reachable through API' : healthBadge.text}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
