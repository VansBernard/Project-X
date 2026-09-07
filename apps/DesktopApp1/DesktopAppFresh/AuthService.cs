using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Text.Json.Serialization;

namespace DesktopAppFresh
{
    public static class AuthService
    {
        private static readonly string DefaultApiBaseUrl = "http://localhost:4000/api/v1";
        private static readonly HttpClient HttpClient = new HttpClient();
        private static readonly string TokenFilePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ProjectX", "auth.json");
        private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("ProjectXAuthTokenEntropy2026");

        public static string? AccessToken { get; private set; }
        public static string? RefreshToken { get; private set; }
        public static string? DealerSlug { get; private set; }
        public static string? DealerName { get; private set; }
        public static string? DealerEmail { get; private set; }
        public static string? DashboardContractNumber { get; private set; }
        public static string? DashboardDeviceSerialNumber { get; private set; }
        public static string? DashboardManufacturer { get; private set; }
        public static string? DashboardModel { get; private set; }
        public static string? DashboardCurrency { get; private set; }
        public static decimal? DashboardDevicePrice { get; private set; }
        public static decimal? DashboardDeposit { get; private set; }
        public static decimal? DashboardInstallmentAmount { get; private set; }
        public static int? DashboardInstallmentCount { get; private set; }
        public static DateTime? DashboardFirstDueDate { get; private set; }

        public static bool HasAccessToken => !string.IsNullOrWhiteSpace(AccessToken);
        public static bool HasRefreshToken => !string.IsNullOrWhiteSpace(RefreshToken);
        public static bool HasSessionInfo => HasAccessToken && !string.IsNullOrWhiteSpace(DealerSlug);
        public static bool HasDeviceContext => HasSessionInfo && !string.IsNullOrWhiteSpace(DeviceId) && !string.IsNullOrWhiteSpace(ContractId);

        public static string? DeviceId { get; private set; }
        public static string? ContractId { get; private set; }

        public static string BaseUrl => GetApiBaseUrl();

        private static string GetApiBaseUrl()
        {
            var apiUrl = Environment.GetEnvironmentVariable("PROJECTX_API_BASE_URL")?.Trim();
            return string.IsNullOrWhiteSpace(apiUrl) ? DefaultApiBaseUrl : apiUrl;
        }

        public static async Task<LoginResponse> LoginAsync(string dealerSlug, string email, string password)
        {
            var request = new LoginRequest
            {
                DealerSlug = dealerSlug.Trim(),
                Email = email.Trim().ToLowerInvariant(),
                Password = password
            };

            var response = await HttpClient.PostAsJsonAsync($"{BaseUrl}/auth/login", request);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                var errorDetails = string.IsNullOrWhiteSpace(body) ? response.ReasonPhrase : body;
                throw new InvalidOperationException($"Login failed: {response.StatusCode} - {errorDetails}");
            }

            var wrapper = await response.Content.ReadFromJsonAsync<ApiResponse<LoginResponse>>();
            if (wrapper?.Data == null)
            {
                throw new InvalidOperationException("Login response was empty.");
            }

            var result = wrapper.Data;
            SetTokens(result.AccessToken, result.RefreshToken);
            return result;
        }

        private sealed class ApiResponse<T>
        {
            public T? Data { get; set; }
        }

        public static void SetTokens(string accessToken, string refreshToken)
        {
            AccessToken = accessToken;
            RefreshToken = refreshToken;
            SaveTokens();
        }

        public static void SetSessionData(string dealerSlug, string dealerName, string dealerEmail)
        {
            DealerSlug = dealerSlug;
            DealerName = dealerName;
            DealerEmail = dealerEmail;
            SaveTokens();
        }

        public static void SetDeviceContext(string deviceId, string contractId)
        {
            DeviceId = deviceId;
            ContractId = contractId;
            SaveTokens();
        }

        public static void SetRegistrationSnapshot(
            string deviceId,
            string contractId,
            string contractNumber,
            string deviceSerialNumber,
            string manufacturer,
            string model,
            string currency,
            decimal devicePrice,
            decimal deposit,
            decimal installmentAmount,
            int installmentCount,
            DateTime? firstDueDate,
            string paymentUrl)
        {
            DeviceId = deviceId;
            ContractId = contractId;
            DashboardContractNumber = contractNumber;
            DashboardDeviceSerialNumber = deviceSerialNumber;
            DashboardManufacturer = manufacturer;
            DashboardModel = model;
            DashboardCurrency = currency;
            DashboardDevicePrice = devicePrice;
            DashboardDeposit = deposit;
            DashboardInstallmentAmount = installmentAmount;
            DashboardInstallmentCount = installmentCount;
            DashboardFirstDueDate = firstDueDate;
            PaymentUrl = paymentUrl;
            SaveTokens();
        }

