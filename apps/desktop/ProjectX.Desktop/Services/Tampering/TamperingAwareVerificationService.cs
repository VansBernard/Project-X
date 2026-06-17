using ProjectX.Desktop.Models;
using ProjectX.Desktop.Services.Licensing;

namespace ProjectX.Desktop.Services.Tampering;

/// <summary>
/// Extends license verification with anti-tampering checks.
/// Integrates tampering detection into license validation workflow.
/// </summary>
public sealed class TamperingAwareVerificationService
{
    private readonly LicenseVerificationService _verificationService;
    private readonly IAntiTamperingService _antiTamperingService;

    public TamperingAwareVerificationService(
        LicenseVerificationService verificationService,
        IAntiTamperingService antiTamperingService)
    {
        _verificationService = verificationService;
        _antiTamperingService = antiTamperingService;
    }

    /// <summary>
    /// Validates license while checking for tampering.
    /// Returns combined validation result considering both factors.
    /// </summary>
    public async Task<LicenseValidationWithTamperingCheckResult> ValidateWithTamperingCheckAsync(
        LicensePayload payload,
        string signatureBase64,
        string localDeviceId,
        string assignedContractId,
        DateTimeOffset now,
        CancellationToken cancellationToken = default)
    {
        // First check for tampering
        var tamperingCheck = await _antiTamperingService.ValidateSystemTimeAsync(now, cancellationToken);

        // If device is locked, fail validation immediately
        if (tamperingCheck.IsLocked)
        {
            return new LicenseValidationWithTamperingCheckResult(
                licenseValid: false,
                tamperingCheckPassed: false,
                tamperingResult: tamperingCheck,
                combinedValid: false,
                message: $"License validation blocked: {tamperingCheck.Message}",
                requiresOnlineVerification: true);
        }

        // Perform standard license validation
        var licenseValidation = _verificationService.Validate(
            payload,
            signatureBase64,
            localDeviceId,
            assignedContractId,
            now);

        // If license is valid, record the valid time
        if (licenseValidation.Valid)
        {
            await _antiTamperingService.RecordValidTimeAsync(now, cancellationToken);
        }

        var combinedValid = licenseValidation.Valid && tamperingCheck.IsValid;

        return new LicenseValidationWithTamperingCheckResult(
            licenseValid: licenseValidation.Valid,
            tamperingCheckPassed: tamperingCheck.IsValid,
            tamperingResult: tamperingCheck,
            combinedValid: combinedValid,
            message: GenerateCombinedMessage(licenseValidation, tamperingCheck),
            requiresOnlineVerification: !tamperingCheck.IsValid || tamperingCheck.RollbackCount > 0);
    }

    private static string GenerateCombinedMessage(
        LicenseValidationResult licenseResult,
        TamperingValidationResult tamperingResult)
    {
        if (!licenseResult.Valid && !tamperingResult.IsValid)
        {
            return $"License: {licenseResult.Message} | Tampering: {tamperingResult.Message}";
        }

        if (!licenseResult.Valid)
        {
            return licenseResult.Message;
        }

        if (!tamperingResult.IsValid)
        {
            return tamperingResult.Message;
        }

        return "License and tampering checks passed.";
    }
}

/// <summary>
/// Combined result of license and tampering validation.
/// </summary>
public sealed record LicenseValidationWithTamperingCheckResult
{
    /// <summary>
    /// Whether the license itself is valid.
    /// </summary>
    public bool LicenseValid { get; init; }

    /// <summary>
    /// Whether tampering checks passed.
    /// </summary>
    public bool TamperingCheckPassed { get; init; }

    /// <summary>
    /// Detailed tampering validation result.
    /// </summary>
    public TamperingValidationResult TamperingResult { get; init; }

    /// <summary>
    /// Whether both license and tampering checks passed.
    /// </summary>
    public bool CombinedValid { get; init; }

    /// <summary>
    /// Combined validation message.
    /// </summary>
    public string Message { get; init; }

    /// <summary>
    /// Whether online verification is required to proceed.
    /// </summary>
    public bool RequiresOnlineVerification { get; init; }

    public LicenseValidationWithTamperingCheckResult(
        bool licenseValid,
        bool tamperingCheckPassed,
        TamperingValidationResult tamperingResult,
        bool combinedValid,
        string message,
        bool requiresOnlineVerification)
    {
        LicenseValid = licenseValid;
        TamperingCheckPassed = tamperingCheckPassed;
        TamperingResult = tamperingResult;
        CombinedValid = combinedValid;
        Message = message;
        RequiresOnlineVerification = requiresOnlineVerification;
    }
}
