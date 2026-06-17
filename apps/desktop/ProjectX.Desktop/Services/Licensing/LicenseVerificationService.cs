using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ProjectX.Desktop.Infrastructure.Configuration;
using ProjectX.Desktop.Models;

namespace ProjectX.Desktop.Services.Licensing;

public sealed class LicenseVerificationService
{
    public LicenseValidationResult Validate(
        LicensePayload payload,
        string signatureBase64,
        string localDeviceId,
        string assignedContractId,
        DateTimeOffset now)
    {
        if (payload.Algorithm != "RSA-SHA256")
        {
            return Invalid("Unsupported signature algorithm.");
        }

        var deviceMatches = payload.DeviceId == localDeviceId;
        var contractMatches = payload.ContractId == assignedContractId;

        if (!DateTimeOffset.TryParse(payload.IssuedAt, out var issuedAt))
        {
            return Invalid("Invalid issue date.");
        }

        if (!DateTimeOffset.TryParse(payload.ExpiresAt, out var expiresAt))
        {
            return Invalid("Invalid expiration date.");
        }

        var issued = issuedAt <= now;
        var notExpired = expiresAt > now;
        var signatureValid = VerifySignature(payload, signatureBase64);
        var valid = signatureValid && issued && notExpired && deviceMatches && contractMatches;

        return new LicenseValidationResult(
            valid,
            signatureValid,
            notExpired,
            issued,
            deviceMatches,
            contractMatches,
            valid ? "License is valid." : "License is invalid.",
            expiresAt);
    }

    private static bool VerifySignature(LicensePayload payload, string signatureBase64)
    {
        using var rsa = RSA.Create();
        rsa.ImportFromPem(PublicLicenseKey.Pem);

        var data = Encoding.UTF8.GetBytes(CanonicalJson(payload));
        var signature = Convert.FromBase64String(signatureBase64);

        return rsa.VerifyData(
            data,
            signature,
            HashAlgorithmName.SHA256,
            RSASignaturePadding.Pkcs1);
    }

    private static LicenseValidationResult Invalid(string reason)
    {
        return new LicenseValidationResult(false, false, false, false, false, false, reason, null);
    }

    private static string CanonicalJson(LicensePayload payload)
    {
        var fields = new SortedDictionary<string, object?>
        {
            ["algorithm"] = payload.Algorithm,
            ["contractId"] = payload.ContractId,
            ["deviceId"] = payload.DeviceId,
            ["expiresAt"] = payload.ExpiresAt,
            ["issuedAt"] = payload.IssuedAt,
            ["keyId"] = payload.KeyId
        };

        if (!string.IsNullOrWhiteSpace(payload.LicenseId))
        {
            fields["licenseId"] = payload.LicenseId;
        }

        return JsonSerializer.Serialize(fields);
    }
}

