using System;
using System.Security.Cryptography;
using System.Text;
using System.Diagnostics;
using System.Management;
using System.Linq;

namespace HardwareTest
{
    class Program
    {
        static void Main()
        {
            Console.WriteLine("=== Hardware UUID & Device Address Debug ===\n");

            // Get hardware UUID (same logic as app)
            string hardwareUuid = GetHardwareUuid();
            Console.WriteLine($"Hardware UUID: {hardwareUuid}");

            // Generate device address (same logic as app)
            string deviceAddress = GenerateDeviceAddress(hardwareUuid);
            Console.WriteLine($"Device Address (Client): {deviceAddress}\n");

            // Show step by step calculation
            Console.WriteLine("=== Step-by-Step Calculation ===");
            var normalized = hardwareUuid.Trim().ToUpperInvariant();
            Console.WriteLine($"1. Normalized UUID: {normalized}");

            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
            var hexFull = Convert.ToHexString(bytes);
            Console.WriteLine($"2. SHA256 Full Hex:\n   {hexFull}");
            Console.WriteLine($"   Length: {hexFull.Length} chars");

            var first12 = hexFull.Substring(0, 12);
            Console.WriteLine($"3. First 12 chars: {first12}");

            Console.WriteLine($"4. Split into groups:");
            Console.WriteLine($"   [{first12.Substring(0, 4)}] [{first12.Substring(4, 4)}] [{first12.Substring(8, 4)}]");

            var result = string.Join("-", new[] {
                first12.Substring(0, 4),
                first12.Substring(4, 4),
                first12.Substring(8, 4)
            });
            Console.WriteLine($"5. Final Device Address: {result}");

            Console.WriteLine("\n=== What Gets Sent to Backend ===");
            Console.WriteLine($"hardwareUuid: {hardwareUuid}");
            Console.WriteLine($"deviceAddress: {deviceAddress}");

            Console.WriteLine("\n=== Backend Validation ===");
            Console.WriteLine("Backend will:");
            Console.WriteLine($"1. Receive hardwareUuid: {hardwareUuid}");
            Console.WriteLine($"2. Receive deviceAddress: {deviceAddress}");
            Console.WriteLine($"3. Generate device address from UUID: {deviceAddress}");
            Console.WriteLine($"4. Compare: Should match ✓");

            // Copy to clipboard
            var payload = $"UUID: {hardwareUuid}\nAddress: {deviceAddress}";
            Console.WriteLine("\n✓ Values ready for testing");
        }

        static string GetHardwareUuid()
        {
            string[] ignored = { "", "0", "unknown", "none", "to be filled by o.e.m.", "to be filled by oem", "default string", "system serial number" };

            try
            {
                var searcher = new ManagementObjectSearcher("SELECT UUID FROM Win32_ComputerSystemProduct");
                foreach (ManagementObject item in searcher.Get())
                {
                    var uuid = item["UUID"]?.ToString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(uuid) && !ignored.Contains(uuid.ToLower()))
                        return uuid;
                }
            }
            catch { }

            try
            {
                var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BIOS");
                foreach (ManagementObject item in searcher.Get())
                {
                    var sn = item["SerialNumber"]?.ToString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(sn) && !ignored.Contains(sn.ToLower()))
                        return sn;
                }
            }
            catch { }

            throw new Exception("Could not read hardware UUID");
        }

        static string GenerateDeviceAddress(string hardwareUuid)
        {
            var normalized = hardwareUuid.Trim().ToUpperInvariant();
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
            var hex = Convert.ToHexString(bytes).Substring(0, 12);
            return string.Join("-", Enumerable.Range(0, 3).Select(i => hex.Substring(i * 4, 4)));
        }
    }
}
