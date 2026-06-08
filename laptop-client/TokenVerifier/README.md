# TokenVerifier

Small offline verifier for the laptop unlock code.

It must use the same formula as the backend:

```text
HMAC-SHA256(hardware_uuid + year + month, TOKEN_SECRET)
first 8 hex characters
mod 100000000
pad to 8 digits
```

Permanent release codes are generated with:

```text
HMAC-SHA256(hardware_uuid + ":release", TOKEN_SECRET)
first 8 hex characters
mod 100000000
pad to 8 digits
```

## Run

Install the .NET 8 SDK, then:

```powershell
$env:TOKEN_SECRET="same_secret_as_backend"
dotnet run -- --hardware hw-123 --year 2026 --month 7 --code 44900154
```

The app prints:

```text
VALID
```

or:

```text
INVALID
```

## Real Device ID

Print this laptop's hardware ID:

```powershell
dotnet run -- --print-hardware
```

Verify a code using this laptop's real hardware ID:

```powershell
$env:TOKEN_SECRET="same_secret_as_backend"
dotnet run -- --year 2026 --month 7 --code 44900154
```

## Deadline

Check lock status:

```powershell
dotnet run -- --status
```

Set a test deadline:

```powershell
dotnet run -- --set-deadline 2026-07-31
```

When a valid code is entered, the verifier stores the last day of that token's month as the new access deadline.

## Permanent Release

After the contract is fully paid, enter the release code from the backend:

```powershell
$env:TOKEN_SECRET="same_secret_as_backend"
dotnet run -- --code 12345678
```

When a valid release code is entered, the verifier stores a permanent release flag. The startup agent treats the device as unlocked after that.

This is only the verifier. The real laptop client still needs the Windows service, lock screen, and time-tampering checks.
