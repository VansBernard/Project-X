// API Client for Project X Admin Dashboard

const configuredApiUrl = import.meta.env.VITE_API_URL || '/api/v1';
const API_URL = configuredApiUrl.endsWith('/api/v1')
  ? configuredApiUrl
  : `${configuredApiUrl.replace(/\/$/, '')}/api/v1`;
const DEALER_SLUG = import.meta.env.VITE_DEALER_SLUG || 'test-dealer';

export interface ApiError {
  message: string;
  status: number;
  data?: unknown;
}

export interface LoginRequest {
  dealerSlug: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
    sessionId: string;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
    sessionId: string;
  };
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  dealerSlug: string;
  email: string;
}

export interface ForgotPasswordResponse {
  data: {
    message: string;
    resetToken?: string;
    expiresInMinutes?: number;
  };
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface DealerSignupRequest {
  dealer: {
    name: string;
    legalName?: string;
    slug: string;
    email?: string;
    phone?: string;
    country?: string;
    timezone?: string;
    metadata?: Record<string, unknown>;
  };
  owner: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export interface DealerSignupResponse {
  data: {
    dealer: {
      id: string;
      name: string;
      slug: string;
      email?: string | null;
      country?: string | null;
    };
    owner: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      roleName: string;
    };
    login: {
      dealerSlug: string;
      email: string;
    };
    verificationEmailSent?: boolean;
  };
}

export interface MeResponse {
  data: {
    userId: string;
    dealerId: string;
    roleId?: string;
    roleName?: string;
    permissions: string[];
    sessionId: string;
  };
}

export interface NotificationItem {
  id: string;
  dealerId: string;
  title: string;
  message: string;
  category: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  source: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  dealerName?: string | null;
  dealerSlug?: string | null;
  customerName?: string | null;
}

export interface HealthResponse {
  data: {
    status: string;
  };
}

export interface DashboardTransaction {
  id: string;
  type: 'payment' | 'contract' | 'license';
  amount: number;
  description: string;
  date: string;
  status: 'success' | 'pending' | 'failed';
}

export interface DashboardAdItem {
  id: string;
  imageUrl: string;
  caption: string;
}

export interface DashboardAdsResponse {
  data: {
    adsEnabled: boolean;
    ads: DashboardAdItem[];
  };
}

export interface DashboardStats {
  dealerCount: number;
  totalRevenue: number;
  outstandingBalance: number;
  activeDevices: number;
  activeContracts: number;
  licensesIssued: number;
  adsEnabled?: boolean;
  ads?: DashboardAdItem[];
  adsPosted?: number;
  recentTransactions: DashboardTransaction[];
}

export interface PageResult<T> {
  data: T[];
  nextCursor: string | null;
}

export interface DealerListItem {
  id: string;
  name: string;
  legalName?: string | null;
  slug: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  timezone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deviceCount?: number;
  totalRevenue?: number;
}

export interface CustomerListItem {
  id: string;
  dealerId: string;
  fullName?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  contractCount?: number;
}

export interface DeviceListItem {
  id: string;
  serialNumber: string;
  manufacturer?: string | null;
  model?: string | null;
  status: string;
  createdAt?: string | null;
  lastSeenAt?: string | null;
  customer?: {
    fullName?: string | null;
    firstName: string;
    lastName: string;
  } | null;
  contract?: {
    contractNumber: string;
    currency: string;
    remainingBalance: number;
  } | null;
  license?: {
    licenseKey: string | null;
    licenseType?: string | null;
    expiresAt?: string | null;
  } | null;
}

export interface PaymentListItem {
  id: string;
  providerReference: string;
  provider: string;
  status: 'pending' | 'successful' | 'failed' | 'reversed' | 'refunded';
  currency: string;
  amount: number | string;
  paidAt?: string | null;
  createdAt: string;
  customer: {
    fullName?: string | null;
    firstName: string;
    lastName: string;
  };
}

export type DealerListResponse = PageResult<DealerListItem>;
export type CustomerListResponse = PageResult<CustomerListItem>;
export type DeviceListResponse = PageResult<DeviceListItem>;
export type PaymentListResponse = PageResult<PaymentListItem>;
export type ContractListResponse = PageResult<ContractListItem>;

export interface ContractListItem {
  id: string;
  contractNumber: string;
  status: string;
  currency: string;
  deviceLabel?: string | null;
  customerName?: string | null;
  amountPaid: number | string;
  remainingBalance: number | string;
  nextDueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  metadata?: Record<string, unknown>;
  customer?: {
    fullName?: string | null;
    firstName: string;
    lastName: string;
  } | null;
  device?: {
    serialNumber: string;
    manufacturer?: string | null;
    model?: string | null;
  } | null;
}

export interface ResolvePayoutAccountRequest {
  country: 'NG' | 'GH';
  bankCode: string;
  accountNumber: string;
}

export interface UpdatePayoutDetailsRequest {
  payoutMethod: 'bank' | 'mobile_money';
  bankCode?: string;
  accountNumber: string;
  accountHolderName?: string;
  mobileMoneyProvider?: string;
  currency: string;
}

export interface ContractDetail {
  id: string;
  contractNumber: string;
  status: string;
  currency: string;
  deviceId?: string | null;
  deviceLabel?: string | null;
  customerId: string;
  customerName?: string | null;
  amountPaid: number | string;
  remainingBalance: number | string;
  installmentAmount: number | string;
  depositAmount: number | string;
  devicePrice: number | string;
  principalAmount: number | string;
  totalAmount: number | string;
  firstDueDate?: string | null;
  nextDueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  statusReason?: string | null;
  metadata: Record<string, unknown>;
  installments: Array<{
    id: string;
    sequenceNumber: number;
    dueDate: string;
    amountDue: number | string;
    status: string;
  }>;
}

export interface CreateContractRequest {
  customerId: string;
  deviceId?: string;
  contractNumber: string;
  currency: string;
  devicePrice: number;
  deposit: number;
  installmentAmount: number;
  firstDueDate: string;
  installmentCount: number;
  metadata?: Record<string, unknown>;
}

export interface DealerProfile {
  id: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  country?: string;
  timezone: string;
  slug: string;
  status: string;
  currency: string;
}

export interface UpdateContractStatusRequest {
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  reason?: string;
}

export interface CancellationRequest {
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  decisionReason?: string | null;
  requestedAt?: string | null;
  decidedAt?: string | null;
}

export type ContractDetailResponse = ApiResponse<ContractDetail>;

export interface LicensePayload {
  licenseId?: string;
  deviceId: string;
  contractId: string;
  issuedAt: string;
  expiresAt?: string;
  licenseType?: 'temporary' | 'permanent';
  keyId: string;
  algorithm: 'RSA-SHA256';
}

export interface LicenseDetail {
  id: string;
  licenseKey: string | null;
  dealerId?: string;
  customerId?: string;
  deviceId?: string;
  contractId?: string | null;
  status: string;
  licenseType?: 'temporary' | 'permanent';
  issuedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  signature: string;
  signatureAlgorithm: string;
  metadata: Record<string, unknown>;
  signedPayload?: LicensePayload;
  customer?: {
    id: string;
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  device?: {
    id: string;
    serialNumber?: string | null;
    status?: string | null;
  };
  contract?: {
    id: string;
    status?: string | null;
  };
}

export interface LicenseVerificationResult {
  valid: boolean;
  signatureValid: boolean;
  notExpired: boolean;
  issued: boolean;
  deviceId: string;
  contractId: string;
  expiresAt: string;
}

export interface DeviceActiveLicenseResult {
  unlockAllowed: boolean;
  license: LicenseDetail | null;
  verification: LicenseVerificationResult | null;
}

export interface RecoveryAuthorizationRequest {
  recoveryId: string;
}

export interface RecoveryAuthorizationResult {
  authorizationId: string;
  deviceId: string;
  recoveryId: string;
  authorization: string;
  issuedAt: string;
  expiresAt: string;
  recoveryDurationHours: number;
}

export interface ApiResponse<T> {
  data: T;
}

export type DashboardStatsResponse = ApiResponse<DashboardStats>;
export type IssueLicenseResponse = ApiResponse<LicenseDetail>;
export type LicenseDetailResponse = ApiResponse<LicenseDetail>;
export type DeviceActiveLicenseResponse = ApiResponse<DeviceActiveLicenseResult>;
export type VerifyLicenseResponse = ApiResponse<LicenseVerificationResult>;
export type LicenseListResponse = ApiResponse<LicenseDetail[]>;
export type RecoveryAuthorizationResponse = ApiResponse<RecoveryAuthorizationResult>;

export interface IssueLicenseRequest {
  deviceId: string;
  contractId: string;
  licenseType?: 'temporary' | 'permanent';
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

class ApiClient {
  private apiUrl: string;
  private dealerSlug: string;

