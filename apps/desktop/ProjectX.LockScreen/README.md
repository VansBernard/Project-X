# Project X Lock Screen Client

## Overview

The Lock Screen Client is a WPF desktop application built with .NET 8 and MVVM architecture. It displays when a device's license is invalid, expired, or the device is in a locked/tampered state.

## Architecture

### Folder Structure

```
ProjectX.LockScreen/
├── Views/
│   ├── LockScreenWindow.xaml          # Main locked state UI
│   ├── LicenseEntryWindow.xaml        # License entry/input UI
│   ├── ActivationWindow.xaml          # Device recovery/activation UI
│   └── StatusWindow.xaml              # Device status display UI
├── ViewModels/
│   ├── ViewModelBase.cs               # MVVM base class
│   └── LockScreenViewModels.cs        # All ViewModels
├── Models/
│   └── LockScreenModels.cs            # Domain models
├── Services/
│   └── ILockScreenServices.cs         # Service interfaces
├── Infrastructure/
│   └── ServiceConfiguration.cs        # DI setup
├── App.xaml                           # App configuration
├── App.xaml.cs                        # App code-behind
└── ProjectX.LockScreen.csproj         # Project file
```

### Technology Stack

- **Framework:** .NET 8 with Windows Desktop
- **UI:** WPF (Windows Presentation Foundation)
- **Pattern:** MVVM (Model-View-ViewModel)
- **DI:** Microsoft.Extensions.DependencyInjection
- **Language:** C# 12 with nullable reference types

## Views

### 1. Lock Screen (Default View)
**File:** `LockScreenWindow.xaml`

Shows when device is locked and waiting for license verification.

**Features:**
- Device ID display
- Lock status message
- Tampering warning (if applicable)
- Quick action buttons:
  - Enter License
  - Recover Device
  - View Details

**ViewModel:** `LockScreenViewModel`
- `DeviceId`: Current device identifier
- `Status`: Current lock status message
- `IsDeviceTampered`: Whether tampering detected
- `TamperingMessage`: Tampering details
- Commands: `UnlockCommand`, `EntryLicenseCommand`, `ShowStatusCommand`

### 2. License Entry Screen
**File:** `LicenseEntryWindow.xaml`

Allows users to enter license keys or recovery tokens.

**Features:**
- License input text area
- Real-time validation feedback
- Success/error messages
- Submit/Cancel actions

**ViewModel:** `LicenseEntryViewModel`
- `LicenseInput`: User-entered license data
- `IsValidating`: Validation in progress
- `ValidationMessage`: Validation result
- `IsValidationSuccess`: Whether validation succeeded
- Commands: `SubmitCommand`, `CancelCommand`

### 3. Activation/Recovery Screen
**File:** `ActivationWindow.xaml`

Handles device recovery and unlock after tampering or excessive failed attempts.

**Features:**
- Recovery instructions
- Recovery token display
- Recovery status/progress
- Action buttons:
  - Attempt Recovery
  - Contact Support
  - Back

**ViewModel:** `ActivationViewModel`
- `RecoveryToken`: Device recovery token
- `IsRecovering`: Recovery in progress
- `RecoveryStatus`: Current recovery status
- `RecoverySuccess`: Whether recovery succeeded
- `LockInfo`: Lock details
- Commands: `AttemptRecoveryCommand`, `ContactSupportCommand`, `BackCommand`

### 4. Status Screen
**File:** `StatusWindow.xaml`

Comprehensive device and license status display.

**Features:**
- License information display
- Device lock status
- Expiration warnings
- Sync with server button
- Detailed device information

**ViewModel:** `StatusViewModel`
- `LicenseInfo`: Current license information
- `DeviceLockInfo`: Current lock status
- `DeviceId`: Device identifier
- `ExpirationWarning`: Expiration alert
- `ShowExpirationWarning`: Whether to show warning
- `LockWarning`: Lock status alert
- `ShowLockWarning`: Whether to show warning
- `IsSyncing`: Server sync in progress
- Commands: `SyncCommand`, `CloseCommand`

## ViewModels

### Base Class: ViewModelBase
Implements `INotifyPropertyChanged` for MVVM support.

**Methods:**
- `SetProperty<T>()`: Raises PropertyChanged when property updates
- `NotifyPropertyChanged()`: Manually raise PropertyChanged

### Command Classes

**AsyncRelayCommand**
- Non-parameterized async command
- Supports can-execute predicate
- Disables while executing

**AsyncRelayCommand<T>**
- Parameterized async command
- Type-safe parameter passing
- Disables while executing

## Models

### LockScreenState (Enum)
```csharp
Locked           // Showing lock screen
LicenseEntry     // Showing license entry
Activation       // Showing recovery
Status           // Showing status
Error            // Showing error
```

### LockScreenSession (Record)
Current lock screen state snapshot.

**Properties:**
- `CurrentState`: Active screen
- `IsTampered`: Tampering detected
- `IsLicenseValid`: License valid
- `LicenseExpires`: Expiration time
- `ErrorMessage`: Current error
- `TimeUntilExpiration`: Time remaining
- `ShouldWarnAboutExpiration`: Show warning

### LicenseInfo (Record)
License details for display.

