/**
 * Dashboard Module Types
 */

export interface DashboardStatsResponse {
  dealerCount: number;
  totalRevenue: number;
  outstandingBalance: number;
  activeDevices: number;
  activeContracts: number;
  licensesIssued: number;
  adsEnabled: boolean;
  ads: Array<{ id: string; imageUrl: string; caption: string }>;
  recentTransactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'payment' | 'contract' | 'license';
  amount: number;
  description: string;
  date: string;
  status: 'success' | 'pending' | 'failed';
}

export interface AnalyticsDataResponse {
  date: string;
  revenue: number;
  newDeals: number;
  licensesIssued: number;
  devicesActive: number;
}

export interface AnalyticsQuery {
  startDate: string;
  endDate: string;
}
