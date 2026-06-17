using ProjectX.LockScreen.Models;

namespace ProjectX.LockScreen.Services;

/// <summary>
/// Service for managing lock screen state and transitions.
/// </summary>
public interface ILockScreenManager
{
    /// <summary>
    /// Current session state.
    /// </summary>
    LockScreenSession CurrentSession { get; }

    /// <summary>
    /// Occurs when state changes.
    /// </summary>
    event EventHandler<LockScreenSession>? StateChanged;

    /// <summary>
    /// Initializes lock screen with current device state.
    /// </summary>
    Task InitializeAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Transitions to license entry state.
    /// </summary>
    Task GoToLicenseEntryAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Transitions to activation state.
    /// </summary>
    Task GoToActivationAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Transitions to status screen.
    /// </summary>
    Task GoToStatusAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Processes license entry and validates.
    /// </summary>
    Task<bool> ProcessLicenseEntryAsync(string licenseInput, CancellationToken cancellationToken = default);

    /// <summary>
    /// Attempts device recovery/unlock.
    /// </summary>
    Task<bool> AttemptRecoveryAsync(string recoveryToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// Unlocks device if conditions met.
    /// </summary>
    Task<bool> UnlockDeviceAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets current license information.
    /// </summary>
    Task<LicenseInfo?> GetLicenseInfoAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets current device lock status.
    /// </summary>
    Task<DeviceLockInfo> GetDeviceLockStatusAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Syncs with server and updates license status.
    /// </summary>
    Task<bool> SyncWithServerAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Service for offline license validation.
/// </summary>
public interface IOfflineLicenseValidator
{
    /// <summary>
    /// Validates cached license offline.
    /// </summary>
    Task<(bool IsValid, string Message, DateTimeOffset? ExpiresAt)> ValidateCachedLicenseAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates license entry/token format.
    /// </summary>
    (bool IsValid, string Message) ValidateLicenseFormat(string licenseInput);

    /// <summary>
    /// Checks if license is expiring soon.
    /// </summary>
    Task<bool> IsExpiringAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Service for device recovery and unlock operations.
/// </summary>
public interface IDeviceRecoveryService
{
    /// <summary>
    /// Initiates device recovery with recovery token.
    /// </summary>
    Task<(bool Success, string Message)> InitiateRecoveryAsync(
        string recoveryToken,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates recovery token for display to user.
    /// </summary>
    Task<string> GenerateRecoveryTokenAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets current device lock status.
    /// </summary>
    Task<DeviceLockInfo> GetLockStatusAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if device can be unlocked.
    /// </summary>
    Task<bool> CanUnlockAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Service for online server synchronization.
/// </summary>
public interface IServerSyncService
{
    /// <summary>
    /// Syncs device state with server.
    /// </summary>
    Task<(bool Success, string? NewLicense, string? RecoveryToken)> SyncAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Submits license entry to server for validation.
    /// </summary>
    Task<(bool Valid, string Message)> ValidateLicenseWithServerAsync(
        string licenseInput,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Reports device status to server.
    /// </summary>
    Task<bool> ReportStatusAsync(LockScreenSession session, CancellationToken cancellationToken = default);
}
