namespace ProjectX.LockScreen.Models;

/// <summary>
/// State of the lock screen application.
/// </summary>
public enum LockScreenState
{
    /// <summary>
    /// Showing lock screen (waiting for input).
    /// </summary>
    Locked,

    /// <summary>
    /// Showing license entry screen.
    /// </summary>
    LicenseEntry,

    /// <summary>
    /// Showing activation/recovery screen.
    /// </summary>
    Activation,

    /// <summary>
    /// Showing device status screen.
    /// </summary>
    Status,

    /// <summary>
    /// Showing error state.
    /// </summary>
    Error
}

/// <summary>
/// Lock screen session state.
/// </summary>
public sealed record LockScreenSession
{
    /// <summary>
    /// Current screen state.
    /// </summary>
    public LockScreenState CurrentState { get; init; }

    /// <summary>
    /// Whether device is locked due to tampering.
    /// </summary>
    public bool IsTampered { get; init; }

    /// <summary>
    /// Whether license is valid and device can unlock.
    /// </summary>
    public bool IsLicenseValid { get; init; }

    /// <summary>
    /// License expiration date/time.
    /// </summary>
    public DateTimeOffset? LicenseExpires { get; init; }

    /// <summary>
    /// Current error message.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Time remaining before license expires.
    /// </summary>
    public TimeSpan? TimeUntilExpiration { get; init; }

    /// <summary>
    /// Whether to show expiration warning.
    /// </summary>
    public bool ShouldWarnAboutExpiration { get; init; }

    public LockScreenSession(
        LockScreenState currentState = LockScreenState.Locked,
        bool isTampered = false,
        bool isLicenseValid = false,
        DateTimeOffset? licenseExpires = null,
        string? errorMessage = null)
    {
        CurrentState = currentState;
        IsTampered = isTampered;
        IsLicenseValid = isLicenseValid;
        LicenseExpires = licenseExpires;
        ErrorMessage = errorMessage;

        // Calculate time until expiration
        if (licenseExpires.HasValue && licenseExpires.Value > DateTimeOffset.UtcNow)
        {
            TimeUntilExpiration = licenseExpires.Value - DateTimeOffset.UtcNow;
            ShouldWarnAboutExpiration = TimeUntilExpiration.Value.TotalDays < 30;
        }
    }
}

/// <summary>
/// License information for display.
/// </summary>
public sealed record LicenseInfo
{
    /// <summary>
    /// License ID.
    /// </summary>
    public string LicenseId { get; init; }

    /// <summary>
    /// Contract ID.
    /// </summary>
    public string ContractId { get; init; }

    /// <summary>
    /// Device ID.
    /// </summary>
    public string DeviceId { get; init; }

    /// <summary>
    /// License issued date.
    /// </summary>
    public DateTimeOffset IssuedAt { get; init; }

    /// <summary>
    /// License expiration date.
    /// </summary>
    public DateTimeOffset ExpiresAt { get; init; }

    /// <summary>
    /// License status.
    /// </summary>
    public LicenseStatus Status { get; init; }

    /// <summary>
    /// Days remaining.
    /// </summary>
    public int DaysRemaining => (int)(ExpiresAt.Date - DateTimeOffset.UtcNow.Date).TotalDays;

    /// <summary>
    /// Whether license is about to expire (< 30 days).
    /// </summary>
    public bool IsExpiringSoon => DaysRemaining < 30 && DaysRemaining > 0;

    /// <summary>
    /// Whether license has expired.
    /// </summary>
    public bool IsExpired => DateTimeOffset.UtcNow > ExpiresAt;

    public LicenseInfo(
        string licenseId,
        string contractId,
        string deviceId,
        DateTimeOffset issuedAt,
        DateTimeOffset expiresAt)
    {
        LicenseId = licenseId;
        ContractId = contractId;
        DeviceId = deviceId;
        IssuedAt = issuedAt;
        ExpiresAt = expiresAt;

        if (IsExpired)
            Status = LicenseStatus.Expired;
        else if (IsExpiringSoon)
            Status = LicenseStatus.ExpiringSoon;
        else
            Status = LicenseStatus.Valid;
    }
}

/// <summary>
/// License status enumeration.
/// </summary>
public enum LicenseStatus
{
    /// <summary>
    /// License is valid and not expiring soon.
    /// </summary>
    Valid,

    /// <summary>
    /// License is expiring soon (< 30 days).
    /// </summary>
    ExpiringSoon,

    /// <summary>
    /// License has expired.
    /// </summary>
    Expired,

    /// <summary>
    /// License is invalid or missing.
    /// </summary>
    Invalid
}

/// <summary>
/// Device lock information.
/// </summary>
public sealed record DeviceLockInfo
{
    /// <summary>
    /// Whether device is locked.
    /// </summary>
    public bool IsLocked { get; init; }

    /// <summary>
    /// Lock reason.
    /// </summary>
    public string? Reason { get; init; }

    /// <summary>
    /// Recovery action required.
    /// </summary>
    public string? RecoveryAction { get; init; }

    /// <summary>
    /// Time when lock was applied.
    /// </summary>
    public DateTimeOffset? LockedAt { get; init; }

    /// <summary>
    /// Whether tampering was detected.
    /// </summary>
    public bool TamperingDetected { get; init; }

    public DeviceLockInfo(
        bool isLocked = false,
        string? reason = null,
        string? recoveryAction = null,
        DateTimeOffset? lockedAt = null,
        bool tamperingDetected = false)
    {
        IsLocked = isLocked;
        Reason = reason;
        RecoveryAction = recoveryAction;
        LockedAt = lockedAt;
        TamperingDetected = tamperingDetected;
    }
}
