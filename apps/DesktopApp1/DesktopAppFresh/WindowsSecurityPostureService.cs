using Microsoft.Win32;
using System;
using System.Diagnostics;
using System.Text;

namespace DesktopAppFresh
{
    public sealed class SecurityPostureStatus
    {
        public string BitLocker { get; init; } = "Unknown";
        public string SecureBoot { get; init; } = "Unknown";
        public string BiosPassword { get; init; } = "Not exposed by Windows";
        public string WindowsService { get; init; } = "Not installed";
    }

    public static class WindowsSecurityPostureService
    {
        private const string ServiceName = "ProjectXDeviceGuard";

        public static SecurityPostureStatus Read()
        {
            return new SecurityPostureStatus
            {
                BitLocker = ReadBitLockerStatus(),
                SecureBoot = ReadSecureBootStatus(),
                BiosPassword = "Not exposed by Windows",
                WindowsService = ReadServiceStatus()
            };
        }

        private static string ReadSecureBootStatus()
        {
            try
            {
                using var key = Registry.LocalMachine.OpenSubKey("SYSTEM\\CurrentControlSet\\Control\\SecureBoot\\State");
                return key?.GetValue("UEFISecureBootEnabled") switch
                {
                    1 => "Enabled",
                    0 => "Disabled",
                    _ => "Unavailable"
                };
            }
            catch
            {
                return "Unavailable";
            }
        }

        private static string ReadBitLockerStatus()
        {
            var result = RunProcess("powershell.exe", "-NoProfile -NonInteractive -Command \"(Get-BitLockerVolume -MountPoint $env:SystemDrive).ProtectionStatus\"");
            if (!result.Success) return "Unavailable";
            if (result.Output.Contains("On", StringComparison.OrdinalIgnoreCase)) return "Enabled";
            if (result.Output.Contains("Off", StringComparison.OrdinalIgnoreCase)) return "Disabled";
            return "Unknown";
        }

        private static string ReadServiceStatus()
        {
            var result = RunProcess("sc.exe", $"query {ServiceName}");
            if (result.Output.Contains("RUNNING", StringComparison.OrdinalIgnoreCase)) return "Running";
            if (result.Output.Contains("STOPPED", StringComparison.OrdinalIgnoreCase)) return "Installed, stopped";
            return "Not installed";
        }

        private static CommandResult RunProcess(string fileName, string arguments)
        {
            try
            {
                using var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = fileName,
                        Arguments = arguments,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        StandardOutputEncoding = Encoding.UTF8,
                        StandardErrorEncoding = Encoding.UTF8
                    }
                };
                process.Start();
                var output = process.StandardOutput.ReadToEnd();
                process.StandardError.ReadToEnd();
                process.WaitForExit(5000);
                return new CommandResult(process.HasExited && process.ExitCode == 0, output);
            }
            catch
            {
                return new CommandResult(false, string.Empty);
            }
        }

        private readonly record struct CommandResult(bool Success, string Output);
    }
}