using System;
using System.Management;

namespace DesktopAppFresh
{
    /// <summary>
    /// Validates TPM (Trusted Platform Module) availability and status on the system.
    /// TPM provides hardware-backed cryptographic capabilities and secure key storage.
    /// </summary>
    public static class TpmValidator
    {
        public enum TpmStatus
        {
            Ready,
            NotReady,
            NotAvailable,
            NotSupported,
            Error,
            Unknown
        }

        public sealed class TpmInfo
        {
            public TpmStatus Status { get; set; }
            public string? TpmVersion { get; set; }
            public string? Manufacturer { get; set; }
            public string? ManufacturerId { get; set; }
            public bool IsReady { get; set; }
            public string? ErrorMessage { get; set; }
            public DateTime CheckedAt { get; set; }
        }

        /// <summary>
        /// Gets the TPM status and information.
        /// </summary>
        public static TpmInfo GetStatus()
        {
            try
            {
                return GetTpmStatusFromWmi();
            }
            catch (Exception ex)
            {
                return new TpmInfo
                {
                    Status = TpmStatus.Error,
                    IsReady = false,
                    ErrorMessage = $"Failed to check TPM status: {ex.Message}",
                    CheckedAt = DateTime.UtcNow
                };
            }
        }

        /// <summary>
        /// Queries TPM information via WMI.
        /// </summary>
        private static TpmInfo GetTpmStatusFromWmi()
        {
            try
            {
                // Query Win32_Tpm for TPM information
                using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Tpm"))
                using (var results = searcher.Get())
                {
                    foreach (var obj in results)
                    {
                        var isActivated = obj["IsActivated_InitialValue"]?.ToString() ?? "false";
                        var isEnabled = obj["IsEnabled_InitialValue"]?.ToString() ?? "false";
                        var isOwned = obj["IsOwned_InitialValue"]?.ToString() ?? "false";
                        var specVersion = obj["SpecVersion"]?.ToString();
                        var manufacturer = obj["Manufacturer"]?.ToString();
                        var manufacturerId = obj["ManufacturerIdFromRegistry"]?.ToString();

                        var isReady = isActivated == "True" && isEnabled == "True";

                        var status = isReady ? TpmStatus.Ready : TpmStatus.NotReady;

                        return new TpmInfo
                        {
                            Status = status,
                            TpmVersion = specVersion,
                            Manufacturer = manufacturer,
                            ManufacturerId = manufacturerId,
                            IsReady = isReady,
                            ErrorMessage = isReady ? null : "TPM is present but not fully initialized",
                            CheckedAt = DateTime.UtcNow
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                return new TpmInfo
                {
                    Status = TpmStatus.Error,
                    IsReady = false,
                    ErrorMessage = $"WMI query failed: {ex.Message}",
                    CheckedAt = DateTime.UtcNow
                };
            }

            // If no TPM found via WMI
            return new TpmInfo
            {
                Status = TpmStatus.NotAvailable,
                IsReady = false,
                ErrorMessage = "No TPM device found on this system",
                CheckedAt = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Checks if TPM 2.0 is available and ready for use.
        /// </summary>
        public static bool IsTpmReady()
        {
            var info = GetStatus();
            return info.Status == TpmStatus.Ready && info.IsReady;
        }

        /// <summary>
        /// Checks if the system has TPM support (availability, not necessarily ready).
        /// </summary>
        public static bool IsTpmAvailable()
        {
            var info = GetStatus();
            return info.Status is TpmStatus.Ready or TpmStatus.NotReady;
        }
    }
}
