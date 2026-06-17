namespace ProjectX.Desktop.Models;

/// <summary>
/// Result of anti-tampering validation checks.
/// </summary>
public sealed record TamperingValidationResult
{
    /// <summary>
    /// Whether the device passed all tampering checks.
    /// </summary>
    public bool IsValid { get; init; }

    /// <summary>
    /// Whether a clock rollback was detected.
    /// </summary>
    public bool IsRollbackDetected { get; init; }

    /// <summary>
    /// Current number of consecutive rollback detections.
    /// </summary>
    public int RollbackCount { get; init; }

    /// <summary>
    /// Whether device is currently locked due to tampering.
    /// </summary>
    public bool IsLocked { get; init; }

    /// <summary>
    /// Tampering detection message.
    /// </summary>
    public string Message { get; init; }

    /// <summary>
    /// Required action to unlock device.
    /// </summary>
    public string? RequiredAction { get; init; }

    /// <summary>
    /// Current system time offset from last recorded valid time (in seconds).
    /// Negative indicates rollback.
    /// </summary>
    public long TimeOffsetSeconds { get; init; }

    public TamperingValidationResult(
        bool isValid,
        bool isRollbackDetected = false,
        int rollbackCount = 0,
        bool isLocked = false,
        string message = "Device passed anti-tampering checks.",
        string? requiredAction = null,
        long timeOffsetSeconds = 0)
    {
        IsValid = isValid;
        IsRollbackDetected = isRollbackDetected;
        RollbackCount = rollbackCount;
        IsLocked = isLocked;
        Message = message;
        RequiredAction = requiredAction;
        TimeOffsetSeconds = timeOffsetSeconds;
    }

    public static TamperingValidationResult Success(DateTimeOffset? detectedAt = null)
    {
        return new TamperingValidationResult(
            isValid: true,
            message: "Device passed anti-tampering checks.",
            timeOffsetSeconds: 0);
    }

    public static TamperingValidationResult RollbackDetected(
        int rollbackCount,
        long timeOffsetSeconds,
        bool isLocked = false,
        string? requiredAction = null)
    {
        return new TamperingValidationResult(
            isValid: false,
            isRollbackDetected: true,
            rollbackCount: rollbackCount,
            isLocked: isLocked,
            message: $"Clock rollback detected. System time moved backwards by {Math.Abs(timeOffsetSeconds)} seconds.",
            requiredAction: requiredAction,
            timeOffsetSeconds: timeOffsetSeconds);
    }

    public static TamperingValidationResult DeviceLocked(
        string reason,
        string? requiredAction = null)
    {
        return new TamperingValidationResult(
            isValid: false,
            isLocked: true,
            message: $"Device is locked due to tampering: {reason}",
            requiredAction: requiredAction);
    }

    public static TamperingValidationResult RecoveryNeeded(string action)
    {
        return new TamperingValidationResult(
            isValid: false,
            isLocked: true,
            message: "Device recovery required.",
            requiredAction: action);
    }
}
