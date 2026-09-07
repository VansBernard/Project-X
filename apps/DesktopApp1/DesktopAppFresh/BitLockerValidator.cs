using System;
using System.Management;

namespace DesktopAppFresh
{
    /// <summary>
    /// Validates BitLocker (full disk encryption) status on the system.
    /// BitLocker is a Windows feature that encrypts the entire disk to protect data at rest.
    /// </summary>
    public static class BitLockerValidator
    {
        public enum BitLockerStatus
        {
            FullyEncrypted,
            EncryptionInProgress,
            DecryptionInProgress,
            EncryptionPaused,
            Disabled,
            Unknown,
            Error
        }

        public sealed class BitLockerInfo
        {
            public BitLockerStatus Status { get; set; }
            public bool IsEncrypted { get; set; }
            public string DriveLetter { get; set; } = string.Empty;
            public string? ErrorMessage { get; set; }
            public DateTime CheckedAt { get; set; }
        }

        /// <summary>
        /// Gets the BitLocker status of the C: drive (system drive).
        /// </summary>
        public static BitLockerInfo GetSystemDriveStatus()
        {
            try
            {
                return GetDriveStatus("C:");
            }
            catch (Exception ex)
            {
                return new BitLockerInfo
                {
                    Status = BitLockerStatus.Error,
                    IsEncrypted = false,
                    DriveLetter = "C:",
                    ErrorMessage = $"Failed to check BitLocker status: {ex.Message}",
                    CheckedAt = DateTime.UtcNow
                };
            }
        }

        /// <summary>
        /// Gets the BitLocker status of a specific drive.
        /// </summary>
        private static BitLockerInfo GetDriveStatus(string driveLetter)
        {
            try
            {
                // Use WMI to query BitLocker status
                // The Win32_EncryptableVolume class provides BitLocker information
                using (var searcher = new ManagementObjectSearcher(
                    $"SELECT * FROM Win32_EncryptableVolume WHERE DriveLetter='{driveLetter}'"))
                using (var results = searcher.Get())
                {
                    foreach (var obj in results)
                    {
                        var protectionStatus = obj["ProtectionStatus"]?.ToString();
                        var encryptionPercentage = obj["ConversionStatus"]?.ToString();

                        var status = ParseBitLockerStatus(protectionStatus, encryptionPercentage);
                        var isEncrypted = status == BitLockerStatus.FullyEncrypted;

                        return new BitLockerInfo
                        {
                            Status = status,
                            IsEncrypted = isEncrypted,
                            DriveLetter = driveLetter,
                            ErrorMessage = null,
                            CheckedAt = DateTime.UtcNow
                        };
                    }

                    // If no results, BitLocker may be disabled or not available
                    return new BitLockerInfo
                    {
                        Status = BitLockerStatus.Disabled,
                        IsEncrypted = false,
                        DriveLetter = driveLetter,
                        ErrorMessage = "BitLocker not found or disabled on drive",
                        CheckedAt = DateTime.UtcNow
                    };
                }
            }
            catch (Exception ex)
            {
                return new BitLockerInfo
                {
                    Status = BitLockerStatus.Error,
                    IsEncrypted = false,
                    DriveLetter = driveLetter,
                    ErrorMessage = $"Error querying BitLocker: {ex.Message}",
                    CheckedAt = DateTime.UtcNow
                };
            }
        }

        private static BitLockerStatus ParseBitLockerStatus(string? protectionStatus, string? conversionStatus)
        {
            if (string.IsNullOrWhiteSpace(protectionStatus))
                return BitLockerStatus.Unknown;

            // BitLocker protection status codes:
            // 0 = Off, 1 = On, 2 = Unknown
            if (protectionStatus == "1")
            {
                // Check conversion status to see if encryption is complete
                // Conversion status: 0 = FullyDecrypted, 1 = FullyEncrypted, 2 = EncryptionInProgress, etc.
                return conversionStatus switch
                {
                    "1" => BitLockerStatus.FullyEncrypted,
                    "2" => BitLockerStatus.EncryptionInProgress,
                    "3" => BitLockerStatus.DecryptionInProgress,
                    "4" => BitLockerStatus.EncryptionPaused,
                    _ => BitLockerStatus.FullyEncrypted
                };
            }
            else if (protectionStatus == "0")
            {
                return BitLockerStatus.Disabled;
            }

            return BitLockerStatus.Unknown;
        }

        /// <summary>
        /// Checks if the system drive is fully encrypted.
        /// Returns false if BitLocker is disabled, paused, or in-progress.
        /// </summary>
        public static bool IsSystemDriveFullyEncrypted()
        {
            var info = GetSystemDriveStatus();
            return info.Status == BitLockerStatus.FullyEncrypted;
        }
    }
}
