using System.Text.Json;
using ProjectX.Desktop.Models;
using ProjectX.Desktop.Services.Storage;

namespace ProjectX.Desktop.Services.Tampering;

/// <summary>
/// Detects and responds to clock rollback attacks and system tampering.
/// 
/// Detection Strategy:
/// 1. Maintains secure record of last startup and last valid times
/// 2. Compares current system time against recorded history
/// 3. Detects when time moves backwards
/// 4. Counts consecutive rollback attempts
/// 5. Locks device after exceeding tolerance threshold
/// 
/// Recovery Flow:
/// 1. Device detects rollback, records incident
/// 2. Increments rollback counter
/// 3. After threshold: locks device, demands online verification
/// 4. User must connect online and verify license
/// 5. Valid license verification unlocks device and resets counter
/// </summary>
public sealed class AntiTamperingService : IAntiTamperingService
{
    private const string TamperingRecordFile = "tampering-record.json";
    private const int RollbackThreshold = 5; // Lock after 5 consecutive rollbacks
    private const int GracePeriodSeconds = 60; // Allow 60s clock drift for system adjustments

    private readonly ILocalSecureStorage _storage;

    public AntiTamperingService(ILocalSecureStorage storage)
    {
        _storage = storage;
    }

    public async Task<TamperingValidationResult> ValidateSystemTimeAsync(
        DateTimeOffset? currentSystemTime = null,
        CancellationToken cancellationToken = default)
    {
        currentSystemTime ??= DateTimeOffset.UtcNow;
        var record = await GetTamperingRecordAsync(cancellationToken);

        // Check if device is already locked
        if (record.IsLocked)
        {
            return TamperingValidationResult.DeviceLocked(
                record.LockReason ?? "Unknown tampering detected",
                record.RecoveryAction);
        }

        // Check for clock rollback
        var timeOffset = (currentSystemTime.Value.ToUnixTimeSeconds() - record.LastValidTime.ToUnixTimeSeconds());

        if (timeOffset < -GracePeriodSeconds)
        {
            // Rollback detected
            var newRollbackCount = record.RollbackCount + 1;

            if (newRollbackCount >= RollbackThreshold)
            {
                // Lock device after threshold exceeded
                var lockedRecord = record with
                {
                    RollbackCount = newRollbackCount,
                    LastTamperingDetectedAt = currentSystemTime,
                    IsLocked = true,
                    LockReason = $"Excessive clock rollback attempts detected ({newRollbackCount})",
                    RecoveryAction = "Connect to network and verify license to unlock device"
                };

                await SaveTamperingRecordAsync(lockedRecord, cancellationToken);

                return TamperingValidationResult.DeviceLocked(
                    lockedRecord.LockReason,
                    lockedRecord.RecoveryAction);
            }
            else
            {
                // Record rollback but don't lock yet
                var updatedRecord = record with
                {
                    RollbackCount = newRollbackCount,
                    LastTamperingDetectedAt = currentSystemTime
                };

                await SaveTamperingRecordAsync(updatedRecord, cancellationToken);

                var remainingAttempts = RollbackThreshold - newRollbackCount;
                var action = remainingAttempts > 0
                    ? $"Connect to network and verify license to reset tampering counter ({remainingAttempts} attempts remaining)"
                    : "Device will be locked on next rollback detection";

                return TamperingValidationResult.RollbackDetected(
                    rollbackCount: newRollbackCount,
                    timeOffsetSeconds: timeOffset,
                    isLocked: false,
                    requiredAction: action);
            }
        }
        else if (timeOffset >= 0)
        {
            // Time moved forward or stayed same (normal) - update last valid time
            var updatedRecord = record with
            {
                LastValidTime = currentSystemTime,
                RollbackCount = 0, // Reset counter on normal time progression
                LastTamperingDetectedAt = null
            };

            await SaveTamperingRecordAsync(updatedRecord, cancellationToken);

            return TamperingValidationResult.Success(currentSystemTime);
        }
        else
        {
            // Within grace period - warning but passing
            return TamperingValidationResult.Success(currentSystemTime);
        }
    }

    public async Task RecordValidTimeAsync(
        DateTimeOffset validatedTime,
        CancellationToken cancellationToken = default)
    {
        var record = await GetTamperingRecordAsync(cancellationToken);

        var updatedRecord = record with
        {
            LastValidTime = validatedTime,
            RollbackCount = 0, // Reset on successful validation
            LastTamperingDetectedAt = null
        };

        await SaveTamperingRecordAsync(updatedRecord, cancellationToken);
    }

    public async Task<TamperingRecord> GetTamperingRecordAsync(CancellationToken cancellationToken = default)
    {
        var json = await _storage.LoadTextAsync(TamperingRecordFile, cancellationToken);

        if (!string.IsNullOrWhiteSpace(json))
        {
            try
            {
                var record = JsonSerializer.Deserialize<TamperingRecord>(json);
                if (record is not null)
                {
                    return record;
                }
            }
            catch
            {
                // Corrupted record - start fresh
            }
        }

        // Create initial record
        var initialRecord = new TamperingRecord();
        await SaveTamperingRecordAsync(initialRecord, cancellationToken);
        return initialRecord;
    }

    public async Task LockDeviceAsync(
        string reason,
        string recoveryAction,
        CancellationToken cancellationToken = default)
    {
        var record = await GetTamperingRecordAsync(cancellationToken);

        var lockedRecord = record with
        {
            IsLocked = true,
            LockReason = reason,
            RecoveryAction = recoveryAction,
            LastTamperingDetectedAt = DateTimeOffset.UtcNow,
            RollbackCount = RollbackThreshold // Mark as exceeded
        };

        await SaveTamperingRecordAsync(lockedRecord, cancellationToken);
    }

    public async Task<bool> UnlockDeviceAsync(
        string recoveryToken,
        CancellationToken cancellationToken = default)
    {
        var record = await GetTamperingRecordAsync(cancellationToken);

        if (!record.IsLocked)
        {
            return true; // Already unlocked
        }

        // Recovery token should be validated by caller (typically online license verification)
        // Here we trust the caller has already verified the token

        var unlockedRecord = record with
        {
            IsLocked = false,
            LockReason = null,
            RecoveryAction = null,
            RollbackCount = 0,
            LastValidTime = DateTimeOffset.UtcNow
        };

        await SaveTamperingRecordAsync(unlockedRecord, cancellationToken);
        return true;
    }

    public async Task ClearTamperingHistoryAsync(CancellationToken cancellationToken = default)
    {
        var record = new TamperingRecord();
        await SaveTamperingRecordAsync(record, cancellationToken);
    }

    public async Task<bool> IsDeviceLockedAsync(CancellationToken cancellationToken = default)
    {
        var record = await GetTamperingRecordAsync(cancellationToken);
        return record.IsLocked;
    }

    public async Task<(bool IsLocked, string? Reason, string? RecoveryAction)> GetLockStatusAsync(
        CancellationToken cancellationToken = default)
    {
        var record = await GetTamperingRecordAsync(cancellationToken);
        return (record.IsLocked, record.LockReason, record.RecoveryAction);
    }

    private async Task SaveTamperingRecordAsync(
        TamperingRecord record,
        CancellationToken cancellationToken = default)
    {
        var json = JsonSerializer.Serialize(record);
        await _storage.SaveTextAsync(TamperingRecordFile, json, cancellationToken);
    }
}
