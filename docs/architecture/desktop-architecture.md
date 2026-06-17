# Desktop Architecture

The desktop client is a WPF .NET 8 application using MVVM. It runs on financed Windows laptops and communicates with the Project X API.

The backend remains authoritative. The desktop client can cache state, display state, and acknowledge commands, but it cannot determine financial truth.

## Project Layout

```text
apps/desktop/
  ProjectX.Desktop/
    Views/
    ViewModels/
    Models/
    Services/
      Api/
      Auth/
      Device/
      Sync/
      Storage/
      Update/
      Logging/
    Infrastructure/
      Configuration/
      DependencyInjection/
      Security/
      Windows/
    Resources/
    App.xaml
  ProjectX.Desktop.Tests/
  ProjectX.Desktop.sln
```

## MVVM Responsibilities

### Views

Views contain WPF XAML only. They should bind to ViewModels and avoid business decisions.

Potential views:

- Registration view.
- Device status view.
- Payment status view.
- Lock/access state view.
- Sync status view.
- Support view.

### ViewModels

ViewModels expose bindable state and UI commands. They should use injected services and avoid direct API or filesystem access.

### Models

Models should distinguish between:

- API DTOs.
- Local persisted state.
- UI presentation models.

## Desktop Services

Core service boundaries:

- `ApiClient`: typed backend API access.
- `DeviceIdentityService`: stable local device identity.
- `RegistrationService`: device registration lifecycle.
- `SyncService`: heartbeat and state synchronization.
- `CommandService`: command polling and acknowledgement.
- `LocalStorageService`: encrypted local persistence.
- `LockStateService`: local access-state surface.
- `UpdateService`: client update metadata and installation boundary.
- `TelemetryService`: local event capture and upload.

## Local State

Allowed local state:

- Device registration ID.
- Device credential material.
- Last known server state.
- Last successful sync timestamp.
- Pending telemetry.
- Client configuration.

Not authoritative locally:

- Payment status.
- Contract status.
- Customer balance.
- Final access decision.
- Tenant policy.

## Sync Model

Recommended high-level flow:

```text
startup -> load local state -> authenticate device -> heartbeat -> sync desired state -> poll commands -> acknowledge outcomes
```

Sync should support:

- Retry with backoff.
- Offline-tolerant display state.
- Idempotent acknowledgements.
- Versioned API contracts.
- Clock skew handling.

## Security Requirements

Desktop security foundations:

- Per-device credentials.
- Encrypted local secret storage.
- Signed installer.
- No embedded tenant-wide secrets.
- Server-authoritative command state.
- Command expiration.
- Audit event upload.
- Update metadata verification.

## Testing Strategy

Test layers:

- ViewModel unit tests.
- Service unit tests.
- API contract tests.
- Local storage tests.
- Manual installer and startup validation.
- Manual sync and recovery validation.

