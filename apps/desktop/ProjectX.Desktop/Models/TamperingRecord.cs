using System.Text.Json.Serialization;

namespace ProjectX.Desktop.Models;

/// <summary>
/// Records system time state for detecting clock rollback attacks.
/// Stored securely to prevent tampering detection bypass.
/// </summary>
public sealed record TamperingRecord
{
    /// <summary>
    /// Timestamp of last successful application startup.
    /// </summary>
    [JsonPropertyName("lastStartupTime")]
    public DateTimeOffset LastStartupTime { get; init; }

    /// <summary>
    /// Most recent validated system time from license or successful check.
    /// </summary>
    [JsonPropertyName("lastValidTime")]
    public DateTimeOffset LastValidTime { get; init; }

    /// <summary>
    /// Number of consecutive rollback detections.
    /// Increments on each failure, resets on successful validation.
    /// </summary>
    [JsonPropertyName("rollbackCount")]
    public int RollbackCount { get; init; }

    /// <summary>
    /// Timestamp when tampering was last detected.
    /// </summary>
    [JsonPropertyName("lastTamperingDetectedAt")]
    public DateTimeOffset? LastTamperingDetectedAt { get; init; }

    /// <summary>
    /// Whether device is currently locked due to tampering.
    /// </summary>
    [JsonPropertyName("isLocked")]
    public bool IsLocked { get; init; }

    /// <summary>
    /// Reason for device lock.
    /// </summary>
    [JsonPropertyName("lockReason")]
    public string? LockReason { get; init; }

    /// <summary>
    /// Expected recovery action to unlock device.
    /// </summary>
    [JsonPropertyName("recoveryAction")]
    public string? RecoveryAction { get; init; }

    public TamperingRecord()
    {
        LastStartupTime = DateTimeOffset.UtcNow;
        LastValidTime = DateTimeOffset.UtcNow;
        RollbackCount = 0;
        IsLocked = false;
    }

    public TamperingRecord(
        DateTimeOffset lastStartupTime,
        DateTimeOffset lastValidTime,
        int rollbackCount = 0,
        DateTimeOffset? lastTamperingDetectedAt = null,
        bool isLocked = false,
        string? lockReason = null,
        string? recoveryAction = null)
    {
        LastStartupTime = lastStartupTime;
        LastValidTime = lastValidTime;
        RollbackCount = rollbackCount;
        LastTamperingDetectedAt = lastTamperingDetectedAt;
        IsLocked = isLocked;
        LockReason = lockReason;
        RecoveryAction = recoveryAction;
    }
}
