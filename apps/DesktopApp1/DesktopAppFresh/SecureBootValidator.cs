using System;
using System.Management;
using Microsoft.Win32;

namespace DesktopAppFresh
{
    /// <summary>
    /// Validates Secure Boot status on the system.
    /// Secure Boot is a UEFI firmware feature that prevents unauthorized code from running at boot time.
    /// </summary>
    public static class SecureBootValidator
    {
        public enum SecureBootStatus
        {
            Enabled,
            Disabled,
            NotSupported,
            Unknown,
            Error
        }

        public sealed class SecureBootInfo
        {
            public SecureBootStatus Status { get; set; }
            public bool IsFirmwareSecure { get; set; }
            public bool UefiSecureBootEnabled { get; set; }
            public string? ErrorMessage { get; set; }
            public DateTime CheckedAt { get; set; }
        }

        /// <summary>
        /// Gets the Secure Boot status of the system.
        /// </summary>
        public static SecureBootInfo GetStatus()
        {
            try
            {
                return GetSecureBootStatusFromWmi();
            }
            catch (Exception ex)
            {
                return new SecureBootInfo
                {
                    Status = SecureBootStatus.Error,
                    IsFirmwareSecure = false,
                    UefiSecureBootEnabled = false,
                    ErrorMessage = $"Failed to check Secure Boot: {ex.Message}",
                    CheckedAt = DateTime.UtcNow
                };
            }
        }

        /// <summary>
        /// Checks Secure Boot status via WMI and registry.
        /// </summary>
        private static SecureBootInfo GetSecureBootStatusFromWmi()
        {
            try
            {
                // Method 1: Check via WMI Win32_ComputerSystemSecureBootState
                using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_ComputerSystemSecureBootState"))
                using (var results = searcher.Get())
                {
                    foreach (var obj in results)
                    {
                        var secureBootEnabled = obj["SecureBootState"]?.ToString();

                        // SecureBootState: 0 = Off, 1 = On
                        if (secureBootEnabled == "1")
                        {
                            return new SecureBootInfo
                            {
                                Status = SecureBootStatus.Enabled,
                                IsFirmwareSecure = true,
                                UefiSecureBootEnabled = true,
                                ErrorMessage = null,
                                CheckedAt = DateTime.UtcNow
                            };
                        }
                        else if (secureBootEnabled == "0")
                        {
                            return new SecureBootInfo
                            {
                                Status = SecureBootStatus.Disabled,
                                IsFirmwareSecure = false,
                                UefiSecureBootEnabled = false,
                                ErrorMessage = "Secure Boot is disabled in UEFI firmware",
                                CheckedAt = DateTime.UtcNow
                            };
                        }
                    }
                }
            }
            catch
            {
                // If WMI fails, try registry fallback
            }

            // Method 2: Fallback to registry check
            try
            {
                return GetSecureBootStatusFromRegistry();
            }
            catch (Exception ex)
            {
                return new SecureBootInfo
                {
                    Status = SecureBootStatus.Unknown,
                    IsFirmwareSecure = false,
                    UefiSecureBootEnabled = false,
                    ErrorMessage = $"Unable to determine Secure Boot status: {ex.Message}",
                    CheckedAt = DateTime.UtcNow
                };
            }
        }

        /// <summary>
        /// Checks Secure Boot status via Windows registry.
        /// Location: HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\SecureBoot\State
        /// </summary>
        private static SecureBootInfo GetSecureBootStatusFromRegistry()
        {
            try
            {
                // Registry path for Secure Boot state
                using (var key = Registry.LocalMachine.OpenSubKey(@"System\CurrentControlSet\Control\SecureBoot\State"))
                {
                    if (key == null)
                    {
                        return new SecureBootInfo
                        {
                            Status = SecureBootStatus.NotSupported,
                            IsFirmwareSecure = false,
                            UefiSecureBootEnabled = false,
                            ErrorMessage = "Secure Boot registry key not found - may not be supported on this system",
                            CheckedAt = DateTime.UtcNow
                        };
                    }

                    var uefiSecureBootEnabled = key.GetValue("UEFISecureBootEnabled");

                    if (uefiSecureBootEnabled is int secureBootInt)
                    {
                        var isEnabled = secureBootInt == 1;
                        return new SecureBootInfo
                        {
                            Status = isEnabled ? SecureBootStatus.Enabled : SecureBootStatus.Disabled,
                            IsFirmwareSecure = isEnabled,
                            UefiSecureBootEnabled = isEnabled,
                            ErrorMessage = isEnabled ? null : "Secure Boot is disabled",
                            CheckedAt = DateTime.UtcNow
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                return new SecureBootInfo
                {
                    Status = SecureBootStatus.Error,
                    IsFirmwareSecure = false,
                    UefiSecureBootEnabled = false,
                    ErrorMessage = $"Registry check failed: {ex.Message}",
                    CheckedAt = DateTime.UtcNow
                };
            }

            return new SecureBootInfo
            {
                Status = SecureBootStatus.Unknown,
                IsFirmwareSecure = false,
                UefiSecureBootEnabled = false,
                ErrorMessage = "Unable to determine Secure Boot state from registry",
                CheckedAt = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Checks if Secure Boot is enabled.
        /// </summary>
        public static bool IsSecureBootEnabled()
        {
            var info = GetStatus();
            return info.Status == SecureBootStatus.Enabled;
        }
    }
}
