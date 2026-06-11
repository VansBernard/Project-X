# Laptop Client Production Guide

## Installation

### End Users
1. Download the MSI installer: `ProjectX-LaptopClient.msi`
2. Run the installer and follow the on-screen prompts.
3. The LockScreenApp will be installed in `%ProgramFiles%\ProjectX\LaptopClient`.

### Developers / Self-Hosting

#### Prerequisites
- Windows 10 or later (x64)
- .NET 8.0 SDK (for building) or Runtime (for running)
- WiX Toolset 5.2 (for building the installer)

#### Build from source
```bash
cd laptop-client\LockScreenApp
dotnet publish -c Release -o .\publish
```

#### Build the production installer
A simple build script packages both the lock-screen client and the startup agent into an MSI:

```powershell
cd laptop-client
.\build-installer.ps1
```

The output MSI is created at `laptop-client\installer\ProjectX-LaptopClient.msi`. Copy it to a USB drive for distribution.


## Environment Configuration

### Development
Environment variables are loaded from `.env` in the `laptop-client` directory (debug mode only).

```env
TOKEN_SECRET=your-hmac-secret
BACKEND_URL=http://localhost:3000
PAYMENT_URL=http://localhost:3000
```

### Production
Secrets must be provided via Windows environment variables or Group Policy. The app will **not** read from `.env` in release builds.

To set environment variables system-wide:
```powershell
# As Administrator
[System.Environment]::SetEnvironmentVariable("TOKEN_SECRET", "your-value", "Machine")
[System.Environment]::SetEnvironmentVariable("BACKEND_URL", "https://your-backend", "Machine")
```

## Security Features

### Encryption
- **DeadlineStore**: Lock deadlines are encrypted using Windows DPAPI (encrypted at rest in registry).
- **SecureStorage**: Sensitive local data is encrypted using DPAPI with `CurrentUser` scope.

### Lockscreen Hardening
- Full-screen overlay (cannot be dismissed by Alt+Tab, Win key, or Alt+F4 when locked).
- Low-level keyboard hook suppresses common escape attempts.
- Window is always-on-top and hidden from taskbar.

### Logging
Client logs are written to `%LOCALAPPDATA%\ProjectX\LaptopClient\Logs\client.log`.

## Troubleshooting

### "TOKEN_SECRET is missing"
**Cause**: The required environment variable is not set.

**Fix**:
- Dev: Add `TOKEN_SECRET` to the `.env` file.
- Prod: Set the environment variable at the system level (requires admin):
  ```powershell
  [System.Environment]::SetEnvironmentVariable("TOKEN_SECRET", "your-value", "Machine")
  ```
  Then restart the application.

### Unlock code not working
**Cause**: The code may have expired or the hardware UUID may have changed.

**Debug**:
1. Get the device hardware UUID:
   ```bash
   dotnet run -- --print-hardware
   ```
2. Check the deadline status:
   ```bash
   dotnet run -- --status
   ```

### Log location
Logs are stored in `%LOCALAPPDATA%\ProjectX\LaptopClient\Logs\`.

## Auto-Update Strategy

The current release does **not** include auto-update. For production rollout:

1. **Installer Updates**: Use Windows Update or a dedicated update server.
2. **Scheduled Checks**: The app can periodically check a manifest file for new versions.
3. **Staged Rollout**: Deploy to a pilot group before full release.

## Code Signing

All installers and binaries should be signed with a valid code-signing certificate:

```bash
signtool.exe sign /f mycert.pfx /p mypassword /t http://timestamp.authority.com /d "Project X" app.exe
```

In CI, the signing certificate can be stored as a base64-encoded secret named `SIGNING_CERTIFICATE_PFX`, with the password in `SIGNING_CERTIFICATE_PASSWORD`.

The release pipeline will use those values to sign the published MSI and binaries automatically.

Ensure the certificate is:
- Issued by a trusted Certificate Authority (CA).
- Non-expired.
- Configured in the CI/CD pipeline via secrets.

A release workflow is included at `.github/workflows/laptop-client-release.yml`.
When a GitHub release is published, the workflow will build the MSI, sign it (if signing secrets are configured), validate the installer, and upload the MSI to the release.

## Incident Response

### If TOKEN_SECRET is compromised
1. Generate a new secret.
2. Update it in all deployment environments.
3. Notify users to update to the latest app version.
4. Monitor for unauthorized unlock attempts in backend logs.

### If the lockscreen is bypassed
1. Review the client logs for error messages.
2. Check the system event log for security-related events.
3. Update the lockscreen hardening if a new bypass is discovered.

## Rollback Procedure

To rollback to a previous version:

1. Uninstall the current version.
2. Download and install the previous stable release from the repository.
3. Restore the registry keys if needed (backup recommended):
   ```powershell
   reg export "HKEY_CURRENT_USER\Software\ProjectX\LaptopClient" backup.reg
   ```

## Monitoring and Alerts

Track the following metrics in production:

- **Unlock failures**: Indicates configuration issues or code generation problems.
- **Registration failures**: May indicate backend connectivity issues.
- **Client crashes**: Monitor via logs stored in the Logs directory.

## Support

For issues, check:
- Client logs: `%LOCALAPPDATA%\ProjectX\LaptopClient\Logs\client.log`
- Backend logs: Review server-side logs for payment/registration errors.
- Hardware compatibility: Ensure the device meets minimum specs (Windows 10+, .NET 8.0+).
