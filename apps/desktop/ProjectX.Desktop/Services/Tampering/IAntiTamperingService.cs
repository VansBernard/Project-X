using ProjectX.Desktop.Models;

namespace ProjectX.Desktop.Services.Tampering;

/// <summary>
/// Service for detecting and responding to clock rollback attacks and system tampering.
/// </summary>
public interface IAntiTamperingService
{
    /// <summary>
    /// Validates system time to detect rollback attacks.
    /// </summary>
    /// <param name="currentSystemTime">Current system time to validate (defaults to now)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Tampering validation result</returns>
    Task<TamperingValidationResult> ValidateSystemTimeAsync(
        DateTimeOffset? currentSystemTime = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Records a new valid time checkpoint (typically after successful license validation).
    /// Resets rollback counter on success.
    /// </summary>
    /// <param name="validatedTime">Time that passed validation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task RecordValidTimeAsync(
        DateTimeOffset validatedTime,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the current tampering record.
    /// </summary>
    Task<TamperingRecord> GetTamperingRecordAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Locks the device due to detected tampering.
    /// </summary>
    /// <param name="reason">Reason for lock</param>
    /// <param name="recoveryAction">Required action to unlock</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task LockDeviceAsync(
        string reason,
        string recoveryAction,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Attempts to unlock device after tampering incident.
    /// Requires valid online license verification.
    /// </summary>
    /// <param name="recoveryToken">Token or validation proof for recovery</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<bool> UnlockDeviceAsync(
        string recoveryToken,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Clears tampering record (typically after successful online sync).
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task ClearTamperingHistoryAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if device is currently locked due to tampering.
    /// </summary>
    Task<bool> IsDeviceLockedAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets details about current lock state.
    /// </summary>
    Task<(bool IsLocked, string? Reason, string? RecoveryAction)> GetLockStatusAsync(
        CancellationToken cancellationToken = default);
}
