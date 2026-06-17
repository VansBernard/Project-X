/**
 * Project X Admin Dashboard Type Definitions
 */

// Analytics & Dashboard
export interface DashboardStats {
  totalRevenue: number;
  outstandingBalance: number;
  activeDevices: number;
  activeContracts: number;
  licensesIssued: number;
  recentTransactions: Transaction[];
}

export interface AnalyticsData {
  date: string;
  revenue: number;
  newDeals: number;
  licensesIssued: number;
  devicesActive: number;
}

// Dealers
export interface Dealer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  joinDate: string;
  totalRevenue: number;
  activeCustomers: number;
  totalContracts: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  address?: string;
  city?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealerFilters {
  status?: 'active' | 'inactive' | 'suspended';
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  search?: string;
  page?: number;
  limit?: number;
}

// Customers
export interface Customer {
  id: string;
  dealerId: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  totalSpent: number;
  activeContracts: number;
  licenseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilters {
  dealerId?: string;
  status?: 'active' | 'inactive' | 'pending';
  search?: string;
  page?: number;
  limit?: number;
}

// Devices
export interface Device {
  id: string;
  customerId: string;
  dealerId: string;
  serialNumber: string;
  deviceType: string;
  status: 'active' | 'locked' | 'inactive' | 'compromised';
  licenseStatus: 'valid' | 'expiring' | 'expired' | 'invalid';
  lastSync: string;
  licenseExpiry: string;
  licenseId: string;
  installationDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceFilters {
  customerId?: string;
  dealerId?: string;
  status?: string;
  licenseStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Contracts
export interface Contract {
  id: string;
  dealerId: string;
  customerId: string;
  type: 'monthly' | 'quarterly' | 'annual';
  startDate: string;
  endDate: string;
  value: number;
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  licenseCount: number;
  automicRenewal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContractFilters {
  dealerId?: string;
  customerId?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

// Payments
export interface Payment {
  id: string;
  contractId: string;
  customerId: string;
  dealerId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  method: 'card' | 'bank' | 'wallet' | 'manual';
  transactionId: string;
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentFilters {
  status?: string;
  method?: string;
  customerId?: string;
  dealerId?: string;
  dateRange?: [string, string];
  page?: number;
  limit?: number;
}

// Licenses
export interface License {
  id: string;
  customerId: string;
  dealerId: string;
  contractId: string;
  deviceId: string;
  licenseKey: string;
  status: 'active' | 'expiring' | 'expired' | 'suspended';
  issuedAt: string;
  expiresAt: string;
  daysRemaining: number;
  type: 'standard' | 'professional' | 'enterprise';
  maxDevices: number;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseFilters {
  customerId?: string;
  dealerId?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

// Reports
export interface Report {
  id: string;
  title: string;
  type: 'revenue' | 'licenses' | 'devices' | 'customers' | 'contracts' | 'payments';
  generatedBy: string;
  generatedAt: string;
  dateRange: [string, string];
  data: Record<string, unknown>;
  format: 'pdf' | 'csv' | 'json';
}

export interface ReportFilters {
  type?: string;
  dateRange?: [string, string];
  page?: number;
  limit?: number;
}

// Transactions
export interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'adjustment';
  amount: number;
  reference: string;
  customerId?: string;
  dealerId?: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

// User Settings
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  twoFactorEnabled: boolean;
  sessionTimeout: number;
}

// Admin User
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'support';
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
