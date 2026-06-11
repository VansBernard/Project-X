using System.Linq;
using System.Management;
using System.Security.Cryptography;
using System.Text;

namespace TokenVerifier;

public static class HardwareFingerprint
{
    private static readonly string[] IgnoredValues =
    [
        "",
        "0",
        "unknown",
        "none",
        "to be filled by o.e.m.",
        "to be filled by oem",
        "default string",
        "system serial number"
    ];

    public static string GetHardwareUuid()
    {
        var configuredHardwareUuid = Environment.GetEnvironmentVariable("PROJECTX_HARDWARE_UUID");
        if (!string.IsNullOrWhiteSpace(configuredHardwareUuid))
        {
            var trimmedHardwareUuid = configuredHardwareUuid.Trim();
            if (IsUsable(trimmedHardwareUuid))
            {
                return trimmedHardwareUuid;
            }
        }

        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException("Hardware UUID lookup is currently supported on Windows only.");
        }

        return FirstValidValue(
            ReadWmiValue("Win32_ComputerSystemProduct", "UUID"),
            ReadWmiValue("Win32_BIOS", "SerialNumber"),
            ReadWmiValue("Win32_BaseBoard", "SerialNumber")
        ) ?? throw new InvalidOperationException("Could not read a usable hardware UUID from this device.");
    }

    public static string GetDeviceAddress()
    {
        var hardwareUuid = GetHardwareUuid();
        return GenerateDeviceAddress(hardwareUuid);
    }

    public static string GenerateDeviceAddress(string hardwareUuid)
    {
        if (string.IsNullOrWhiteSpace(hardwareUuid))
        {
            throw new ArgumentException("Hardware UUID is required.", nameof(hardwareUuid));
        }

        var normalized = hardwareUuid.Trim().ToUpperInvariant();
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        var hex = Convert.ToHexString(bytes).Substring(0, 12);
        return string.Join("-", Enumerable.Range(0, 3).Select(i => hex.Substring(i * 4, 4)));
    }

    private static string? ReadWmiValue(string className, string propertyName)
    {
        try
        {
            using var searcher = new ManagementObjectSearcher($"SELECT {propertyName} FROM {className}");

            foreach (var item in searcher.Get())
            {
                var value = item[propertyName]?.ToString()?.Trim();
                if (IsUsable(value))
                {
                    return value;
                }
            }
        }
        catch (ManagementException)
        {
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return null;
        }

        return null;
    }

    private static string? FirstValidValue(params string?[] values)
    {
        return values.FirstOrDefault(IsUsable);
    }

    private static bool IsUsable(string? value)
    {
        var trimmed = value?.Trim();
        return !string.IsNullOrWhiteSpace(trimmed) &&
               !IgnoredValues.Contains(trimmed, StringComparer.OrdinalIgnoreCase);
    }
}
