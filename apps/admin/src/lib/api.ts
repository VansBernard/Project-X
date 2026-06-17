// API Client for Project X Admin Dashboard

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
const DEALER_SLUG = import.meta.env.VITE_DEALER_SLUG || 'default';

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

export interface HealthResponse {
  data: {
    status: string;
  };
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
}

export type DealerListResponse = PageResult<DealerListItem>;
export type CustomerListResponse = PageResult<CustomerListItem>;

export interface LicensePayload {
  licenseId?: string;
  deviceId: string;
  contractId: string;
  issuedAt: string;
  expiresAt: string;
  keyId: string;
  algorithm: 'RSA-SHA256';
}

export interface LicenseDetail {
  id: string;
  licenseKey: string;
  dealerId?: string;
  customerId?: string;
  deviceId?: string;
  contractId?: string | null;
  status: string;
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

export interface ApiResponse<T> {
  data: T;
}

export type IssueLicenseResponse = ApiResponse<LicenseDetail>;
export type LicenseDetailResponse = ApiResponse<LicenseDetail>;
export type DeviceActiveLicenseResponse = ApiResponse<DeviceActiveLicenseResult>;
export type VerifyLicenseResponse = ApiResponse<LicenseVerificationResult>;

export interface IssueLicenseRequest {
  deviceId: string;
  contractId: string;
  expiresAt: string;
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
        errorMessage = errorBody.message || errorMessage;
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
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.fetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        dealerSlug: this.dealerSlug,
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

  async issueLicense(input: IssueLicenseRequest): Promise<IssueLicenseResponse> {
    return this.fetch<IssueLicenseResponse>('/licenses', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: input.deviceId,
        contractId: input.contractId,
        expiresAt: input.expiresAt,
        metadata: input.metadata ?? {},
      }),
    });
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

  async verifyLicense(payload: LicensePayload, signature: string): Promise<VerifyLicenseResponse> {
    return this.fetch<VerifyLicenseResponse>('/licenses/verify', {
      method: 'POST',
      body: JSON.stringify({ payload, signature }),
    });
  }

  async health(): Promise<HealthResponse> {
    return this.fetch<HealthResponse>('/health', {
      method: 'GET',
    });
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const apiClient = new ApiClient(API_URL, DEALER_SLUG);
