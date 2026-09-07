using System;
using System.Diagnostics;
using System.Threading;
using Microsoft.Win32;

namespace DesktopAppFresh
{
    public static class AppWatchdog
    {
        private const string WatchdogArg = "--watchdog";
        private const string WatchLockScreenArg = "--watch-lockscreen";
        private const string WatchTargetPidArg = "--watch-target-pid";
        private const string WatchdogMutexName = "ProjectX.DesktopAppFresh.Watchdog";
        private const string StartupRunKey = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run";
        private const string StartupValueName = "ProjectXDesktopAppFresh";

        public static bool IsWatchdogMode(string[] args)
        {
            return Array.Exists(args, arg => string.Equals(arg, WatchdogArg, StringComparison.OrdinalIgnoreCase));
        }

        public static bool IsLockWatchdogMode(string[] args)
        {
            return Array.Exists(args, arg => string.Equals(arg, WatchLockScreenArg, StringComparison.OrdinalIgnoreCase));
        }

        public static void StartLockWatchdog(string? deviceId, string? contractId)
        {
            try
            {
                var executablePath = Environment.ProcessPath ?? Process.GetCurrentProcess().MainModule?.FileName;
                if (string.IsNullOrWhiteSpace(executablePath))
                {
                    return;
                }

                var startInfo = new ProcessStartInfo
                {
                    FileName = executablePath,
                    Arguments = $"{WatchdogArg} {WatchLockScreenArg} {WatchTargetPidArg} {Process.GetCurrentProcess().Id} "
                        + $"--device-id \"{deviceId ?? string.Empty}\" --contract-id \"{contractId ?? string.Empty}\"",
                    WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                Process.Start(startInfo);
            }
            catch
            {
                // Lock monitoring is best effort; the in-process lock monitor remains authoritative.
            }
        }

        public static bool IsAutoStartEnabled()
        {
            try
            {
                using var key = Registry.CurrentUser.OpenSubKey(StartupRunKey, false);
                if (key == null)
                {
                    return false;
                }

                var value = key.GetValue(StartupValueName) as string;
                return !string.IsNullOrWhiteSpace(value);
            }
            catch
            {
                return false;
            }
        }

        public static void EnsureRunning(string[] args)
        {
            if (IsWatchdogMode(args))
            {
                return;
            }

            // Startup watchdog is disabled by default to avoid reboot loops and undesired app restarts.
            // It can be enabled explicitly by a user/admin-controlled configuration or install step.
            if (IsAutoStartEnabled())
            {
                return;
            }

            // No self-launch startup registration is performed here by default.
        }

        public static bool EnsureRegisteredForStartup()
        {
            // Disabled by default. The app should not add itself to Windows startup unless a deliberate
            // configuration switch is implemented and approved by the user or installer.
            return false;
        }

        public static bool RemoveStartupRegistration()
        {
            try
            {
                using var key = Registry.CurrentUser.OpenSubKey(StartupRunKey, true);
                key?.DeleteValue(StartupValueName, false);
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static void RunWatchdogLoop()
        {
            var targetPid = GetPidArgument();
            if (targetPid <= 0)
            {
                return;
            }

            if (IsLockWatchdogMode(Environment.GetCommandLineArgs()))
            {
                RunLockWatchdogLoop(targetPid);
                return;
            }

            while (true)
            {
                try
                {
                    using var targetProcess = Process.GetProcessById(targetPid);
                    if (targetProcess.HasExited || !AppHealthMonitor.IsHeartbeatFresh(targetPid, TimeSpan.FromSeconds(15)))
                    {
                        RestartMainApp();
                        return;
                    }
                }
                catch
                {
                    RestartMainApp();
                    return;
                }

                Thread.Sleep(3000);
            }
        }

        private static void RunLockWatchdogLoop(int targetPid)
        {
            var args = Environment.GetCommandLineArgs();
            var deviceId = GetArgValue(args, "--device-id");
            var contractId = GetArgValue(args, "--contract-id");

            while (true)
            {
                try
                {
                    using var targetProcess = Process.GetProcessById(targetPid);
                    if (targetProcess.HasExited)
                    {
                        RestartMainAppInLockMode(deviceId, contractId);
                        return;
                    }

                    if (!AppHealthMonitor.IsLockHeartbeatFresh(targetPid, deviceId, contractId, TimeSpan.FromSeconds(15)))
                    {
                        return;
                    }
                }
                catch
                {
                    RestartMainAppInLockMode(deviceId, contractId);
                    return;
                }

                Thread.Sleep(3000);
            }
        }

        private static int GetPidArgument()
        {
            var args = Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length - 1; i++)
            {
                if (string.Equals(args[i], WatchTargetPidArg, StringComparison.OrdinalIgnoreCase) && int.TryParse(args[i + 1], out var pid))
                {
                    return pid;
                }
            }

            return 0;
        }

        private static string? GetArgValue(string[] args, string argName)
        {
            for (var i = 0; i < args.Length - 1; i++)
            {
                if (string.Equals(args[i], argName, StringComparison.OrdinalIgnoreCase))
                {
                    return args[i + 1].Trim('"');
                }
            }

            return null;
        }

        private static void RestartMainAppInLockMode(string? deviceId, string? contractId)
        {
            try
            {
                var executablePath = Environment.ProcessPath ?? Process.GetCurrentProcess().MainModule?.FileName;
                if (string.IsNullOrWhiteSpace(executablePath))
                {
                    return;
                }

                Process.Start(new ProcessStartInfo
                {
                    FileName = executablePath,
                    Arguments = $"--open-lock-screen --device-id \"{deviceId ?? string.Empty}\" --contract-id \"{contractId ?? string.Empty}\"",
                    WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory,
                    UseShellExecute = false,
                    CreateNoWindow = false
                });
            }
            catch
            {
                // Ignore restart failures so the watchdog does not crash itself.
            }
        }

        private static void RestartMainApp()
        {
            try
            {
                var executablePath = Environment.ProcessPath ?? Process.GetCurrentProcess().MainModule?.FileName;
                if (string.IsNullOrWhiteSpace(executablePath))
                {
                    return;
                }

                Process.Start(new ProcessStartInfo
                {
                    FileName = executablePath,
                    WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory,
                    UseShellExecute = false,
                    CreateNoWindow = false
                });
            }
            catch
            {
                // Ignore restart failures so the watchdog does not crash itself.
            }
        }
    }
}
