
using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Threading;

namespace DesktopAppFresh
{
    public static class AppHealthMonitor
    {
        private const string HeartbeatFileName = "desktop-app-heartbeat.json";
        private const string LockHeartbeatFileName = "desktop-app-lock-heartbeat.json";
        private const int HeartbeatIntervalSeconds = 5;
        private static readonly string HeartbeatPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            HeartbeatFileName);
        private static readonly string LockHeartbeatPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            LockHeartbeatFileName);

        private static Timer? _heartbeatTimer;
        private static Timer? _lockHeartbeatTimer;

        public static bool ShouldWriteHeartbeat(string[]? args)
        {
            if (args == null || args.Length == 0)
            {
                return true;
            }

            return !Array.Exists(args, arg => string.Equals(arg, "--watchdog", StringComparison.OrdinalIgnoreCase));
        }

        public static void StartHeartbeat(string[]? args = null)
        {
            if (!ShouldWriteHeartbeat(args))
            {
                StopHeartbeat();
                return;
            }

            StopHeartbeat();
            _heartbeatTimer = new Timer(_ => WriteHeartbeat(), null, TimeSpan.Zero, TimeSpan.FromSeconds(HeartbeatIntervalSeconds));
        }

        public static void StopHeartbeat()
        {
            if (_heartbeatTimer == null)
            {
                return;
            }

            _heartbeatTimer.Dispose();
            _heartbeatTimer = null;
        }

        public static void StartLockHeartbeat(string? deviceId, string? contractId)
        {
            StopLockHeartbeat();
            WriteLockHeartbeat(deviceId, contractId);
            _lockHeartbeatTimer = new Timer(
                _ => WriteLockHeartbeat(deviceId, contractId),
                null,
                TimeSpan.FromSeconds(5),
                TimeSpan.FromSeconds(5));
        }

        public static void StopLockHeartbeat()
        {
            _lockHeartbeatTimer?.Dispose();
            _lockHeartbeatTimer = null;

            try
            {
                if (File.Exists(LockHeartbeatPath))
                {
                    File.Delete(LockHeartbeatPath);
                }
            }
            catch
            {
                // Best effort cleanup; a stale record will expire naturally.
            }
        }

        public static bool IsLockHeartbeatFresh(
            int processId,
            string? deviceId,
            string? contractId,
            TimeSpan timeout)
        {
            try
            {
                if (!File.Exists(LockHeartbeatPath))
                {
                    return false;
                }

                var json = File.ReadAllText(LockHeartbeatPath);
                var checkpoint = JsonSerializer.Deserialize<LockHeartbeatCheckpoint>(json);
                return checkpoint != null
                    && checkpoint.ProcessId == processId
                    && string.Equals(checkpoint.DeviceId, deviceId, StringComparison.Ordinal)
                    && string.Equals(checkpoint.ContractId, contractId, StringComparison.Ordinal)
                    && DateTime.UtcNow - checkpoint.LastHeartbeatUtc < timeout;
            }
            catch
            {
                return false;
            }
        }

        public static bool IsHeartbeatFresh(int processId, TimeSpan timeout)
        {
            try
            {
                if (!File.Exists(HeartbeatPath))
                {
                    return false;
                }

                var json = File.ReadAllText(HeartbeatPath);
                if (string.IsNullOrWhiteSpace(json))
                {
                    return false;
                }

                var checkpoint = JsonSerializer.Deserialize<HeartbeatCheckpoint>(json);
                if (checkpoint == null)
                {
                    return false;
                }

                return checkpoint.ProcessId == processId
                    && DateTime.UtcNow - checkpoint.LastHeartbeatUtc < timeout;
            }
            catch
            {
                return false;
            }
        }

        private static void WriteHeartbeat()
        {
            try
            {
                var directory = Path.GetDirectoryName(HeartbeatPath);
                if (!string.IsNullOrWhiteSpace(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                var checkpoint = new HeartbeatCheckpoint
                {
                    ProcessId = Process.GetCurrentProcess().Id,
                    LastHeartbeatUtc = DateTime.UtcNow,
                    processName = Process.GetCurrentProcess().ProcessName
                };

                var json = JsonSerializer.Serialize(checkpoint);
                File.WriteAllText(HeartbeatPath, json);
            }
            catch
            {
                // Best effort only; failure should not crash the app.
            }
        }

        private static void WriteLockHeartbeat(string? deviceId, string? contractId)
        {
            try
            {
                var directory = Path.GetDirectoryName(LockHeartbeatPath);
                if (!string.IsNullOrWhiteSpace(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                var checkpoint = new LockHeartbeatCheckpoint
                {
                    ProcessId = Process.GetCurrentProcess().Id,
                    DeviceId = deviceId,
                    ContractId = contractId,
                    LastHeartbeatUtc = DateTime.UtcNow
                };

                File.WriteAllText(LockHeartbeatPath, JsonSerializer.Serialize(checkpoint));
            }
            catch
            {
                // Best effort only; a lock heartbeat failure must not crash the app.
            }
        }

        private sealed class HeartbeatCheckpoint
        {
            public int ProcessId { get; set; }
            public DateTime LastHeartbeatUtc { get; set; }
            public string processName { get; set; } = string.Empty;
        }

        private sealed class LockHeartbeatCheckpoint
        {
            public int ProcessId { get; set; }
            public string? DeviceId { get; set; }
            public string? ContractId { get; set; }
            public DateTime LastHeartbeatUtc { get; set; }
        }
    }
}
