using ProjectX.Desktop.Models;
using ProjectX.Desktop.Services.Device;

namespace ProjectX.Desktop.Services.Licensing;

public sealed class OfflineLicenseValidationWorkflow
{
    private readonly ILicenseCacheService _licenseCache;
    private readonly IDeviceIdentityService _deviceIdentity;
    private readonly LicenseVerificationService _verification;

    public OfflineLicenseValidationWorkflow(
        ILicenseCacheService licenseCache,
        IDeviceIdentityService deviceIdentity,
        LicenseVerificationService verification)
    {
        _licenseCache = licenseCache;
        _deviceIdentity = deviceIdentity;
        _verification = verification;
    }

    public async Task<LicenseValidationResult> ValidateAsync(CancellationToken cancellationToken = default)
    {
        var cachedLicense = await _licenseCache.LoadAsync(cancellationToken);
        if (cachedLicense is null)
        {
            return new LicenseValidationResult(
                false,
                false,
                false,
                false,
                false,
                false,
                "No cached license was found.",
                null);
        }

        var identity = await _deviceIdentity.GetDeviceIdentityAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(identity.ContractId))
        {
            return new LicenseValidationResult(
                false,
                false,
                false,
                false,
                false,
                false,
                "No assigned contract was found for this device.",
                null);
        }

        return _verification.Validate(
            cachedLicense.Payload,
            cachedLicense.Signature,
            identity.DeviceId,
            identity.ContractId,
            DateTimeOffset.UtcNow);
    }
}

