import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card } from '../components/Card';

export function AuditLogsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-2">View system and user activity logs</p>
        </div>

        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">Audit log features coming soon</p>
            <p className="text-sm text-gray-400 mt-2">This page will allow you to view comprehensive audit logs of system activities</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
