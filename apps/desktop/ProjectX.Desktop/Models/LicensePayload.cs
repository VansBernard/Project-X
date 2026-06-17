namespace ProjectX.Desktop.Models;

public sealed record LicensePayload(
    string? LicenseId,
    string DeviceId,
    string ContractId,
    string IssuedAt,
    string ExpiresAt,
    string KeyId,
    string Algorithm
);

public sealed record CachedLicense(
    LicensePayload Payload,
    string Signature,
    string LicenseKey,
    DateTimeOffset CachedAt
);

public sealed record DeviceIdentity(
    string DeviceId,
    string ContractId
);

public sealed record LicenseValidationResult(
    bool IsValid,
    bool SignatureValid,
    bool NotExpired,
    bool Issued,
    bool DeviceMatches,
    bool ContractMatches,
    string Reason,
    DateTimeOffset? ExpiresAt
);
