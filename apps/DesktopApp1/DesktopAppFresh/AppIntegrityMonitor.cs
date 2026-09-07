using System;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;

namespace DesktopAppFresh
{
    public static class AppIntegrityMonitor
    {
        private const string IntegrityFileName = "app-integrity.json";
        private static readonly string IntegrityPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            IntegrityFileName);

        public static IntegrityCheckResult CheckStartupIntegrity()
        {
            var currentPath = Environment.ProcessPath;
            if (string.IsNullOrWhiteSpace(currentPath))
            {
                return new IntegrityCheckResult
                {
                    IsValid = false,
                    Message = "Unable to read the running application path for integrity validation."
                };
            }

            var currentHash = ComputeSha256(currentPath);
            var baseline = LoadBaseline();

            if (baseline == null)
            {
                SaveBaseline(currentHash, currentPath);
                return new IntegrityCheckResult
                {
                    IsValid = true,
                    CurrentHash = currentHash,
                    Message = "Application integrity baseline initialized."
                };
            }

            if (!string.Equals(baseline.Hash, currentHash, StringComparison.OrdinalIgnoreCase))
            {
                return new IntegrityCheckResult
                {
                    IsValid = false,
                    CurrentHash = currentHash,
                    BaselineHash = baseline.Hash,
                    Message = "Application files appear to have changed. Please contact support and do not continue."
                };
            }

            return new IntegrityCheckResult
            {
                IsValid = true,
                CurrentHash = currentHash,
                BaselineHash = baseline.Hash,
                Message = "Application files verified."
            };
        }

        public static void SaveBaseline(string hash, string appPath)
        {
            try
            {
                var directory = Path.GetDirectoryName(IntegrityPath);
                if (!string.IsNullOrWhiteSpace(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                var payload = new IntegrityBaseline
                {
                    Hash = hash,
                    AppPath = appPath,
                    LastVerifiedUtc = DateTime.UtcNow
                };

                File.WriteAllText(IntegrityPath, JsonSerializer.Serialize(payload));
            }
            catch
            {
                // Best effort only; do not block startup on integrity baseline write failure.
            }
        }

        private static IntegrityBaseline? LoadBaseline()
        {
            try
            {
                if (!File.Exists(IntegrityPath))
                {
                    return null;
                }

                var content = File.ReadAllText(IntegrityPath);
                if (string.IsNullOrWhiteSpace(content))
                {
                    return null;
                }

                return JsonSerializer.Deserialize<IntegrityBaseline>(content);
            }
            catch
            {
                return null;
            }
        }

        private static string ComputeSha256(string filePath)
        {
            using var stream = File.OpenRead(filePath);
            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(stream);
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        public sealed class IntegrityCheckResult
        {
            public bool IsValid { get; set; }
            public string? CurrentHash { get; set; }
            public string? BaselineHash { get; set; }
            public string Message { get; set; } = string.Empty;
        }

        private sealed class IntegrityBaseline
        {
            public string Hash { get; set; } = string.Empty;
            public string AppPath { get; set; } = string.Empty;
            public DateTime LastVerifiedUtc { get; set; }
        }
    }
}
