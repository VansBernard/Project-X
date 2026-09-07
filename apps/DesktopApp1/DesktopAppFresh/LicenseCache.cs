using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DesktopAppFresh
{
    public static class LicenseCache
    {
        private static readonly string CacheFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            "licenses.json");

        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };
        private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("ProjectXLicenseCacheEntropy2026");

        public static LicenseData? FindLicense(string deviceId, string contractId, string licenseKey)
        {
            var normalizedKey = NormalizeLicenseKey(licenseKey);
            var enteredKeyHash = HashLicenseKey(normalizedKey);
            var cached = LoadCache();
            var entry = cached.FirstOrDefault(item =>
                string.Equals(item.DeviceId, deviceId, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(item.ContractId, contractId, StringComparison.OrdinalIgnoreCase) &&
                (!string.IsNullOrWhiteSpace(item.LicenseKeyHash)
                    ? string.Equals(item.LicenseKeyHash, enteredKeyHash, StringComparison.OrdinalIgnoreCase)
                    : string.Equals(NormalizeLicenseKey(item.LicenseKey), normalizedKey, StringComparison.OrdinalIgnoreCase)));

            return entry?.ToLicenseData();
        }

        public static LicenseData? FindLatestActiveLicense(string deviceId, string? contractId)
        {
            var cached = LoadCache();
            var candidates = cached.Where(item =>
                string.Equals(item.DeviceId, deviceId, StringComparison.OrdinalIgnoreCase) &&
                (string.IsNullOrWhiteSpace(contractId) || string.Equals(item.ContractId, contractId, StringComparison.OrdinalIgnoreCase)))
                .ToList();

            var permanent = candidates.FirstOrDefault(item => string.Equals(item.LicenseType, "permanent", StringComparison.OrdinalIgnoreCase));
            if (permanent != null)
            {
                return permanent.ToLicenseData();
            }

            var temporary = candidates
                .Where(item => item.ExpiresAt == null || item.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(item => item.ExpiresAt ?? DateTime.MaxValue)
                .FirstOrDefault();

            return temporary?.ToLicenseData();
        }

        private static string NormalizeLicenseKey(string value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : value.Replace("-", string.Empty).Replace(" ", string.Empty).Trim().ToUpperInvariant();
        }

        public static bool SaveLicense(LicenseData license)
        {
            if (license == null || license.SignedPayload == null || string.IsNullOrWhiteSpace(license.Signature) || string.IsNullOrWhiteSpace(license.LicenseKey))
            {
                return false;
            }

            var cached = LoadCache();
            var payloadJson = JsonSerializer.Serialize(license.SignedPayload.Value, JsonOptions);
            var entry = cached.FirstOrDefault(item =>
                string.Equals(item.Id, license.Id, StringComparison.OrdinalIgnoreCase) ||
                (string.Equals(item.DeviceId, license.DeviceId, StringComparison.OrdinalIgnoreCase) &&
                 string.Equals(item.ContractId, license.ContractId, StringComparison.OrdinalIgnoreCase) &&
                 string.Equals(item.LicenseKey, license.LicenseKey, StringComparison.OrdinalIgnoreCase)));

            if (entry == null)
            {
                entry = new CachedLicense();
                cached.Add(entry);
            }

            entry.Id = license.Id;
            entry.DeviceId = license.DeviceId ?? string.Empty;
            entry.ContractId = license.ContractId ?? string.Empty;
            entry.LicenseKey = license.LicenseKey ?? string.Empty;
            entry.LicenseType = license.LicenseType ?? "temporary";
            entry.SignedPayloadJson = payloadJson;
            entry.Signature = license.Signature;
            entry.IssuedAt = license.IssuedAt;
            entry.ExpiresAt = license.ExpiresAt;
            entry.CachedAt = DateTime.UtcNow;

            return SaveCache(cached);
        }

        public static bool SaveOfflineVoucher(LicenseData license)
        {
            if (license?.SignedPayload == null || string.IsNullOrWhiteSpace(license.Signature)
                || !license.SignedPayload.Value.TryGetProperty("licenseKeyHash", out var hashElement)
                || string.IsNullOrWhiteSpace(hashElement.GetString()))
            {
                return false;
            }

            var cached = LoadCache();
            var entry = cached.FirstOrDefault(item => string.Equals(item.Id, license.Id, StringComparison.OrdinalIgnoreCase));
            if (entry == null)
            {
                entry = new CachedLicense();
                cached.Add(entry);
            }

            entry.Id = license.Id;
            entry.DeviceId = license.DeviceId ?? string.Empty;
            entry.ContractId = license.ContractId ?? string.Empty;
            entry.LicenseKey = string.Empty;
            entry.LicenseKeyHash = hashElement.GetString()!;
            entry.LicenseType = license.LicenseType ?? "temporary";
            entry.SignedPayloadJson = JsonSerializer.Serialize(license.SignedPayload.Value, JsonOptions);
            entry.Signature = license.Signature;
            entry.IssuedAt = license.IssuedAt;
            entry.ExpiresAt = license.ExpiresAt;
            entry.CachedAt = DateTime.UtcNow;
            return SaveCache(cached);
        }

        private static List<CachedLicense> LoadCache()
        {
            try
            {
                if (!File.Exists(CacheFilePath))
                {
                    EnsureCacheDirectoryExists();
                    return new List<CachedLicense>();
                }

                var encrypted = File.ReadAllBytes(CacheFilePath);
                var json = Encoding.UTF8.GetString(ProtectedData.Unprotect(encrypted, Entropy, DataProtectionScope.CurrentUser));
                if (string.IsNullOrWhiteSpace(json))
                {
                    return new List<CachedLicense>();
                }

                return JsonSerializer.Deserialize<List<CachedLicense>>(json, JsonOptions) ?? new List<CachedLicense>();
            }
            catch
            {
                // A cache which cannot be authenticated and decrypted must never
                // be trusted as a license source. The user can re-sync online.
                return new List<CachedLicense>();
            }
        }

        private static bool SaveCache(List<CachedLicense> cache)
        {
            try
            {
                EnsureCacheDirectoryExists();
                var json = JsonSerializer.Serialize(cache, JsonOptions);
                var encrypted = ProtectedData.Protect(Encoding.UTF8.GetBytes(json), Entropy, DataProtectionScope.CurrentUser);
                File.WriteAllBytes(CacheFilePath, encrypted);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static string HashLicenseKey(string normalizedKey)
        {
            var bytes = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(normalizedKey));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        private static void EnsureCacheDirectoryExists()
        {
            var directory = Path.GetDirectoryName(CacheFilePath);
            if (!string.IsNullOrWhiteSpace(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }
        }

        private sealed class CachedLicense
        {
            public string Id { get; set; } = string.Empty;
            public string DeviceId { get; set; } = string.Empty;
            public string ContractId { get; set; } = string.Empty;
            public string LicenseKey { get; set; } = string.Empty;
            public string LicenseKeyHash { get; set; } = string.Empty;
            public string LicenseType { get; set; } = string.Empty;
            public string SignedPayloadJson { get; set; } = string.Empty;
            public string Signature { get; set; } = string.Empty;
            public DateTime? IssuedAt { get; set; }
            public DateTime? ExpiresAt { get; set; }
            public DateTime CachedAt { get; set; }

            public LicenseData ToLicenseData()
            {
                using var document = JsonDocument.Parse(SignedPayloadJson);
                return new LicenseData
                {
                    Id = Id,
                    LicenseKey = LicenseKey,
                    LicenseType = LicenseType,
                    IssuedAt = IssuedAt,
                    ExpiresAt = ExpiresAt,
                    DeviceId = DeviceId,
                    ContractId = ContractId,
                    SignedPayload = document.RootElement.Clone(),
                    Signature = Signature
                };
            }
        }
    }
}
