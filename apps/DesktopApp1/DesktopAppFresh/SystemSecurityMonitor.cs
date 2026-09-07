using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace DesktopAppFresh
{
    /// <summary>
    /// Comprehensive OS-level security validation and monitoring.
    /// Checks BitLocker, Secure Boot, TPM, and other OS security features.
    /// Stores baseline state and detects security regressions.
    /// </summary>
    public static class SystemSecurityMonitor
    {
        private static readonly string CachePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            "SecurityBaseline.json"
        );

        public sealed class SecurityCheckResult
        {
            public bool Overall { get; set; }
            public BitLockerValidator.BitLockerInfo BitLocker { get; set; } = new();
            public SecureBootValidator.SecureBootInfo SecureBoot { get; set; } = new();
            public TpmValidator.TpmInfo Tpm { get; set; } = new();
            public List<SecurityWarning> Warnings { get; set; } = new();
            public DateTime CheckedAt { get; set; }
        }

        public sealed class SecurityWarning
        {
            public string Code { get; set; } = string.Empty;
            public string Title { get; set; } = string.Empty;
            public string Message { get; set; } = string.Empty;
            public SecuritySeverity Severity { get; set; }
        }

        public enum SecuritySeverity
        {
            Info,
            Warning,
            Error,
            Critical
        }

        private sealed class SecurityBaseline
        {
            public string? BitLockerStatus { get; set; }
            public string? SecureBootStatus { get; set; }
            public string? TpmStatus { get; set; }
            public string? HardwareFingerprint { get; set; }
            public DateTime BaselinedAt { get; set; }
            public DateTime LastCheckedAt { get; set; }
        }

        /// <summary>
        /// Performs a comprehensive security check of the system.
        /// </summary>
        public static SecurityCheckResult Check()
        {
            var bitLockerInfo = BitLockerValidator.GetSystemDriveStatus();
            var secureBootInfo = SecureBootValidator.GetStatus();
            var tpmInfo = TpmValidator.GetStatus();

            var result = new SecurityCheckResult
            {
                BitLocker = bitLockerInfo,
                SecureBoot = secureBootInfo,
                Tpm = tpmInfo,
                CheckedAt = DateTime.UtcNow
            };

            // Generate warnings based on findings
            var warnings = new List<SecurityWarning>();

            // BitLocker checks
            if (bitLockerInfo.Status == BitLockerValidator.BitLockerStatus.Disabled)
            {
                warnings.Add(new SecurityWarning
                {
                    Code = "BITLOCKER_DISABLED",
                    Title = "Disk Encryption Disabled",
                    Message = "BitLocker is disabled. The system drive is not encrypted. Enable BitLocker to protect data at rest.",
                    Severity = SecuritySeverity.Critical
                });
            }
            else if (bitLockerInfo.Status == BitLockerValidator.BitLockerStatus.EncryptionInProgress)
            {
                warnings.Add(new SecurityWarning
                {
                    Code = "BITLOCKER_ENCRYPTING",
                    Title = "Disk Encryption In Progress",
                    Message = "BitLocker encryption is in progress. The system drive will be fully encrypted soon.",
                    Severity = SecuritySeverity.Warning
                });
            }
            else if (bitLockerInfo.Status == BitLockerValidator.BitLockerStatus.EncryptionPaused)
            {
                warnings.Add(new SecurityWarning
                {
                    Code = "BITLOCKER_PAUSED",
                    Title = "Disk Encryption Paused",
                    Message = "BitLocker encryption is paused. Resume encryption to protect the system drive.",
                    Severity = SecuritySeverity.Error
                });
            }

            // Secure Boot checks
            if (secureBootInfo.Status == SecureBootValidator.SecureBootStatus.Disabled)
            {
                warnings.Add(new SecurityWarning
                {
                    Code = "SECURE_BOOT_DISABLED",
                    Title = "Secure Boot Disabled",
                    Message = "Secure Boot is disabled in UEFI firmware. Enable Secure Boot to prevent unauthorized code from running at startup.",
                    Severity = SecuritySeverity.Critical
                });
            }
            else if (secureBootInfo.Status == SecureBootValidator.SecureBootStatus.NotSupported)
            {
                warnings.Add(new SecurityWarning
                {
                    Code = "SECURE_BOOT_NOT_SUPPORTED",
                    Title = "Secure Boot Not Supported",
                    Message = "This system does not support Secure Boot. Consider upgrading to a UEFI-based system.",
                    Severity = SecuritySeverity.Warning
                });
            }

            // TPM checks
            if (tpmInfo.Status == TpmValidator.TpmStatus.NotAvailable)
            {
                warnings.Add(new SecurityWarning
                {
                    Code = "TPM_NOT_AVAILABLE",
                    Title = "TPM Not Available",
                    Message = "No TPM device detected. TPM provides hardware-backed security features. Consider a system with TPM 2.0.",
                    Severity = SecuritySeverity.Warning
                });
            }
            else if (tpmInfo.Status == TpmValidator.TpmStatus.NotReady)
            {
                warnings.Add(new SecurityWarning
                {
                    Code = "TPM_NOT_READY",
                    Title = "TPM Not Initialized",
                    Message = "TPM is present but not fully initialized. Initialize TPM in system BIOS/UEFI settings.",
                    Severity = SecuritySeverity.Error
                });
            }

            // Check for security regressions against baseline
            var regressions = CheckForRegressions(bitLockerInfo, secureBootInfo, tpmInfo);
            warnings.AddRange(regressions);

            result.Warnings = warnings;

            // Overall security posture: critical if any critical warnings, otherwise check if all essential features are active
            result.Overall =
                bitLockerInfo.IsEncrypted &&
                secureBootInfo.Status == SecureBootValidator.SecureBootStatus.Enabled &&
                tpmInfo.Status == TpmValidator.TpmStatus.Ready &&
                !warnings.Any(w => w.Severity == SecuritySeverity.Critical);

            return result;
        }

        /// <summary>
        /// Saves the current security state as a baseline for future regression detection.
        /// </summary>
        public static void SaveBaseline()
        {
            try
            {
                var bitLockerInfo = BitLockerValidator.GetSystemDriveStatus();
                var secureBootInfo = SecureBootValidator.GetStatus();
                var tpmInfo = TpmValidator.GetStatus();

                var baseline = new SecurityBaseline
                {
                    BitLockerStatus = bitLockerInfo.Status.ToString(),
                    SecureBootStatus = secureBootInfo.Status.ToString(),
                    TpmStatus = tpmInfo.Status.ToString(),
                    HardwareFingerprint = HardwareIdentifier.GetStableFingerprint(),
                    BaselinedAt = DateTime.UtcNow,
                    LastCheckedAt = DateTime.UtcNow
                };

                var directory = Path.GetDirectoryName(CachePath);
                if (!string.IsNullOrWhiteSpace(directory) && !Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                var json = JsonSerializer.Serialize(baseline);
                var encrypted = ProtectedData.Protect(
                    Encoding.UTF8.GetBytes(json),
                    null,
                    DataProtectionScope.CurrentUser
                );

                File.WriteAllBytes(CachePath, encrypted);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SystemSecurityMonitor] Failed to save baseline: {ex.Message}");
            }
        }

        /// <summary>
        /// Loads the saved security baseline.
        /// </summary>
        private static SecurityBaseline? LoadBaseline()
        {
            try
            {
                if (!File.Exists(CachePath))
                    return null;

                var encrypted = File.ReadAllBytes(CachePath);
                var decrypted = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
                var json = Encoding.UTF8.GetString(decrypted);
                return JsonSerializer.Deserialize<SecurityBaseline>(json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SystemSecurityMonitor] Failed to load baseline: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Detects security regressions (e.g., BitLocker was enabled but is now disabled).
        /// </summary>
        private static List<SecurityWarning> CheckForRegressions(
            BitLockerValidator.BitLockerInfo bitLockerInfo,
            SecureBootValidator.SecureBootInfo secureBootInfo,
            TpmValidator.TpmInfo tpmInfo)
        {
            var warnings = new List<SecurityWarning>();
            var baseline = LoadBaseline();

            if (baseline == null)
                return warnings;

            // Check BitLocker regression
            if (baseline.BitLockerStatus == BitLockerValidator.BitLockerStatus.FullyEncrypted.ToString()
                && bitLockerInfo.Status != BitLockerValidator.BitLockerStatus.FullyEncrypted)
            {
                warnings.Add(new SecurityWarning
                {
                    Code = "SECURITY_REGRESSION_BITLOCKER",
                    Title = "BitLocker Regression Detected",
                    Message = "BitLocker was previously enabled but is now disabled. Re-enable disk encryption immediately.",
                    Severity = SecuritySeverity.Critical
                });
            }

            // Check Secure Boot regression
            if (baseline.SecureBootStatus == SecureBootValidator.SecureBootStatus.Enabled.ToString()
                && secureBootInfo.Status != SecureBootValidator.SecureBootStatus.Enabled)
            {
                warnings.Add(new SecurityWarning
                {
                    Code = "SECURITY_REGRESSION_SECURE_BOOT",
                    Title = "Secure Boot Regression Detected",
                    Message = "Secure Boot was previously enabled but is now disabled. Re-enable Secure Boot in UEFI firmware.",
                    Severity = SecuritySeverity.Critical
                });
            }

            // Check hardware identity tampering
            if (baseline.HardwareFingerprint != null
                && baseline.HardwareFingerprint != HardwareIdentifier.GetStableFingerprint())
            {
                warnings.Add(new SecurityWarning
                {
                    Code = "HARDWARE_IDENTITY_CHANGED",
                    Title = "Hardware Identity Mismatch",
                    Message = "The system hardware fingerprint has changed. This could indicate hardware tampering or significant system modifications.",
                    Severity = SecuritySeverity.Critical
                });
            }

            return warnings;
        }

        /// <summary>
        /// Formats security check results for logging or display.
        /// </summary>
        public static string FormatReport(SecurityCheckResult result)
        {
            var sb = new StringBuilder();
            sb.AppendLine("=== System Security Report ===");
            sb.AppendLine($"Checked at: {result.CheckedAt:o}");
            sb.AppendLine($"Overall Secure: {(result.Overall ? "✓ YES" : "✗ NO")}");
            sb.AppendLine();

            sb.AppendLine("BitLocker (Disk Encryption):");
            sb.AppendLine($"  Status: {result.BitLocker.Status}");
            sb.AppendLine($"  Encrypted: {(result.BitLocker.IsEncrypted ? "✓ Yes" : "✗ No")}");
            if (!string.IsNullOrWhiteSpace(result.BitLocker.ErrorMessage))
                sb.AppendLine($"  Note: {result.BitLocker.ErrorMessage}");
            sb.AppendLine();

            sb.AppendLine("Secure Boot:");
            sb.AppendLine($"  Status: {result.SecureBoot.Status}");
            sb.AppendLine($"  Enabled: {(result.SecureBoot.UefiSecureBootEnabled ? "✓ Yes" : "✗ No")}");
            if (!string.IsNullOrWhiteSpace(result.SecureBoot.ErrorMessage))
                sb.AppendLine($"  Note: {result.SecureBoot.ErrorMessage}");
            sb.AppendLine();

            sb.AppendLine("TPM (Trusted Platform Module):");
            sb.AppendLine($"  Status: {result.Tpm.Status}");
            sb.AppendLine($"  Ready: {(result.Tpm.IsReady ? "✓ Yes" : "✗ No")}");
            if (!string.IsNullOrWhiteSpace(result.Tpm.TpmVersion))
                sb.AppendLine($"  Version: {result.Tpm.TpmVersion}");
            if (!string.IsNullOrWhiteSpace(result.Tpm.ErrorMessage))
                sb.AppendLine($"  Note: {result.Tpm.ErrorMessage}");
            sb.AppendLine();

            if (result.Warnings.Any())
            {
                sb.AppendLine("Warnings & Issues:");
                foreach (var warning in result.Warnings)
                {
                    var severityIcon = warning.Severity switch
                    {
                        SecuritySeverity.Info => "ℹ",
                        SecuritySeverity.Warning => "⚠",
                        SecuritySeverity.Error => "✗",
                        SecuritySeverity.Critical => "🔴",
                        _ => "?"
                    };

                    sb.AppendLine($"  {severityIcon} [{warning.Severity}] {warning.Title}");
                    sb.AppendLine($"     {warning.Message}");
                }
            }
            else
            {
                sb.AppendLine("✓ No security warnings detected.");
            }

            return sb.ToString();
        }
    }
}
