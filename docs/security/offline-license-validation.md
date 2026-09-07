# Offline License Validation

The desktop client can validate a license without internet access.

## Desktop Stack

- WPF
- .NET 8
- MVVM

## Offline Unlock Rule

The laptop unlocks only when all checks pass:

- A cached license exists in local protected storage.
- The license signature verifies with the embedded RSA public key.
- The license `deviceId` matches the local device identity.
- The license `contractId` matches the assigned contract.
- The current local time is after `issuedAt`.
- The current local time is before `expiresAt`.
- The payload algorithm is `RSA-SHA256`.

## Local Components

- `ProtectedFileStorage`: encrypted local file storage using Windows DPAPI.
- `LicenseCacheService`: saves and loads the cached signed license.
- `LocalDeviceIdentityService`: loads the locally assigned device and contract identity.
- `LicenseVerificationService`: verifies RSA signature, expiration, issue date, device ownership, and contract ownership.
- `OfflineLicenseValidationWorkflow`: orchestrates the complete offline validation path.
- `OfflineLicenseViewModel`: MVVM surface for unlock state and validation status.

## Workflow

```text
desktop startup
-> load cached license
-> load local device identity
-> verify RSA-SHA256 signature with embedded public key
-> check issuedAt and expiresAt
-> check payload deviceId against local device ID
-> check payload contractId against local contract ID
-> expose UnlockAllowed to WPF ViewModel
```

## No Internet Requirement

The validation path performs no network calls. Online sync may refresh the cached license later, but unlock validation itself depends only on:

- cached signed license
- local device identity
- embedded public key
- local system clock

## Public Key

The desktop public key is planned to live in the future production desktop layout at:

```text
apps/desktop/ProjectX.Desktop/Infrastructure/Configuration/PublicLicenseKey.cs
```

The canonical current desktop prototype is implemented in `apps/DesktopApp1/DesktopAppFresh`.

The backend private key must never be included in the desktop client.

