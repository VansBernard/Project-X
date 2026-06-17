using ProjectX.Desktop.Models;
using ProjectX.Desktop.Services.Device;
using ProjectX.Desktop.Services.Licensing;

namespace ProjectX.Desktop.Services.Tampering;

/// <summary>
/// Offline license validation workflow enhanced with anti-tampering checks.
/// 
/// Workflow:
/// 1. Check if device is locked due to tampering
/// 2. Validate cached license signature and expiration
/// 3. Check for clock rollback attacks
/// 4. Require online verification if tampering detected
/// 5. Lock device if rollback threshold exceeded
/// 6. Update valid time on successful validation
/// </summary>
public sealed class TamperingAwareOfflineValidationWorkflow
{
    private readonly ILicenseCacheService _licenseCache;
    private readonly IDeviceIdentityService _deviceIdentity;
    private readonly LicenseVerificationService _verification;
    private readonly IAntiTamperingService _antiTamperingService;
    private readonly TamperingAwareVerificationService _tamperingAwareVerification;

    public TamperingAwareOfflineValidationWorkflow(
        ILicenseCacheService licenseCache,
        IDeviceIdentityService deviceIdentity,
        LicenseVerificationService verification,
        IAntiTamperingService antiTamperingService,
        TamperingAwareVerificationService tamperingAwareVerification)
    {
        _licenseCache = licenseCache;
        _deviceIdentity = deviceIdentity;
        _verification = verification;
        _antiTamperingService = antiTamperingService;
        _tamperingAwareVerification = tamperingAwareVerification;
    }

    public async Task<OfflineValidationWithTamperingResult> ValidateAsync(
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;

        // Step 1: Check tampering lock status
        var isLocked = await _antiTamperingService.IsDeviceLockedAsync(cancellationToken);
        if (isLocked)
        {
            var (_, lockReason, recoveryAction) = await _antiTamperingService.GetLockStatusAsync(cancellationToken);
            return new OfflineValidationWithTamperingResult(
                isValid: false,
                message: $"Device is locked: {lockReason}",
                requiresOnlineVerification: true,
                tamperingDetected: true,
                recoveryRequired: true,
                recoveryAction: recoveryAction);
        }

        // Step 2: Load cached license
        var cachedLicense = await _licenseCache.LoadAsync(cancellationToken);
        if (cachedLicense is null)
        {
            return new OfflineValidationWithTamperingResult(
                isValid: false,
                message: "No cached license found. Online verification required.",
                requiresOnlineVerification: true);
        }

        // Step 3: Get device identity
        var identity = await _deviceIdentity.GetDeviceIdentityAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(identity.ContractId))
        {
            return new OfflineValidationWithTamperingResult(
                isValid: false,
                message: "No assigned contract found for this device.",
                requiresOnlineVerification: true);
        }

        // Step 4: Validate license with tampering checks
        var combinedValidation = await _tamperingAwareVerification.ValidateWithTamperingCheckAsync(
            cachedLicense.Payload,
            cachedLicense.Signature,
            identity.DeviceId,
            identity.ContractId,
            now,
            cancellationToken);

        if (!combinedValidation.CombinedValid)
        {
            var tamperingDetected = combinedValidation.TamperingResult.IsRollbackDetected ||
                                    combinedValidation.TamperingResult.IsLocked;

            return new OfflineValidationWithTamperingResult(
                isValid: false,
                message: combinedValidation.Message,
                requiresOnlineVerification: combinedValidation.RequiresOnlineVerification,
                tamperingDetected: tamperingDetected,
                tamperingDetails: combinedValidation.TamperingResult,
                recoveryRequired: combinedValidation.TamperingResult.IsLocked,
                recoveryAction: combinedValidation.TamperingResult.RequiredAction);
        }

        return new OfflineValidationWithTamperingResult(
            isValid: true,
            message: "License and device integrity verified.",
            requiresOnlineVerification: false,
            tamperingDetected: false,
            expiresAt: combinedValidation.TamperingResult.TimeOffsetSeconds >= 0
                ? cachedLicense.Payload.ExpiresAt
                : null);
    }
}

/// <summary>
/// Result of offline license validation with tampering checks.
/// </summary>
public sealed record OfflineValidationWithTamperingResult
{
    /// <summary>
    /// Whether validation succeeded completely.
    /// </summary>
    public bool IsValid { get; init; }

    /// <summary>
    /// Validation message explaining result.
    /// </summary>
    public string Message { get; init; }

    /// <summary>
    /// Whether online verification is required.
    /// </summary>
    public bool RequiresOnlineVerification { get; init; }

    /// <summary>
    /// Whether tampering was detected.
    /// </summary>
    public bool TamperingDetected { get; init; }

    /// <summary>
    /// Detailed tampering check result if applicable.
    /// </summary>
    public TamperingValidationResult? TamperingDetails { get; init; }

    /// <summary>
    /// Whether device recovery/unlock is required.
    /// </summary>
    public bool RecoveryRequired { get; init; }

    /// <summary>
    /// Required action to recover device.
    /// </summary>
    public string? RecoveryAction { get; init; }

    /// <summary>
    /// License expiration time if still valid.
    /// </summary>
    public string? ExpiresAt { get; init; }

    public OfflineValidationWithTamperingResult(
        bool isValid,
        string message,
        bool requiresOnlineVerification = false,
        bool tamperingDetected = false,
        TamperingValidationResult? tamperingDetails = null,
        bool recoveryRequired = false,
        string? recoveryAction = null,
        string? expiresAt = null)
    {
        IsValid = isValid;
        Message = message;
        RequiresOnlineVerification = requiresOnlineVerification;
        TamperingDetected = tamperingDetected;
        TamperingDetails = tamperingDetails;
        RecoveryRequired = recoveryRequired;
        RecoveryAction = recoveryAction;
        ExpiresAt = expiresAt;
    }
}
