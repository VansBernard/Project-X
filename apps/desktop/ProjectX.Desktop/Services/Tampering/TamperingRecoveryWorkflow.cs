using ProjectX.Desktop.Models;
using ProjectX.Desktop.Services.Device;

namespace ProjectX.Desktop.Services.Tampering;

/// <summary>
/// Handles recovery workflow for devices locked due to tampering.
/// 
/// Recovery Process:
/// 1. Device detects tampering (clock rollback)
/// 2. Device is locked after threshold
/// 3. User connects to network
/// 4. System attempts online license verification
/// 5. Valid license verification generates recovery token
/// 6. Recovery token is used to unlock device locally
/// 7. Tampering counter is reset
/// </summary>
public sealed class TamperingRecoveryWorkflow
{
    private readonly IAntiTamperingService _antiTamperingService;
    private readonly IDeviceIdentityService _deviceIdentity;

    public TamperingRecoveryWorkflow(
        IAntiTamperingService antiTamperingService,
        IDeviceIdentityService deviceIdentity)
    {
        _antiTamperingService = antiTamperingService;
        _deviceIdentity = deviceIdentity;
    }

    /// <summary>
    /// Generates a recovery token to be obtained from online verification.
    /// This token contains proof of successful online license validation.
    /// </summary>
    public async Task<string> GenerateRecoveryTokenAsync(
        DateTimeOffset validationTime,
        string licenseId,
        CancellationToken cancellationToken = default)
    {
        var identity = await _deviceIdentity.GetDeviceIdentityAsync(cancellationToken);
        var timestamp = validationTime.ToUnixTimeSeconds();
        
        // Generate recovery token from validation details
        var tokenData = $"{identity.DeviceId}|{licenseId}|{timestamp}";
        var tokenBytes = System.Text.Encoding.UTF8.GetBytes(tokenData);
        var token = Convert.ToBase64String(tokenBytes);
        
        return token;
    }

    /// <summary>
    /// Initiates recovery process on locked device.
    /// Called after successful online license verification.
    /// </summary>
    public async Task<RecoveryResult> InitiateRecoveryAsync(
        string recoveryToken,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate recovery token format and content
            if (string.IsNullOrWhiteSpace(recoveryToken))
            {
                return new RecoveryResult(
                    success: false,
                    message: "Invalid recovery token: empty or null");
            }

            // Validate token contains expected data
            try
            {
                var tokenData = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(recoveryToken));
                var parts = tokenData.Split('|');

                if (parts.Length != 3)
                {
                    return new RecoveryResult(
                        success: false,
                        message: "Invalid recovery token: malformed data");
                }

                var deviceId = parts[0];
                var licenseId = parts[1];
                if (!long.TryParse(parts[2], out var _))
                {
                    return new RecoveryResult(
                        success: false,
                        message: "Invalid recovery token: invalid timestamp");
                }

                // Validate device ID matches
                var identity = await _deviceIdentity.GetDeviceIdentityAsync(cancellationToken);
                if (identity.DeviceId != deviceId)
                {
                    return new RecoveryResult(
                        success: false,
                        message: "Recovery token does not match device identity");
                }
            }
            catch (FormatException)
            {
                return new RecoveryResult(
                    success: false,
                    message: "Invalid recovery token: decoding failed");
            }

            // Attempt unlock
            var unlockSuccess = await _antiTamperingService.UnlockDeviceAsync(
                recoveryToken,
                cancellationToken);

            if (unlockSuccess)
            {
                return new RecoveryResult(
                    success: true,
                    message: "Device successfully recovered. Tampering counter reset.",
                    isUnlocked: true);
            }
            else
            {
                return new RecoveryResult(
                    success: false,
                    message: "Device unlock failed");
            }
        }
        catch (Exception ex)
        {
            return new RecoveryResult(
                success: false,
                message: $"Recovery failed: {ex.Message}");
        }
    }

    /// <summary>
    /// Gets current recovery status and required actions.
    /// </summary>
    public async Task<RecoveryStatus> GetRecoveryStatusAsync(
        CancellationToken cancellationToken = default)
    {
        var record = await _antiTamperingService.GetTamperingRecordAsync(cancellationToken);
        var (isLocked, reason, recoveryAction) = await _antiTamperingService.GetLockStatusAsync(cancellationToken);

        if (!isLocked)
        {
            return new RecoveryStatus(
                isLocked: false,
                message: "Device is operating normally.",
                requiredAction: null,
                rollbackCount: record.RollbackCount,
                lastTamperingDetected: record.LastTamperingDetectedAt);
        }

        return new RecoveryStatus(
            isLocked: true,
            message: reason ?? "Device is locked",
            requiredAction: recoveryAction,
            rollbackCount: record.RollbackCount,
            lastTamperingDetected: record.LastTamperingDetectedAt);
    }

    /// <summary>
    /// Verifies if device is ready for normal operation after recovery.
    /// </summary>
    public async Task<bool> VerifyRecoveryCompleteAsync(
        CancellationToken cancellationToken = default)
    {
        var isLocked = await _antiTamperingService.IsDeviceLockedAsync(cancellationToken);
        return !isLocked;
    }

    /// <summary>
    /// Records a successful online verification and updates valid time.
    /// Typically called after successful server-side license validation.
    /// </summary>
    public async Task RecordSuccessfulVerificationAsync(
        DateTimeOffset verificationTime,
        CancellationToken cancellationToken = default)
    {
        await _antiTamperingService.RecordValidTimeAsync(verificationTime, cancellationToken);
    }

    /// <summary>
    /// Clears tampering history after confirmed safe state.
    /// Typically called during successful device sync with server.
    /// </summary>
    public async Task ClearTamperingHistoryAsync(CancellationToken cancellationToken = default)
    {
        await _antiTamperingService.ClearTamperingHistoryAsync(cancellationToken);
    }
}

/// <summary>
/// Result of recovery attempt.
/// </summary>
public sealed record RecoveryResult
{
    /// <summary>
    /// Whether recovery succeeded.
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// Recovery operation message.
    /// </summary>
    public string Message { get; init; }

    /// <summary>
    /// Whether device is now unlocked.
    /// </summary>
    public bool IsUnlocked { get; init; }

    public RecoveryResult(bool success, string message, bool isUnlocked = false)
    {
        Success = success;
        Message = message;
        IsUnlocked = isUnlocked;
    }
}

/// <summary>
/// Current device recovery status.
/// </summary>
public sealed record RecoveryStatus
{
    /// <summary>
    /// Whether device is currently locked.
    /// </summary>
    public bool IsLocked { get; init; }

    /// <summary>
    /// Current status message.
    /// </summary>
    public string Message { get; init; }

    /// <summary>
    /// Required user action, if any.
    /// </summary>
    public string? RequiredAction { get; init; }

    /// <summary>
    /// Current rollback detection count.
    /// </summary>
    public int RollbackCount { get; init; }

    /// <summary>
    /// When tampering was last detected.
    /// </summary>
    public DateTimeOffset? LastTamperingDetected { get; init; }

    public RecoveryStatus(
        bool isLocked,
        string message,
        string? requiredAction = null,
        int rollbackCount = 0,
        DateTimeOffset? lastTamperingDetected = null)
    {
        IsLocked = isLocked;
        Message = message;
        RequiredAction = requiredAction;
        RollbackCount = rollbackCount;
        LastTamperingDetected = lastTamperingDetected;
    }
}
