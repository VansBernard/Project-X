/**
 * Route Configuration
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';

// Pages (lazy loaded for better performance)
import DashboardPage from '../pages/DashboardPage';
import DealersPage from '../pages/DealersPage';
import CustomersPage from '../pages/CustomersPage';
import DevicesPage from '../pages/DevicesPage';
import ContractsPage from '../pages/ContractsPage';
import PaymentsPage from '../pages/PaymentsPage';
import LicensesPage from '../pages/LicensesPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import LoginPage from '../pages/LoginPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dealers" element={<DealersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/licenses" element={<LicensesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
