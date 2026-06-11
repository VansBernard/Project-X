# LockScreenApp

First Windows lock-screen shell for Project X.

It uses:

- `HardwareFingerprint` to read this laptop's hardware ID
- `OfflineToken` to verify the unlock code without internet
- `DeadlineStore` to decide whether the laptop is locked

## Run

```powershell
dotnet run
```

The app automatically loads `TOKEN_SECRET` and other settings from the root `.env` file.

Defaults to the Render backend and payment page:
- Backend API: `https://project-x-kg81.onrender.com`
- Payment page: `https://project-x-kg81.onrender.com`

If the stored deadline is expired or missing, the lock screen opens.

For testing, set an expired deadline first:

```powershell
cd ..\TokenVerifier
dotnet run -- --set-deadline 2026-01-01
cd ..\LockScreenApp
$env:TOKEN_SECRET="same_secret_as_backend"
dotnet run
```

This is still a prototype. The production version needs to run from a Windows service or startup task, store protected settings, and add stronger keyboard/process controls.
