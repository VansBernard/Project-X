using System;
using System.Linq;
using System.Management;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace DesktopAppFresh
{
    /// <summary>
    /// Generates a stable, persistent hardware fingerprint for device identity binding.
    /// This fingerprint is derived from stable hardware characteristics that rarely change:
    /// - Motherboard serial number
    /// - Disk serial number
    /// - Windows Machine GUID (Volume Serial Number)
    /// - Primary MAC address
    /// - CPU signature
    /// </summary>
    public static class HardwareIdentifier
    {
        /// <summary>
        /// Gets a stable hardware fingerprint for the current device.
        /// This value should remain consistent across app restarts and OS reboots.
        /// </summary>
        public static string GetStableFingerprint()
        {
            var components = new StringBuilder();

            // Add motherboard serial if available
            var mbSerial = GetMotherboardSerial();
            if (!string.IsNullOrWhiteSpace(mbSerial))
                components.Append($"mb:{mbSerial}|");

            // Add disk serial if available
            var diskSerial = GetDiskSerial();
            if (!string.IsNullOrWhiteSpace(diskSerial))
                components.Append($"disk:{diskSerial}|");

            // Add Windows Machine GUID (from registry - very stable)
            var machineGuid = GetWindowsMachineGuid();
            if (!string.IsNullOrWhiteSpace(machineGuid))
                components.Append($"guid:{machineGuid}|");

            // Add primary MAC address (stable on modern systems)
            var macAddress = GetPrimaryMacAddress();
            if (!string.IsNullOrWhiteSpace(macAddress))
                components.Append($"mac:{macAddress}|");

            // Add CPU signature
            var cpuSignature = GetCpuSignature();
            if (!string.IsNullOrWhiteSpace(cpuSignature))
                components.Append($"cpu:{cpuSignature}|");

            var fingerprint = components.ToString().TrimEnd('|');

            if (string.IsNullOrWhiteSpace(fingerprint))
            {
                // Fallback: use environment machine name and OS version if hardware info unavailable
                fingerprint = $"fallback:{Environment.MachineName}|{Environment.OSVersion.VersionString}";
            }

            // Hash the combined hardware info to a consistent format
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(fingerprint));
            return $"hw-{Convert.ToHexString(hash).Substring(0, 32).ToLowerInvariant()}";
        }

        /// <summary>
        /// Gets the motherboard serial number via WMI.
        /// This is one of the most stable hardware identifiers.
        /// </summary>
        private static string? GetMotherboardSerial()
        {
            try
            {
                using (var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BaseBoard"))
                using (var results = searcher.Get())
                {
                    foreach (var obj in results)
                    {
                        var serial = obj["SerialNumber"]?.ToString();
                        if (!string.IsNullOrWhiteSpace(serial) && !serial.Equals("Unknown", StringComparison.OrdinalIgnoreCase))
                            return serial.Trim();
                    }
                }
            }
            catch
            {
                // WMI may not be available on all systems; silently fail
            }

            return null;
        }

        /// <summary>
        /// Gets the primary disk serial number via WMI.
        /// </summary>
        private static string? GetDiskSerial()
        {
            try
            {
                using (var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_PhysicalMedia WHERE Tag='\\\\?\\PHYSICALDRIVE0'"))
                using (var results = searcher.Get())
                {
                    foreach (var obj in results)
                    {
                        var serial = obj["SerialNumber"]?.ToString();
                        if (!string.IsNullOrWhiteSpace(serial) && !serial.Equals("Unknown", StringComparison.OrdinalIgnoreCase))
                            return serial.Trim();
                    }
                }

                // Fallback: try without the physical drive filter
                using (var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_PhysicalMedia"))
                using (var results = searcher.Get())
                {
                    foreach (var obj in results)
                    {
                        var serial = obj["SerialNumber"]?.ToString();
                        if (!string.IsNullOrWhiteSpace(serial) && !serial.Equals("Unknown", StringComparison.OrdinalIgnoreCase))
                            return serial.Trim();
                    }
                }
            }
            catch
            {
                // WMI may not be available on all systems; silently fail
            }

            return null;
        }

        /// <summary>
        /// Gets the Windows Machine GUID from the registry.
        /// This GUID is generated at Windows installation and is very stable.
        /// Located at: HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography
        /// </summary>
        private static string? GetWindowsMachineGuid()
        {
            try
            {
                using (var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey("SOFTWARE\\Microsoft\\Cryptography"))
                {
                    var value = key?.GetValue("MachineGuid")?.ToString();
                    if (!string.IsNullOrWhiteSpace(value))
                        return value.Trim();
                }
            }
            catch
            {
                // Registry access may fail; silently fail
            }

            return null;
        }

        /// <summary>
        /// Gets the primary network adapter's MAC address.
        /// Prefers the default gateway adapter; falls back to the first operational adapter.
        /// </summary>
        private static string? GetPrimaryMacAddress()
        {
            try
            {
                // Try to get the MAC address of the adapter with the default gateway
                var nics = NetworkInterface.GetAllNetworkInterfaces();
                NetworkInterface? primaryNic = null;

                foreach (var nic in nics)
                {
                    if (nic.OperationalStatus != OperationalStatus.Up)
                        continue;

                    var ipProps = nic.GetIPProperties();
                    if (ipProps.GatewayAddresses.Count > 0)
                    {
                        primaryNic = nic;
                        break;
                    }
                }

                // Fallback to the first operational adapter
                primaryNic ??= nics.FirstOrDefault(nic => nic.OperationalStatus == OperationalStatus.Up);

                if (primaryNic != null)
                {
                    var address = primaryNic.GetPhysicalAddress();
                    if (address != null && address.GetAddressBytes().Length > 0)
                        return string.Join("-", address.GetAddressBytes().Select(b => b.ToString("X2")));
                }
            }
            catch
            {
                // Network info may not be available; silently fail
            }

            return null;
        }

        /// <summary>
        /// Gets the CPU signature via WMI.
        /// This includes processor family, model, and stepping information.
        /// </summary>
        private static string? GetCpuSignature()
        {
            try
            {
                using (var searcher = new ManagementObjectSearcher("SELECT ProcessorId, Manufacturer FROM Win32_Processor"))
                using (var results = searcher.Get())
                {
                    foreach (var obj in results)
                    {
                        var processorId = obj["ProcessorId"]?.ToString();
                        var manufacturer = obj["Manufacturer"]?.ToString();

                        if (!string.IsNullOrWhiteSpace(processorId) || !string.IsNullOrWhiteSpace(manufacturer))
                        {
                            return $"{manufacturer ?? "unknown"}-{processorId ?? "unknown"}";
                        }
                    }
                }
            }
            catch
            {
                // WMI may not be available; silently fail
            }

            return null;
        }
    }
}
