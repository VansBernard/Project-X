using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace DesktopAppFresh
{
    public sealed class TimeValidationResult
    {
        public bool IsValid { get; init; }
        public bool ClockRollbackDetected { get; init; }
        public DateTime CurrentUtc { get; init; }
        public DateTime? LastValidUtc { get; init; }
        public string Message { get; init; } = string.Empty;
    }

    public static class AntiTamperingService
    {
        private static readonly string CheckpointPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            "SecureStore",
            "time-checkpoint.dat");
        private static readonly string TamperQueuePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            "SecureStore",
            "tamper-events.json");
        private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("ProjectXTimeCheckpointEntropy2026");
        private static readonly TimeSpan AllowedBackwardDrift = TimeSpan.FromSeconds(60);

        public static TimeValidationResult ValidateAndRecord()
        {
            var now = DateTime.UtcNow;
            var lastValid = LoadCheckpoint();

            if (lastValid.HasValue && now < lastValid.Value - AllowedBackwardDrift)
            {
                _ = Task.Run(() => QueueTamperEventAsync(
                    "CLOCK_ROLLBACK_DETECTED",
                    "The device date and time moved backwards. Correct the system clock before continuing.",
                    now,
                    "desktop-device"));

                return new TimeValidationResult
                {
                    IsValid = false,
                    ClockRollbackDetected = true,
                    CurrentUtc = now,
                    LastValidUtc = lastValid,
                    Message = "The device date and time moved backwards. Correct the system clock before continuing."
                };
            }

            if (!SaveCheckpoint(now))
            {
                _ = Task.Run(() => QueueTamperEventAsync(
                    "TIME_CHECKPOINT_WRITE_FAILED",
                    "The device time security record could not be saved.",
                    now,
                    "desktop-device"));

                return new TimeValidationResult
                {
                    IsValid = false,
                    CurrentUtc = now,
                    LastValidUtc = lastValid,
                    Message = "The device time security record could not be saved."
                };
            }

            return new TimeValidationResult
            {
                IsValid = true,
                CurrentUtc = now,
                LastValidUtc = lastValid,
                Message = "Device time validated."
            };
        }

        public static async Task QueueTamperEventAsync(string eventType, string message, DateTime occurredAtUtc, string source = "desktop-device", string? deviceId = null, string? contractId = null)
        {
            try
            {
                var directory = Path.GetDirectoryName(TamperQueuePath);
                if (!string.IsNullOrWhiteSpace(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                var queue = new List<TamperEventItem>();
                if (File.Exists(TamperQueuePath))
                {
                    try
                    {
                        var json = await File.ReadAllTextAsync(TamperQueuePath);
                        if (!string.IsNullOrWhiteSpace(json))
                        {
                            var existing = JsonSerializer.Deserialize<List<TamperEventItem>>(json);
                            if (existing != null)
                            {
                                queue = existing;
                            }
                        }
                    }
                    catch
                    {
                        queue = new List<TamperEventItem>();
                    }
                }

                queue.Add(new TamperEventItem
                {
                    EventType = eventType,
                    Message = message,
                    OccurredAtUtc = occurredAtUtc.ToUniversalTime().ToString("O"),
                    Source = source,
                    DeviceId = deviceId,
                    ContractId = contractId,
                    QueuedAtUtc = DateTime.UtcNow.ToString("O")
                });

                await File.WriteAllTextAsync(TamperQueuePath, JsonSerializer.Serialize(queue, new JsonSerializerOptions { WriteIndented = true }));

                if (AuthService.HasAccessToken || AuthService.HasRefreshToken)
                {
                    await FlushQueuedTamperEventsAsync();
                }
            }
            catch
            {
                // Swallow offline logging failures so the app does not crash on a lockout.
            }
        }

        public static async Task FlushQueuedTamperEventsAsync()
        {
            if (!File.Exists(TamperQueuePath))
            {
                return;
            }

            try
            {
                var json = await File.ReadAllTextAsync(TamperQueuePath);
                if (string.IsNullOrWhiteSpace(json))
                {
                    return;
                }

                var queue = JsonSerializer.Deserialize<List<TamperEventItem>>(json) ?? new List<TamperEventItem>();
                if (queue.Count == 0)
                {
                    return;
                }

                var client = new DesktopApiClient();
                var remaining = new List<TamperEventItem>();

                foreach (var item in queue)
                {
                    if (!DateTime.TryParse(item.OccurredAtUtc, out var occurredAt))
                    {
                        occurredAt = DateTime.UtcNow;
                    }

                    var posted = await client.ReportTamperEventAsync(item.EventType, item.Message, occurredAt, item.Source, item.DeviceId, item.ContractId);
                    if (!posted)
                    {
                        remaining.Add(item);
                    }
                }

                if (remaining.Count == 0)
                {
                    File.Delete(TamperQueuePath);
                    return;
                }

                await File.WriteAllTextAsync(TamperQueuePath, JsonSerializer.Serialize(remaining, new JsonSerializerOptions { WriteIndented = true }));
            }
            catch
            {
                // Leave queued events in place if the backend is unreachable.
            }
        }

        private static DateTime? LoadCheckpoint()
        {
            try
            {
                if (!File.Exists(CheckpointPath)) return null;

                var encrypted = File.ReadAllBytes(CheckpointPath);
                var plainText = ProtectedData.Unprotect(encrypted, Entropy, DataProtectionScope.CurrentUser);
                return DateTime.TryParse(
                    Encoding.UTF8.GetString(plainText),
                    null,
                    System.Globalization.DateTimeStyles.RoundtripKind,
                    out var checkpoint)
                    ? checkpoint.ToUniversalTime()
                    : null;
            }
            catch
            {
                return null;
            }
        }

        private static bool SaveCheckpoint(DateTime utcNow)
        {
            try
            {
                var directory = Path.GetDirectoryName(CheckpointPath);
                if (!string.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);

                var plainText = Encoding.UTF8.GetBytes(utcNow.ToString("O"));
                var encrypted = ProtectedData.Protect(plainText, Entropy, DataProtectionScope.CurrentUser);
                File.WriteAllBytes(CheckpointPath, encrypted);
                return true;
            }
            catch
            {
                return false;
            }
        }
        private sealed class TamperEventItem
        {
            public string EventType { get; set; } = string.Empty;
            public string Message { get; set; } = string.Empty;
            public string OccurredAtUtc { get; set; } = DateTime.UtcNow.ToString("O");
            public string Source { get; set; } = "desktop-device";
            public string? DeviceId { get; set; }
            public string? ContractId { get; set; }
            public string QueuedAtUtc { get; set; } = DateTime.UtcNow.ToString("O");
        }
    }
}