  constructor(baseUrl: string, dealerSlug: string) {
    this.apiUrl = baseUrl;
    this.dealerSlug = dealerSlug;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getAccessToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      let errorData: unknown;

      try {
        const errorBody = await response.json();
        const nestedMessage = typeof errorBody === 'object' && errorBody !== null && 'error' in errorBody
          ? (errorBody as { error?: { message?: string } }).error?.message
          : undefined;
        errorMessage = nestedMessage || (errorBody as { message?: string })?.message || errorMessage;
        errorData = errorBody;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      const error: ApiError = {
        message: errorMessage,
        status: response.status,
        data: errorData,
      };

      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  // Auth Methods
  async login(email: string, password: string, dealerSlug = this.dealerSlug): Promise<LoginResponse> {
    const response = await this.fetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        dealerSlug,
        email,
        password,
      }),
    });
    
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    return response;
  }

  async refresh(): Promise<RefreshResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw { message: 'No refresh token available', status: 401 };
    }

    const response = await this.fetch<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    this.setTokens(response.data.accessToken, response.data.refreshToken);
    return response;
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await this.fetch<void>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Continue with logout even if API call fails
      }
    }
    this.clearTokens();
  }

  async signupDealer(input: DealerSignupRequest): Promise<DealerSignupResponse> {
    return this.fetch<DealerSignupResponse>('/dealers/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async resolvePayoutAccount(input: ResolvePayoutAccountRequest): Promise<{ data: { accountName: string; accountNumber: string } }> {
    return this.fetch('/dealers/payout-account/resolve', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listPayoutBanks(country: 'NG' | 'GH' | 'KE' | 'ZA'): Promise<{ data: Array<{ name: string; code: string }> }> {
    return this.fetch(`/dealers/payout-banks?country=${encodeURIComponent(country)}`, { method: 'GET' });
  }

  async verifyEmail(token: string): Promise<void> {
    await this.fetch<void>('/auth/email/verify', { method: 'POST', body: JSON.stringify({ token }) });
  }

  async confirmDealerSignup(token: string): Promise<{ auth?: { accessToken: string; refreshToken: string; expiresInSeconds: number; sessionId: string } }> {
    const response = await this.fetch<{ auth?: { accessToken: string; refreshToken: string; expiresInSeconds: number; sessionId: string } }>('/dealers/signup/confirm', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    
    // If auth tokens are returned, store them automatically
    if (response?.auth) {
      this.setTokens(response.auth.accessToken, response.auth.refreshToken);
    }
    
    return response;
  }

  async resendVerification(dealerSlug: string, email: string): Promise<void> {
    await this.fetch<void>('/auth/email/verification/resend', { method: 'POST', body: JSON.stringify({ dealerSlug, email }) });
  }

  async updatePayoutDetails(input: UpdatePayoutDetailsRequest): Promise<void> {
    await this.fetch<void>('/dealer/payout-details', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async getDealerProfile(): Promise<{ data: DealerProfile }> {
    return this.fetch('/dealer/profile', { method: 'GET' });
  }

  async updateDealerProfile(input: { name?: string; legalName?: string; email?: string; phone?: string; country?: string; timezone?: string }): Promise<{ data: { id: string; name: string; legalName?: string; email?: string; phone?: string; country?: string; timezone: string; slug: string; status: string } }> {
    return this.fetch('/dealer/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    return this.fetch<ForgotPasswordResponse>('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({
        dealerSlug: this.dealerSlug,
        email,
      }),
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    return this.fetch<void>('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async getMe(): Promise<MeResponse> {
    return this.fetch<MeResponse>('/auth/me', {
      method: 'GET',
    });
  }

  async listDealers(params?: { take?: number; cursor?: string; status?: string }): Promise<DealerListResponse> {
    const query = new URLSearchParams();

    if (params?.take) query.set('take', String(params.take));
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString();
    const endpoint = queryString ? `/admin/dealers?${queryString}` : '/admin/dealers';

    return this.fetch<DealerListResponse>(endpoint, {
      method: 'GET',
    });
  }

  async searchCustomers(params?: { q?: string; status?: string; email?: string; phone?: string; nationalId?: string; take?: number; cursor?: string }): Promise<CustomerListResponse> {
    const query = new URLSearchParams();

    if (params?.q) query.set('q', params.q);
    if (params?.status) query.set('status', params.status);
    if (params?.email) query.set('email', params.email);
    if (params?.phone) query.set('phone', params.phone);
    if (params?.nationalId) query.set('nationalId', params.nationalId);
    if (params?.take) query.set('take', String(params.take));
    if (params?.cursor) query.set('cursor', params.cursor);

    const queryString = query.toString();
    const endpoint = queryString ? `/customers?${queryString}` : '/customers';

    return this.fetch<CustomerListResponse>(endpoint, {
      method: 'GET',
    });
  }

  async getCustomer(customerId: string): Promise<{ data: CustomerListItem }> {
    return this.fetch<{ data: CustomerListItem }>(`/customers/${customerId}`, {
      method: 'GET',
    });
  }

  async getCustomerDevices(customerId: string): Promise<{ data: DeviceListItem[] }> {
    return this.fetch<{ data: DeviceListItem[] }>(`/customers/${customerId}/devices`, {
      method: 'GET',
    });
  }

  async listDevices(params?: { take?: number; cursor?: string; status?: string }): Promise<DeviceListResponse> {
    const query = new URLSearchParams();

    if (params?.take) query.set('take', String(params.take));
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString();
    const endpoint = queryString ? `/dealer/devices?${queryString}` : '/dealer/devices';

    return this.fetch<DeviceListResponse>(endpoint, { method: 'GET' });
  }

  async listPayments(params?: { take?: number; cursor?: string; status?: string }): Promise<PaymentListResponse> {
    const query = new URLSearchParams();

    if (params?.take) query.set('take', String(params.take));
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString();
    const endpoint = queryString ? `/dealer/payments?${queryString}` : '/dealer/payments';

    return this.fetch<PaymentListResponse>(endpoint, { method: 'GET' });
  }

  async listContracts(params?: { take?: number; cursor?: string; status?: string; customerId?: string; deviceId?: string }): Promise<ContractListResponse> {
    const query = new URLSearchParams();

    if (params?.take) query.set('take', String(params.take));
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.status) query.set('status', params.status);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.deviceId) query.set('deviceId', params.deviceId);

    const queryString = query.toString();
    const endpoint = queryString ? `/contracts?${queryString}` : '/contracts';

    return this.fetch<ContractListResponse>(endpoint, { method: 'GET' });
  }

  async getContract(contractId: string): Promise<ContractDetailResponse> {
    return this.fetch<ContractDetailResponse>(`/contracts/${encodeURIComponent(contractId)}`, {
      method: 'GET',
    });
  }

  async createContract(input: CreateContractRequest): Promise<ContractDetailResponse> {
    return this.fetch<ContractDetailResponse>('/contracts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateContractStatus(contractId: string, input: UpdateContractStatusRequest): Promise<ContractDetailResponse> {
    return this.fetch<ContractDetailResponse>(`/contracts/${encodeURIComponent(contractId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async getCancellationRequest(contractId: string): Promise<{ data: CancellationRequest | null }> {
    return this.fetch<{ data: CancellationRequest | null }>(`/contracts/${encodeURIComponent(contractId)}/cancellation-request`, {
      method: 'GET',
    });
  }

  async decideCancellation(contractId: string, decision: 'approved' | 'rejected', reason?: string): Promise<ContractDetailResponse> {
    return this.fetch<ContractDetailResponse>(`/contracts/${encodeURIComponent(contractId)}/cancellation-request`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, reason: reason || undefined }),
    });
  }

  async issueLicense(input: IssueLicenseRequest): Promise<IssueLicenseResponse> {
    return this.fetch<IssueLicenseResponse>('/licenses', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: input.deviceId,
        contractId: input.contractId,
        licenseType: input.licenseType ?? 'temporary',
        expiresAt: input.expiresAt,
        metadata: input.metadata ?? {},
      }),
    });
  }

  async listLicenses(params?: { take?: number; status?: string; deviceId?: string; contractId?: string; customerId?: string }): Promise<LicenseListResponse> {
    const query = new URLSearchParams();

    if (params?.take) query.set('take', String(params.take));
    if (params?.status) query.set('status', params.status);
    if (params?.deviceId) query.set('deviceId', params.deviceId);
    if (params?.contractId) query.set('contractId', params.contractId);
    if (params?.customerId) query.set('customerId', params.customerId);

    const queryString = query.toString();
    const endpoint = queryString ? `/licenses?${queryString}` : '/licenses';

    return this.fetch<LicenseListResponse>(endpoint, { method: 'GET' });
  }

  async getLicense(licenseId: string): Promise<LicenseDetailResponse> {
    return this.fetch<LicenseDetailResponse>(`/licenses/${encodeURIComponent(licenseId)}`, {
      method: 'GET',
    });
  }

  async getDeviceActiveLicense(deviceId: string): Promise<DeviceActiveLicenseResponse> {
    return this.fetch<DeviceActiveLicenseResponse>(`/devices/${encodeURIComponent(deviceId)}/license`, {
      method: 'GET',
    });
  }

  async issueRecoveryAuthorization(input: RecoveryAuthorizationRequest): Promise<RecoveryAuthorizationResponse> {
    return this.fetch<RecoveryAuthorizationResponse>('/devices/recovery/authorize', {
      method: 'POST',
      body: JSON.stringify({
        recoveryId: input.recoveryId,
      }),
    });
  }

  async verifyLicense(payload: LicensePayload, signature: string): Promise<VerifyLicenseResponse> {
    return this.fetch<VerifyLicenseResponse>('/licenses/verify', {
      method: 'POST',
      body: JSON.stringify({ payload, signature }),
    });
  }

  async listNotifications(): Promise<{ data: NotificationItem[] }> {
    return this.fetch<{ data: NotificationItem[] }>('/notifications', {
      method: 'GET',
    });
  }

  async reportTamperEvent(input: { deviceId?: string; contractId?: string; eventType?: string; message?: string; occurredAt?: string; severity?: 'info' | 'warning' | 'critical' | 'success'; source?: string }): Promise<{ data: { id: string; createdAt: string } }> {
    return this.fetch<{ data: { id: string; createdAt: string } }>('/system/tamper-events', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async health(): Promise<HealthResponse> {
    return this.fetch<HealthResponse>('/health', {
      method: 'GET',
    });
  }

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    return this.fetch<DashboardStatsResponse>('/dashboard/stats', {
      method: 'GET',
    });
  }

  async getDashboardAds(): Promise<DashboardAdsResponse> {
    return this.fetch<DashboardAdsResponse>('/dashboard/ads', {
      method: 'GET',
    });
  }

  async saveDashboardAds(payload: { adsEnabled: boolean; ads: DashboardAdItem[] }): Promise<DashboardAdsResponse> {
    return this.fetch<DashboardAdsResponse>('/dashboard/ads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const apiClient = new ApiClient(API_URL, DEALER_SLUG);