        public static DashboardSnapshot? GetRegistrationSnapshot()
        {
            var hasAnyData = !string.IsNullOrWhiteSpace(DeviceId)
                || !string.IsNullOrWhiteSpace(ContractId)
                || !string.IsNullOrWhiteSpace(DashboardContractNumber)
                || !string.IsNullOrWhiteSpace(DashboardModel);

            if (!hasAnyData)
            {
                return null;
            }

            return new DashboardSnapshot
            {
                DeviceId = DeviceId,
                ContractId = ContractId,
                ContractNumber = DashboardContractNumber,
                DeviceSerialNumber = DashboardDeviceSerialNumber,
                Manufacturer = DashboardManufacturer,
                Model = DashboardModel,
                Currency = DashboardCurrency,
                DevicePrice = DashboardDevicePrice,
                Deposit = DashboardDeposit,
                InstallmentAmount = DashboardInstallmentAmount,
                InstallmentCount = DashboardInstallmentCount,
                FirstDueDate = DashboardFirstDueDate
                ,PaymentUrl = PaymentUrl
            };
        }

        public static void ClearDeviceContext()
        {
            DeviceId = null;
            ContractId = null;
            SaveTokens();
        }

        public static void ClearTokens()
        {
            ClearSession();
        }

        public static void ClearSession()
        {
            AccessToken = null;
            RefreshToken = null;
            DealerSlug = null;
            DealerName = null;
            DealerEmail = null;
            DeviceId = null;
            ContractId = null;
            DashboardContractNumber = null;
            DashboardDeviceSerialNumber = null;
            DashboardManufacturer = null;
            DashboardModel = null;
            DashboardCurrency = null;
            DashboardDevicePrice = null;
            DashboardDeposit = null;
            DashboardInstallmentAmount = null;
            DashboardInstallmentCount = null;
            DashboardFirstDueDate = null;
            PaymentUrl = null;

            if (File.Exists(TokenFilePath))
            {
                try
                {
                    File.Delete(TokenFilePath);
                }
                catch
                {
                    // ignore cleanup failure
                }
            }
        }

        public static bool AccessTokenIsExpired()
        {
            if (!HasAccessToken)
            {
                return true;
            }

            try
            {
                var segments = AccessToken!.Split('.');
                if (segments.Length < 3)
                {
                    return true;
                }

                var payload = segments[1].Replace('-', '+').Replace('_', '/');
                switch (payload.Length % 4)
                {
                    case 2:
                        payload += "==";
                        break;
                    case 3:
                        payload += "=";
                        break;
                    case 1:
                        payload += "===";
                        break;
                }

                var payloadBytes = Convert.FromBase64String(payload);
                using var document = JsonDocument.Parse(payloadBytes);
                if (!document.RootElement.TryGetProperty("exp", out var expElement) || expElement.ValueKind != JsonValueKind.Number)
                {
                    return false;
                }

                var expiresAtUnix = expElement.GetInt64();
                var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                return nowUnix >= expiresAtUnix;
            }
            catch
            {
                return true;
            }
        }

        public static async Task<bool> TryRefreshAccessTokenAsync()
        {
            if (!HasRefreshToken)
            {
                return false;
            }

            try
            {
                var response = await HttpClient.PostAsJsonAsync($"{BaseUrl}/auth/refresh", new RefreshRequest { RefreshToken = RefreshToken! });
                if (!response.IsSuccessStatusCode)
                {
                    ClearSession();
                    return false;
                }

                var wrapper = await response.Content.ReadFromJsonAsync<ApiResponse<LoginResponse>>();
                if (wrapper?.Data == null)
                {
                    ClearSession();
                    return false;
                }

                SetTokens(wrapper.Data.AccessToken, wrapper.Data.RefreshToken);
                return true;
            }
            catch
            {
                ClearSession();
                return false;
            }
        }

