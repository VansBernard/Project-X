using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace DesktopAppFresh
{
    public static class PermanentReleaseCache
    {
        private static readonly string CacheDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            "released-devices");
        private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("ProjectXPermanentRelease2026");

        public static bool IsReleased(string? deviceId, string? contractId)
        {
            if (string.IsNullOrWhiteSpace(deviceId) || string.IsNullOrWhiteSpace(contractId)) return false;

            try
            {
                var encrypted = File.ReadAllBytes(FilePath(deviceId, contractId));
                var value = ProtectedData.Unprotect(encrypted, Entropy, DataProtectionScope.CurrentUser);
                return Encoding.UTF8.GetString(value) == "released";
            }
            catch
            {
                return false;
            }
        }

        public static bool SaveRelease(string deviceId, string contractId)
        {
            try
            {
                Directory.CreateDirectory(CacheDirectory);
                var encrypted = ProtectedData.Protect(Encoding.UTF8.GetBytes("released"), Entropy, DataProtectionScope.CurrentUser);
                File.WriteAllBytes(FilePath(deviceId, contractId), encrypted);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static string FilePath(string deviceId, string contractId)
        {
            var key = SHA256.HashData(Encoding.UTF8.GetBytes($"{deviceId}:{contractId}"));
            return Path.Combine(CacheDirectory, $"{Convert.ToHexString(key)}.dat");
        }
    }
}