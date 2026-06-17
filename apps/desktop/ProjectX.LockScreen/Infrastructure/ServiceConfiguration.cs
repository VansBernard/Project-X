using Microsoft.Extensions.DependencyInjection;
using ProjectX.LockScreen.Services;

namespace ProjectX.LockScreen.Infrastructure;

/// <summary>
/// Extension methods for registering lock screen services.
/// </summary>
public static class LockScreenServiceCollectionExtensions
{
    /// <summary>
    /// Adds lock screen services to the DI container.
    /// </summary>
    public static IServiceCollection AddLockScreenServices(this IServiceCollection services)
    {
        // Register lock screen services
        services.AddScoped<ILockScreenManager, LockScreenManager>();
        services.AddScoped<IOfflineLicenseValidator, OfflineLicenseValidator>();
        services.AddScoped<IDeviceRecoveryService, DeviceRecoveryService>();
        services.AddScoped<IServerSyncService, ServerSyncService>();

        return services;
    }
}

/// <summary>
/// Placeholder implementations for lock screen services.
/// </summary>
public sealed class LockScreenManager : ILockScreenManager
{
    private LockScreenSession _currentSession;

    public LockScreenSession CurrentSession => _currentSession;

    public event EventHandler<LockScreenSession>? StateChanged;

    public LockScreenManager()
    {
        _currentSession = new LockScreenSession(Models.LockScreenState.Locked);
    }

    public Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        _currentSession = new LockScreenSession(Models.LockScreenState.Locked);
        StateChanged?.Invoke(this, _currentSession);
        return Task.CompletedTask;
    }

    public async Task GoToLicenseEntryAsync(CancellationToken cancellationToken = default)
    {
        _currentSession = _currentSession with { CurrentState = Models.LockScreenState.LicenseEntry };
        StateChanged?.Invoke(this, _currentSession);
        await Task.CompletedTask;
    }

    public async Task GoToActivationAsync(CancellationToken cancellationToken = default)
    {
        _currentSession = _currentSession with { CurrentState = Models.LockScreenState.Activation };
        StateChanged?.Invoke(this, _currentSession);
        await Task.CompletedTask;
    }

    public async Task GoToStatusAsync(CancellationToken cancellationToken = default)
    {
        _currentSession = _currentSession with { CurrentState = Models.LockScreenState.Status };
        StateChanged?.Invoke(this, _currentSession);
        await Task.CompletedTask;
    }

    public Task<bool> ProcessLicenseEntryAsync(string licenseInput, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(true);
    }

    public Task<bool> AttemptRecoveryAsync(string recoveryToken, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(true);
    }

    public Task<bool> UnlockDeviceAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(true);
    }

    public Task<Models.LicenseInfo?> GetLicenseInfoAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<Models.LicenseInfo?>(null);
    }

    public Task<Models.DeviceLockInfo> GetDeviceLockStatusAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new Models.DeviceLockInfo());
    }

    public Task<bool> SyncWithServerAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(true);
    }
}

public sealed class OfflineLicenseValidator : IOfflineLicenseValidator
{
    public Task<(bool IsValid, string Message, DateTimeOffset? ExpiresAt)> ValidateCachedLicenseAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<(bool, string, DateTimeOffset?)>((false, "No cached license found", null));
    }

    public (bool IsValid, string Message) ValidateLicenseFormat(string licenseInput)
    {
        if (string.IsNullOrWhiteSpace(licenseInput))
            return (false, "License cannot be empty");
        return (true, "License format valid");
    }

    public Task<bool> IsExpiringAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(false);
    }
}

public sealed class DeviceRecoveryService : IDeviceRecoveryService
{
    public Task<(bool Success, string Message)> InitiateRecoveryAsync(
        string recoveryToken,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<(bool, string)>((false, "Recovery not yet implemented"));
    }

    public Task<string> GenerateRecoveryTokenAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult("RECOVERY-TOKEN-PLACEHOLDER");
    }

    public Task<Models.DeviceLockInfo> GetLockStatusAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new Models.DeviceLockInfo());
    }

    public Task<bool> CanUnlockAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(false);
    }
}

public sealed class ServerSyncService : IServerSyncService
{
    public Task<(bool Success, string? NewLicense, string? RecoveryToken)> SyncAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<(bool, string?, string?)>((false, null, null));
    }

    public Task<(bool Valid, string Message)> ValidateLicenseWithServerAsync(
        string licenseInput,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<(bool, string)>((false, "Server sync not available"));
    }

    public Task<bool> ReportStatusAsync(
        Models.LockScreenSession session,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(true);
    }
}
