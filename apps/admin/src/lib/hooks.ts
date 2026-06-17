/**
 * API Integration Hooks
 */
import { useState, useCallback } from 'react';
import * as Types from '../types';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

// Utility function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<Types.ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Hook hook template
function useApiData<T>(
  endpoint: string,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall<T>(endpoint);
      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  return { data, loading, error, fetch };
}

// Dashboard Hooks
export function useDashboardStats() {
  const [stats, setStats] = useState<Types.DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall<Types.DashboardStats>('/dashboard/stats');
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetch };
}

export function useAnalyticsData(dateRange: [string, string]) {
  const [data, setData] = useState<Types.AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange[0],
        endDate: dateRange[1],
      });
      const response = await apiCall<Types.AnalyticsData[]>(
        `/analytics?${params.toString()}`
      );
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  return { data, loading, error, fetch };
}

// Dealers Hooks
export function useDealers(filters?: Types.DealerFilters) {
  const [dealers, setDealers] = useState<Types.Dealer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      const response = await apiCall<Types.PaginatedResponse<Types.Dealer>>(
        `/dealers?${params.toString()}`
      );
      if (response.success && response.data) {
        setDealers(response.data.items);
        setTotal(response.data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dealers');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const create = useCallback(async (dealer: Omit<Types.Dealer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await apiCall<Types.Dealer>('/dealers', {
        method: 'POST',
        body: JSON.stringify(dealer),
      });
      if (response.success && response.data) {
        setDealers((prev) => [...prev, response.data!]);
        return response.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dealer');
    }
  }, []);

  const update = useCallback(async (id: string, updates: Partial<Types.Dealer>) => {
    try {
      const response = await apiCall<Types.Dealer>(`/dealers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (response.success && response.data) {
        setDealers((prev) =>
          prev.map((d) => (d.id === id ? response.data! : d))
        );
        return response.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update dealer');
    }
  }, []);

  const delete_ = useCallback(async (id: string) => {
    try {
      await apiCall(`/dealers/${id}`, { method: 'DELETE' });
      setDealers((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete dealer');
    }
  }, []);

  return { dealers, total, loading, error, fetch, create, update, delete: delete_ };
}

// Customers Hooks
export function useCustomers(filters?: Types.CustomerFilters) {
  const [customers, setCustomers] = useState<Types.Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      const response = await apiCall<Types.PaginatedResponse<Types.Customer>>(
        `/customers?${params.toString()}`
      );
      if (response.success && response.data) {
        setCustomers(response.data.items);
        setTotal(response.data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return { customers, total, loading, error, fetch };
}

// Devices Hooks
export function useDevices(filters?: Types.DeviceFilters) {
  const [devices, setDevices] = useState<Types.Device[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      const response = await apiCall<Types.PaginatedResponse<Types.Device>>(
        `/devices?${params.toString()}`
      );
      if (response.success && response.data) {
        setDevices(response.data.items);
        setTotal(response.data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return { devices, total, loading, error, fetch };
}

// Contracts Hooks
export function useContracts(filters?: Types.ContractFilters) {
  const [contracts, setContracts] = useState<Types.Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      const response = await apiCall<Types.PaginatedResponse<Types.Contract>>(
        `/contracts?${params.toString()}`
      );
      if (response.success && response.data) {
        setContracts(response.data.items);
        setTotal(response.data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contracts');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return { contracts, total, loading, error, fetch };
}

// Payments Hooks
export function usePayments(filters?: Types.PaymentFilters) {
  const [payments, setPayments] = useState<Types.Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      const response = await apiCall<Types.PaginatedResponse<Types.Payment>>(
        `/payments?${params.toString()}`
      );
      if (response.success && response.data) {
        setPayments(response.data.items);
        setTotal(response.data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return { payments, total, loading, error, fetch };
}

// Licenses Hooks
export function useLicenses(filters?: Types.LicenseFilters) {
  const [licenses, setLicenses] = useState<Types.License[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      const response = await apiCall<Types.PaginatedResponse<Types.License>>(
        `/licenses?${params.toString()}`
      );
      if (response.success && response.data) {
        setLicenses(response.data.items);
        setTotal(response.data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch licenses');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return { licenses, total, loading, error, fetch };
}

// Reports Hooks
export function useReports(filters?: Types.ReportFilters) {
  const [reports, setReports] = useState<Types.Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      const response = await apiCall<Types.Report[]>(
        `/reports?${params.toString()}`
      );
      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const generate = useCallback(async (reportType: string, dateRange: [string, string]) => {
    try {
      const response = await apiCall<Types.Report>('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ type: reportType, dateRange }),
      });
      if (response.success && response.data) {
        setReports((prev) => [...prev, response.data!]);
        return response.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    }
  }, []);

  return { reports, loading, error, fetch, generate };
}
