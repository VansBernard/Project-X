# Laptop Client

This folder contains the Windows lock screen client for Project X.

## Requirements

- **Windows 10 or later** (x64)
- **.NET 8** (SDK for development, Runtime for deployment)
- **WiX Toolset 5.2** (for building the MSI installer)
- **Visual Studio 2022** or VS Code (recommended for development)

## Structure

- `LockScreenApp/` — WPF application that displays the lock screen and unlock flow.
- `TokenVerifier/` — shared token verification and registry storage library.
- `tests/LockScreenApp.Tests/` — .NET test project for validation logic.

## Security improvements

- Local registration and deadline data are stored in the current user registry and encrypted with Windows DPAPI.
- Runtime `.env` loading is disabled by default in production. Use `PROJECTX_USE_ENV_FILE=true` only for local development.
- Optional public-key verification is supported through `TOKEN_PUBLIC_KEY`.
- The full-screen lock screen now blocks common bypass keys such as Alt+Tab, Alt+F4, and the Windows key.
- Client errors are written to `%LOCALAPPDATA%\ProjectX\LaptopClient\Logs\client.log`.

## Build and run

```powershell
cd "c:\Users\ASUS\Documents\Project X\laptop-client\LockScreenApp"
dotnet build
dotnet run
```

## Environment variables

The client reads configuration from the process environment.

Required for unlock verification:

- `TOKEN_SECRET` — current shared HMAC secret (existing setup)
- or `TOKEN_PUBLIC_KEY` — optional RSA public key for future signed-token support.

Optional development helper:

- `PROJECTX_USE_ENV_FILE=true` — load `.env` from a parent directory during development only.

## Testing

```powershell
dotnet test "laptop-client\tests\LockScreenApp.Tests\LockScreenApp.Tests.csproj"
```

## CI

A GitHub Actions workflow is provided at `.github/workflows/laptop-client-ci.yml`.
