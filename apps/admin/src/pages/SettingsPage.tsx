import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card } from '../components/Card';

export function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-2">Manage system and account settings</p>
        </div>

        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">Settings features coming soon</p>
            <p className="text-sm text-gray-400 mt-2">This page will allow you to manage system configuration and preferences</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