**Properties:**
- `LicenseId`, `ContractId`, `DeviceId`: Identifiers
- `IssuedAt`, `ExpiresAt`: License dates
- `Status`: License status
- `DaysRemaining`: Days until expiration
- `IsExpiringSoon`: < 30 days remaining
- `IsExpired`: License expired

### LicenseStatus (Enum)
```csharp
Valid            // Valid and not expiring soon
ExpiringSoon     // < 30 days
Expired          // Past expiration
Invalid          // Missing or invalid
```

### DeviceLockInfo (Record)
Device lock status details.

**Properties:**
- `IsLocked`: Device locked
- `Reason`: Lock reason
- `RecoveryAction`: Recovery instructions
- `LockedAt`: When locked
- `TamperingDetected`: Tampering flag

## Services

### ILockScreenManager
Main orchestrator for lock screen state and transitions.

**Methods:**
- `InitializeAsync()`: Initialize lock screen
- `GoToLicenseEntryAsync()`: Switch to license entry
- `GoToActivationAsync()`: Switch to activation
- `GoToStatusAsync()`: Switch to status
- `ProcessLicenseEntryAsync()`: Validate license entry
- `AttemptRecoveryAsync()`: Attempt device recovery
- `UnlockDeviceAsync()`: Unlock device
- `GetLicenseInfoAsync()`: Get current license info
- `GetDeviceLockStatusAsync()`: Get lock status
- `SyncWithServerAsync()`: Sync with server

### IOfflineLicenseValidator
Validate licenses offline.

**Methods:**
- `ValidateCachedLicenseAsync()`: Validate cached license
- `ValidateLicenseFormat()`: Check format validity
- `IsExpiringAsync()`: Check if expiring soon

### IDeviceRecoveryService
Handle device recovery operations.

**Methods:**
- `InitiateRecoveryAsync()`: Start recovery
- `GenerateRecoveryTokenAsync()`: Create recovery token
- `GetLockStatusAsync()`: Get current lock status
- `CanUnlockAsync()`: Check if unlockable

### IServerSyncService
Communicate with server.

**Methods:**
- `SyncAsync()`: Full device sync
- `ValidateLicenseWithServerAsync()`: Server license validation
- `ReportStatusAsync()`: Report device status

## Dependency Injection

### Setup
```csharp
services.AddLockScreenServices();
```

**Registered Services:**
- `ILockScreenManager` → `LockScreenManager`
- `IOfflineLicenseValidator` → `OfflineLicenseValidator`
- `IDeviceRecoveryService` → `DeviceRecoveryService`
- `IServerSyncService` → `ServerSyncService`

### Usage in App.xaml.cs
```csharp
var services = new ServiceCollection();
services.AddLockScreenServices();
var provider = services.BuildServiceProvider();

MainWindow = new LockScreenWindow();
MainWindow.DataContext = provider.GetRequiredService<LockScreenViewModel>();
```

## Styling

### Dark Theme
- Background: `#0d0d0d`, `#1a1a1a`
- Text: `#FFFFFF`, `#CCCCCC`, `#999999`
- Accent: `#FF6B35` (Primary Orange)
- Secondary: `#4A90E2` (Blue)
- Alerts: `#FF4444` (Red)
- Success: `#66DD66` (Green)

### Color Palette
```xml
<SolidColorBrush x:Key="PrimaryBrush" Color="#FF6B35"/>
<SolidColorBrush x:Key="DangerBrush" Color="#FF4444"/>
<SolidColorBrush x:Key="SuccessBrush" Color="#66DD66"/>
```

## Integration with Project X Desktop App

### Startup Flow
1. Desktop app starts
2. Anti-tampering check validates system time
3. If device locked or license invalid:
   - Launch `ProjectX.LockScreen.exe`
   - Pass device state via IPC or shared storage
4. Lock screen app initializes with current state
5. User enters license or initiates recovery
6. On success, desktop app continues

### Data Exchange
Lock screen communicates with main app via:
- Shared secure storage (for persistent state)
- Command-line arguments (for startup state)
- IPC named pipes (for real-time updates)
- File-based state synchronization

## Future Enhancements

- [ ] Biometric unlock (Windows Hello)
- [ ] Mobile companion app for recovery
- [ ] SMS/Email notifications
- [ ] Support ticket creation UI
- [ ] License purchase/renewal links
- [ ] Multi-language support
- [ ] Customizable branding
- [ ] Advanced animation effects
- [ ] Accessibility improvements
- [ ] Dark/Light theme toggle

## Building & Running

### Build
```bash
dotnet build apps/desktop/ProjectX.LockScreen/ProjectX.LockScreen.csproj
```

### Run
```bash
dotnet run --project apps/desktop/ProjectX.LockScreen/ProjectX.LockScreen.csproj
```

### Package
```bash
dotnet publish -c Release -o ./publish apps/desktop/ProjectX.LockScreen/ProjectX.LockScreen.csproj
```

## Testing

See `ProjectX.LockScreen.Tests` for unit tests:
- ViewModel tests
- Command tests
- Service tests
- Integration tests

## References

- [Project X Desktop Architecture](../ProjectX.Desktop/README.md)
- [Anti-Tampering System](../../docs/security/anti-tampering-system.md)
- [License Engine](../../docs/security/license-engine.md)
- [WPF and MVVM](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/)
