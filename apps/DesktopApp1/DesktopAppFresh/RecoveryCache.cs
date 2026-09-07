using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DesktopAppFresh
{
    public sealed class RecoveryAcceptance
    {
        public string AuthorizationId { get; set; } = string.Empty;
        public DateTime AcceptedAt { get; set; }
        public DateTime ActiveUntil { get; set; }
    }

    public static class RecoveryCache
    {
        private static readonly string CacheFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            "recovery.json");
        private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("ProjectXRecoveryCacheEntropy2026");
        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        public static int GetSuccessfulCount(string deviceId)
        {
            return Load().Where(item => string.Equals(item.DeviceId, deviceId, StringComparison.OrdinalIgnoreCase))
                .SelectMany(item => item.Acceptances)
                .Count();
        }

        public static RecoveryAcceptance? FindActive(string deviceId, DateTime now)
        {
            return Load().Where(item => string.Equals(item.DeviceId, deviceId, StringComparison.OrdinalIgnoreCase))
                .SelectMany(item => item.Acceptances)
                .Where(item => item.ActiveUntil > now)
                .OrderByDescending(item => item.ActiveUntil)
                .FirstOrDefault();
        }

        public static bool HasAccepted(string deviceId, string authorizationId)
        {
            return Load().Any(item => string.Equals(item.DeviceId, deviceId, StringComparison.OrdinalIgnoreCase)
                && item.Acceptances.Any(acceptance => string.Equals(acceptance.AuthorizationId, authorizationId, StringComparison.OrdinalIgnoreCase)));
        }

        public static bool SaveAcceptance(string deviceId, RecoveryAcceptance acceptance)
        {
            var entries = Load();
            var entry = entries.FirstOrDefault(item => string.Equals(item.DeviceId, deviceId, StringComparison.OrdinalIgnoreCase));
            if (entry == null)
            {
                entry = new RecoveryDeviceState { DeviceId = deviceId };
                entries.Add(entry);
            }

            entry.Acceptances.Add(acceptance);
            return Save(entries);
        }

        private static List<RecoveryDeviceState> Load()
        {
            try
            {
                if (!File.Exists(CacheFilePath)) return new List<RecoveryDeviceState>();
                var encrypted = File.ReadAllBytes(CacheFilePath);
                var json = Encoding.UTF8.GetString(ProtectedData.Unprotect(encrypted, Entropy, DataProtectionScope.CurrentUser));
                return JsonSerializer.Deserialize<List<RecoveryDeviceState>>(json, JsonOptions) ?? new List<RecoveryDeviceState>();
            }
            catch
            {
                return new List<RecoveryDeviceState>();
            }
        }

        private static bool Save(List<RecoveryDeviceState> entries)
        {
            try
            {
                var directory = Path.GetDirectoryName(CacheFilePath);
                if (!string.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);
                var json = JsonSerializer.Serialize(entries, JsonOptions);
                var encrypted = ProtectedData.Protect(Encoding.UTF8.GetBytes(json), Entropy, DataProtectionScope.CurrentUser);
                File.WriteAllBytes(CacheFilePath, encrypted);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private sealed class RecoveryDeviceState
        {
            public string DeviceId { get; set; } = string.Empty;
            public List<RecoveryAcceptance> Acceptances { get; set; } = new List<RecoveryAcceptance>();
        }
    }
}