        public static bool LoadTokens()
        {
            try
            {
                if (!File.Exists(TokenFilePath))
                    return false;

                var encryptedData = File.ReadAllBytes(TokenFilePath);
                var decryptedData = ProtectedData.Unprotect(encryptedData, Entropy, DataProtectionScope.CurrentUser);
                var json = Encoding.UTF8.GetString(decryptedData);
                var tokens = JsonSerializer.Deserialize<TokenStore>(json);
                if (tokens == null)
                    return false;

                AccessToken = tokens.AccessToken;
                RefreshToken = tokens.RefreshToken;
                DealerSlug = tokens.DealerSlug;
                DealerName = tokens.DealerName;
                DealerEmail = tokens.DealerEmail;
                DeviceId = tokens.DeviceId;
                ContractId = tokens.ContractId;
                DashboardContractNumber = tokens.DashboardContractNumber;
                DashboardDeviceSerialNumber = tokens.DashboardDeviceSerialNumber;
                DashboardManufacturer = tokens.DashboardManufacturer;
                DashboardModel = tokens.DashboardModel;
                DashboardCurrency = tokens.DashboardCurrency;
                DashboardDevicePrice = tokens.DashboardDevicePrice;
                DashboardDeposit = tokens.DashboardDeposit;
                DashboardInstallmentAmount = tokens.DashboardInstallmentAmount;
                DashboardInstallmentCount = tokens.DashboardInstallmentCount;
                DashboardFirstDueDate = tokens.DashboardFirstDueDate;
                PaymentUrl = tokens.PaymentUrl;
                return HasAccessToken;
            }
            catch
            {
                return false;
            }
        }

        private static void SaveTokens()
        {
            try
            {
                var directory = Path.GetDirectoryName(TokenFilePath);
                if (!string.IsNullOrWhiteSpace(directory) && !Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                var tokens = new TokenStore
                {
                    AccessToken = AccessToken,
                    RefreshToken = RefreshToken,
                    DealerSlug = DealerSlug,
                    DealerName = DealerName,
                    DealerEmail = DealerEmail,
                    DeviceId = DeviceId,
                    ContractId = ContractId,
                    DashboardContractNumber = DashboardContractNumber,
                    DashboardDeviceSerialNumber = DashboardDeviceSerialNumber,
                    DashboardManufacturer = DashboardManufacturer,
                    DashboardModel = DashboardModel,
                    DashboardCurrency = DashboardCurrency,
                    DashboardDevicePrice = DashboardDevicePrice,
                    DashboardDeposit = DashboardDeposit,
                    DashboardInstallmentAmount = DashboardInstallmentAmount,
                    DashboardInstallmentCount = DashboardInstallmentCount,
                    DashboardFirstDueDate = DashboardFirstDueDate
                    ,PaymentUrl = PaymentUrl
                };

                var json = JsonSerializer.Serialize(tokens);
                var encryptedData = ProtectedData.Protect(Encoding.UTF8.GetBytes(json), Entropy, DataProtectionScope.CurrentUser);
                File.WriteAllBytes(TokenFilePath, encryptedData);
            }
            catch
            {
                // Do not fail silently in a way that crashes the app.
            }
        }

        public static AuthenticationHeaderValue? GetAuthorizationHeader()
        {
            if (!HasAccessToken || AccessTokenIsExpired())
                return null;

            return new AuthenticationHeaderValue("Bearer", AccessToken!);
        }

        public static string? PaymentUrl { get; private set; }
    }

    public sealed class RefreshRequest
    {
        [JsonPropertyName("refreshToken")]
        public string RefreshToken { get; set; } = string.Empty;
    }

    public sealed class LoginRequest
    {
        public string DealerSlug { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public sealed class LoginResponse
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public int ExpiresInSeconds { get; set; }
        public string SessionId { get; set; } = string.Empty;
    }

    public sealed class DashboardSnapshot
    {
        public string? DeviceId { get; set; }
        public string? ContractId { get; set; }
        public string? ContractNumber { get; set; }
        public string? DeviceSerialNumber { get; set; }
        public string? Manufacturer { get; set; }
        public string? Model { get; set; }
        public string? Currency { get; set; }
        public decimal? DevicePrice { get; set; }
        public decimal? Deposit { get; set; }
        public decimal? InstallmentAmount { get; set; }
        public int? InstallmentCount { get; set; }
        public DateTime? FirstDueDate { get; set; }
        public string? PaymentUrl { get; set; }
    }

    internal sealed class TokenStore
    {
        public string? AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public string? DealerSlug { get; set; }
        public string? DealerName { get; set; }
        public string? DealerEmail { get; set; }
        public string? DeviceId { get; set; }
        public string? ContractId { get; set; }
        public string? DashboardContractNumber { get; set; }
        public string? DashboardDeviceSerialNumber { get; set; }
        public string? DashboardManufacturer { get; set; }
        public string? DashboardModel { get; set; }
        public string? DashboardCurrency { get; set; }
        public decimal? DashboardDevicePrice { get; set; }
        public decimal? DashboardDeposit { get; set; }
        public decimal? DashboardInstallmentAmount { get; set; }
        public int? DashboardInstallmentCount { get; set; }
        public DateTime? DashboardFirstDueDate { get; set; }
        public string? PaymentUrl { get; set; }
    }
}
