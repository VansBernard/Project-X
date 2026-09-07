using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace DesktopAppFresh
{
    public sealed class DesktopApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString
        };

        public DesktopApiClient()
        {
            _httpClient = new HttpClient();
            _baseUrl = AuthService.BaseUrl.TrimEnd('/');
        }

        private static void AttachAuthorizationHeader(HttpRequestMessage request)
        {
            var authHeader = AuthService.GetAuthorizationHeader();
            if (authHeader != null)
            {
                request.Headers.Authorization = authHeader;
            }
        }

        private static async Task<T> ParseApiResponseAsync<T>(HttpResponseMessage response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                try
                {
                    using var json = JsonDocument.Parse(body);
                    var rootElement = json.RootElement;
                    if (rootElement.ValueKind == JsonValueKind.Object && rootElement.TryGetProperty("error", out var errorElement))
                    {
                        var message = errorElement.GetProperty("message").GetString() ?? "Request failed.";
                        var fieldsMessage = string.Empty;

                        if (errorElement.TryGetProperty("fields", out var fieldsElement) && fieldsElement.ValueKind == JsonValueKind.Array)
                        {
                            var fieldMessages = new List<string>();
                            foreach (var field in fieldsElement.EnumerateArray())
                            {
                                var path = field.TryGetProperty("path", out var pathElement) ? pathElement.GetString() : null;
                                var fieldMsg = field.TryGetProperty("message", out var msgElement) ? msgElement.GetString() : null;
                                if (!string.IsNullOrWhiteSpace(path) && !string.IsNullOrWhiteSpace(fieldMsg))
                                {
                                    fieldMessages.Add($"{path}: {fieldMsg}");
                                }
                            }

                            if (fieldMessages.Count > 0)
                            {
                                fieldsMessage = " " + string.Join("; ", fieldMessages);
                            }
                        }

                        throw new InvalidOperationException($"API request failed: {response.StatusCode} - {message}{fieldsMessage}");
                    }
                }
                catch (JsonException)
                {
                    // ignore parse failures and throw the raw body below
                }

                throw new InvalidOperationException($"API request failed: {response.StatusCode} - {body}");
            }

            var bodyText = await response.Content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(bodyText))
            {
                throw new InvalidOperationException("API response was empty.");
            }

            using var document = JsonDocument.Parse(bodyText);
            var root = document.RootElement;

            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("data", out var dataElement))
            {
                if (dataElement.ValueKind == JsonValueKind.Null)
                {
                    return default!;
                }

                return dataElement.Deserialize<T>(JsonOptions) ?? throw new InvalidOperationException("API response contained no data.");
            }

            var directResult = root.Deserialize<T>(JsonOptions);
            if (directResult != null)
            {
                return directResult;
            }

            throw new InvalidOperationException("API response could not be parsed.");
        }

        private async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, bool allowRefresh = true)
        {
            if (allowRefresh && AuthService.AccessTokenIsExpired() && AuthService.HasRefreshToken)
            {
                var refreshed = await AuthService.TryRefreshAccessTokenAsync();
                if (!refreshed)
                {
                    throw new InvalidOperationException("Your session expired and a refresh was not available. Please sign in again.");
                }
            }

            AttachAuthorizationHeader(request);
            return await _httpClient.SendAsync(request);
        }

        private async Task<T> GetAsync<T>(string endpoint) where T : class
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}{endpoint}");
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            using var response = await SendAsync(request);
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized && AuthService.HasRefreshToken)
            {
                using var retryRequest = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}{endpoint}");
                retryRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                var refreshed = await AuthService.TryRefreshAccessTokenAsync();
                if (refreshed)
                {
                    using var retryResponse = await SendAsync(retryRequest, allowRefresh: false);
                    return await ParseApiResponseAsync<T>(retryResponse);
                }

                throw new InvalidOperationException("Your session expired and a refresh was not available. Please sign in again.");
            }

            return await ParseApiResponseAsync<T>(response);
        }

        private async Task<T> PostAsync<T>(string endpoint, object payload) where T : class
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}{endpoint}");
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            request.Content = JsonContent.Create(payload, options: JsonOptions);
            using var response = await SendAsync(request);
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized && AuthService.HasRefreshToken)
            {
                using var retryRequest = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}{endpoint}");
                retryRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                retryRequest.Content = JsonContent.Create(payload, options: JsonOptions);
                var refreshed = await AuthService.TryRefreshAccessTokenAsync();
                if (refreshed)
                {
                    using var retryResponse = await SendAsync(retryRequest, allowRefresh: false);
                    return await ParseApiResponseAsync<T>(retryResponse);
                }

                throw new InvalidOperationException("Your session expired and a refresh was not available. Please sign in again.");
            }

            return await ParseApiResponseAsync<T>(response);
        }

        public async Task<CustomerData> CreateCustomerAsync(object payload)
        {
            return await PostAsync<CustomerData>("/dealer/customers", payload);
        }

        public async Task<DeviceData> RegisterDeviceAsync(object payload)
        {
            return await PostAsync<DeviceData>("/dealer/devices", payload);
        }

        public async Task<ContractData> CreateContractAsync(object payload)
        {
            return await PostAsync<ContractData>("/dealer/contracts", payload);
        }

        public async Task<ContractData> GetContractAsync(string contractId)
        {
            return await GetAsync<ContractData>($"/contracts/{Uri.EscapeDataString(contractId)}");
        }

        public async Task<ContractData> RequestCancellationAsync(string contractId, string? reason = null)
        {
            return await PostAsync<ContractData>("/contracts/cancellation-request", new
            {
                contractId,
                reason
            });
        }

        public async Task<CancellationRequestData?> GetCancellationRequestAsync(string contractId)
        {
            return await GetAsync<CancellationRequestData>($"/contracts/{Uri.EscapeDataString(contractId)}/cancellation-request");
        }

        public async Task<RegistrationData> CompleteRegistrationAsync(object payload)
        {
            return await PostAsync<RegistrationData>("/dealer/registrations", payload);
        }

        public async Task<LicenseData> IssuePermanentLicenseAsync(string deviceId, string contractId)
        {
            return await PostAsync<LicenseData>("/licenses", new
            {
                deviceId,
                contractId,
                licenseType = "permanent",
                preProvisioned = true,
                metadata = new { source = "desktop-registration" }
            });
        }

        public async Task<LicenseData> IssueTemporaryVoucherAsync(string deviceId, string contractId, DateTime expiresAt, int sequenceNumber)
        {
            return await PostAsync<LicenseData>("/licenses", new
            {
                deviceId,
                contractId,
                licenseType = "temporary",
                preProvisioned = true,
                expiresAt = expiresAt.ToUniversalTime(),
                metadata = new { source = "desktop-registration-voucher", cacheOnDevice = true, sequenceNumber }
            });
        }

        public async Task<LicenseStatusData> GetDeviceLicenseStatusAsync(string deviceId)
        {
            return await GetAsync<LicenseStatusData>($"/devices/{Uri.EscapeDataString(deviceId)}/license");
        }

        public async Task<LicenseVerificationResult> VerifyLicenseAsync(string licenseKey, string deviceId, string contractId)
        {
            return await PostAsync<LicenseVerificationResult>("/licenses/verify", new { licenseKey, deviceId, contractId });
        }

        public async Task<PaymentCheckoutData> CreateDeviceCheckoutAsync(string deviceId, string contractId)
        {
            return await PostAsync<PaymentCheckoutData>($"/devices/{Uri.EscapeDataString(deviceId)}/payment-checkout", new
            {
                deviceId,
                contractId
            });
        }

        public async Task<bool> ReportTamperEventAsync(string eventType, string message, DateTime occurredAtUtc, string source = "desktop-device", string? deviceId = null, string? contractId = null)
        {
            try
            {
                if (!AuthService.HasAccessToken && AuthService.HasRefreshToken)
                {
                    var refreshed = await AuthService.TryRefreshAccessTokenAsync();
                    if (!refreshed)
                    {
                        return false;
                    }
                }

                if (!AuthService.HasAccessToken)
                {
                    return false;
                }

                using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/system/tamper-events");
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                request.Content = JsonContent.Create(new
                {
                    eventType,
                    message,
                    occurredAt = occurredAtUtc.ToUniversalTime().ToString("O"),
                    source,
                    deviceId,
                    contractId,
                    severity = "critical"
                }, options: JsonOptions);

                using var response = await SendAsync(request, allowRefresh: true);
                if (response.IsSuccessStatusCode)
                {
                    await AntiTamperingService.FlushQueuedTamperEventsAsync();
                    return true;
                }

                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    var refreshed = await AuthService.TryRefreshAccessTokenAsync();
                    if (!refreshed)
                    {
                        return false;
                    }

                    using var retryRequest = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/system/tamper-events");
                    retryRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                    retryRequest.Content = JsonContent.Create(new
                    {
                        eventType,
                        message,
                        occurredAt = occurredAtUtc.ToUniversalTime().ToString("O"),
                        source,
                        deviceId,
                        contractId,
                        severity = "critical"
                    }, options: JsonOptions);

                    using var retryResponse = await SendAsync(retryRequest, allowRefresh: false);
                    if (retryResponse.IsSuccessStatusCode)
                    {
                        await AntiTamperingService.FlushQueuedTamperEventsAsync();
                        return true;
                    }
                }

                return false;
            }
            catch
            {
                return false;
            }
        }

        private sealed class PageResult<T> where T : class
        {
            public T? Data { get; set; }
            public string? NextCursor { get; set; }
        }
    }

    public sealed class ApiResponse<T> where T : class
    {
        public T Data { get; set; } = default!;
    }

    public sealed class CustomerData
    {
        public string Id { get; set; } = string.Empty;
    }

    public sealed class DeviceData
    {
        public string Id { get; set; } = string.Empty;
    }

    public sealed class ContractData
    {
        public string Id { get; set; } = string.Empty;
        public string? CustomerId { get; set; }
        public string? DeviceId { get; set; }
        public string? ContractNumber { get; set; }
        public string? Currency { get; set; }
        public decimal? DevicePrice { get; set; }
        public decimal? DepositAmount { get; set; }
        public decimal? RemainingBalance { get; set; }
        public decimal? InstallmentAmount { get; set; }
        public int? InstallmentCount { get; set; }
        public DateTime? FirstDueDate { get; set; }
        public DateTime? NextDueDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Status { get; set; }
        public object? Metadata { get; set; }
        public ContractDeviceData? Device { get; set; }
        public CustomerData? Customer { get; set; }
    }

    public sealed class CancellationRequestData
    {
        public string Status { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public string? DecisionReason { get; set; }
        public DateTime? RequestedAt { get; set; }
        public DateTime? DecidedAt { get; set; }
    }

    public sealed class ContractDeviceData
    {
        public string? Id { get; set; }
        public string? SerialNumber { get; set; }
    }

    public sealed class RegistrationData
    {
        public CustomerData Customer { get; set; } = new CustomerData();
        public DeviceData Device { get; set; } = new DeviceData();
        public ContractData Contract { get; set; } = new ContractData();
        public List<LicenseData> Vouchers { get; set; } = new List<LicenseData>();
        public LicenseData? PermanentLicense { get; set; }
        public string PaymentUrl { get; set; } = string.Empty;
        public bool Idempotent { get; set; }
    }

    public sealed class LicenseStatusData
    {
        public bool UnlockAllowed { get; set; }
        public LicenseData? License { get; set; }
    }

    public sealed class LicenseData
    {
        public string Id { get; set; } = string.Empty;
        public string? LicenseKey { get; set; }
        public string? Status { get; set; }
        public DateTime? IssuedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string? DeviceId { get; set; }
        public string? ContractId { get; set; }
        public string? KeyId { get; set; }
        public string? Algorithm { get; set; }
        public JsonElement? SignedPayload { get; set; }
        public string? Signature { get; set; }
        public string? LicenseType { get; set; }
        public DeviceData? Device { get; set; }
        public ContractData? Contract { get; set; }
    }

    public sealed class LicenseVerificationResult
    {
        public bool Valid { get; set; }
    }

    public sealed class PaymentCheckoutData
    {
        public string PaymentId { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string AuthorizationUrl { get; set; } = string.Empty;
    }
}
