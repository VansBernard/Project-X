# Anti-Tampering System Integration Guide

> Note: this documentation uses the planned production desktop client layout under `apps/desktop/ProjectX.Desktop`. The current repository contains the prototype at `apps/DesktopApp1/DesktopAppFresh`.

## Quick Start

### 1. Register Services (Program.cs or DI Configuration)

```csharp
using ProjectX.Desktop.Infrastructure.DependencyInjection;

// In your service configuration
services.AddAntiTamperingServices();
```

This registers:
- `IAntiTamperingService` → `AntiTamperingService`
- `TamperingAwareVerificationService`
- `TamperingAwareOfflineValidationWorkflow`
- `TamperingRecoveryWorkflow`

### 2. Application Startup Check

```csharp
// In App.xaml.cs or startup code
public partial class App : Application
{
    private readonly IAntiTamperingService _antiTamperingService;

    public App(IAntiTamperingService antiTamperingService)
    {
        _antiTamperingService = antiTamperingService;
        InitializeComponent();
    }

    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        
        var result = await _antiTamperingService.ValidateSystemTimeAsync();
        
        if (!result.IsValid && result.IsLocked)
        {
            // Device is locked, show recovery UI
            MainWindow = new TamperingRecoveryWindow();
            MainWindow.Show();
        }
        else if (!result.IsValid)
        {
            // Tampering detected but not locked yet, warn user
            MessageBox.Show(
                $"⚠️ Warning: {result.Message}\n\n" +
                $"Please connect to network to verify license.\n" +
                $"Remaining tolerance: {result.RequiredAction}",
                "Tampering Detection Warning",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);
        }
        else
        {
            // Normal operation
            MainWindow = new MainWindow();
            MainWindow.Show();
        }
    }
}
```

### 3. License Validation Integration

Replace your existing license validation with tampering-aware version:

```csharp
// OLD - Without tampering checks
public class LicenseValidator
{
    private readonly OfflineLicenseValidationWorkflow _workflow;

    public async Task<bool> ValidateLicenseAsync()
    {
        var result = await _workflow.ValidateAsync();
        return result.IsValid;
    }
}

// NEW - With tampering checks
public class LicenseValidator
{
    private readonly TamperingAwareOfflineValidationWorkflow _workflow;

    public async Task<bool> ValidateLicenseAsync()
    {
        var result = await _workflow.ValidateAsync();
        
        if (!result.IsValid && result.TamperingDetected)
        {
            // Handle tampering specifically
            if (result.RecoveryRequired)
            {
                // Device is locked, initiate recovery
                await InitiateRecoveryAsync();
                return false;
            }
            else
            {
                // Tampering warning but not locked
                LogWarning($"Tampering warning: {result.TamperingDetails?.Message}");
            }
        }
        
        return result.IsValid;
    }
}
```

### 4. Online Sync Integration

After successful server license verification, update valid time:

```csharp
public class OnlineSyncService
{
    private readonly IAntiTamperingService _antiTamperingService;
    private readonly TamperingRecoveryWorkflow _recoveryWorkflow;
    private readonly ApiClient _apiClient;

    public async Task<bool> SyncLicenseAsync()
    {
        try
        {
            // Verify license with server
            var response = await _apiClient.VerifyLicenseAsync();
            
            if (!response.IsValid)
            {
                return false;
            }

            // Parse server timestamp
            var serverTime = DateTimeOffset.Parse(response.Timestamp);

            // Update valid time (resets rollback counter if at warning level)
            await _antiTamperingService.RecordValidTimeAsync(serverTime);

            // If device was locked, attempt recovery
            if (!string.IsNullOrEmpty(response.RecoveryToken))
            {
                var recovered = await _recoveryWorkflow.InitiateRecoveryAsync(
                    response.RecoveryToken);
                
                if (recovered.Success)
                {
                    Log($"Device recovered from lock: {recovered.Message}");
                }
            }

            // Clear tampering history on successful full sync
            if (response.IsFullSync)
            {
                await _recoveryWorkflow.ClearTamperingHistoryAsync();
            }

            return true;
        }
        catch (Exception ex)
        {
            Log($"Sync failed: {ex.Message}", LogLevel.Error);
            return false;
        }
    }
}
```

### 5. Recovery UI

```csharp
// TamperingRecoveryWindow.xaml.cs
public partial class TamperingRecoveryWindow : Window
{
    private readonly TamperingStatusViewModel _viewModel;
    private readonly OnlineSyncService _syncService;

    public TamperingRecoveryWindow(
        TamperingStatusViewModel viewModel,
        OnlineSyncService syncService)
    {
        _viewModel = viewModel;
        _syncService = syncService;
        DataContext = _viewModel;
        InitializeComponent();
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        await _viewModel.RefreshStatusAsync();
    }

    private async void RecoverButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            RecoverButton.IsEnabled = false;
            StatusText.Text = "Attempting recovery...";

            // Perform online sync
            var syncSuccess = await _syncService.SyncLicenseAsync();

            if (syncSuccess)
            {
                // Check if recovery complete
                var recoveryComplete = await _viewModel.CheckRecoveryCompleteAsync();

                if (recoveryComplete)
                {
                    StatusText.Text = "✓ Device recovered! You can now close this window.";
                    // Optionally close window after delay
                    // await Task.Delay(2000);
                    // this.Close();
                }
                else
                {
                    StatusText.Text = "⚠️ Recovery still in progress. Please try again.";
                }
            }
            else
            {
                StatusText.Text = "✗ Recovery failed. Please check your network connection and try again.";
            }
        }
        catch (Exception ex)
        {
            StatusText.Text = $"✗ Error: {ex.Message}";
        }
        finally
        {
            RecoverButton.IsEnabled = true;
        }
    }
}
```

## XAML UI (TamperingRecoveryWindow.xaml)

```xml
<Window x:Class="ProjectX.Desktop.Views.TamperingRecoveryWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Device Recovery Required" 
        Width="500" Height="300"
        WindowStartupLocation="CenterScreen"
        Background="#F5F5F5">
    <Grid Padding="20">
        <StackPanel VerticalAlignment="Center" Spacing="15">
            <!-- Title -->
            <TextBlock FontSize="18" FontWeight="Bold" Foreground="#D32F2F">
                ⚠️ Device Lock Detected
            </TextBlock>

            <!-- Message -->
            <TextBlock TextWrapping="Wrap" Foreground="#424242">
                <Run Text="Your device has detected suspicious system time changes (clock rollback)."/>
                <LineBreak/>
                <LineBreak/>
                <Run Text="To unlock your device, you need to connect to the network and verify your license."/>
            </TextBlock>

            <!-- Status -->
            <Border Background="#FFF9C4" Padding="10" CornerRadius="4">
                <TextBlock Name="StatusText" TextWrapping="Wrap" Foreground="#F57F17">
                    <Run Text="Lock Reason: "/>
                    <Run Text="{Binding LockReason}"/>
                </TextBlock>
            </Border>

            <!-- Recovery Action -->
            <TextBlock TextWrapping="Wrap" Foreground="#666666">
                <Run FontWeight="Bold" Text="Required Action: "/>
                <Run Text="{Binding RecoveryAction}"/>
            </TextBlock>

            <!-- Buttons -->
            <Grid ColumnDefinitions="*,*" ColumnSpacing="10">
                <Button Name="RecoverButton" 
                        Grid.Column="0"
                        Content="Connect & Recover"
                        Click="RecoverButton_Click"
                        Background="#1976D2"
                        Foreground="White"
                        Padding="10,8"
                        FontWeight="SemiBold"/>
                
                <Button Grid.Column="1"
                        Content="Exit"
                        Click="ExitButton_Click"
                        Background="#757575"
                        Foreground="White"
                        Padding="10,8"/>
            </Grid>

            <!-- Details -->
            <TextBlock FontSize="11" Foreground="#999999" Text="Device will remain locked until recovery is complete."/>
        </StackPanel>
    </Grid>
</Window>
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Device Startup                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────────┐
         │ Load Tampering Record                 │
         │ (LastValidTime, RollbackCount, Lock)  │
         └────────────┬────────────────────────┘
                      │
                      ▼
         ┌───────────────────────────────────────┐
         │ Check: Is Device Locked?              │
         └────────────┬────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │ YES                   │ NO
          ▼                       ▼
    ┌──────────────┐      ┌────────────────────┐
    │ Show Recovery│      │ Compare Current vs │
    │ UI / Block   │      │ LastValidTime      │
    │ Operation    │      └────────┬───────────┘
    └──────────────┘               │
                        ┌──────────┴──────────┐
                        │                     │
                   Time Rollback?        No Rollback
                        │                     │
                        ▼                     ▼
                  ┌────────────┐      ┌──────────────────┐
                  │ Increment  │      │ Update Last Valid│
                  │ Rollback   │      │ Time             │
                  │ Counter    │      │ Reset Counter    │
                  └─────┬──────┘      │ Allow Operation  │
                        │            └──────────────────┘
          ┌─────────────┴─────────────┐
          │ Counter < Threshold?      │
          └─────────────┬─────────────┘
                        │
            ┌───────────┴───────────┐
            │ NO                    │ YES
            ▼                       ▼
    ┌─────────────────┐      ┌──────────────┐
    │ Lock Device     │      │ Warn User    │
    │ Flag Tampering  │      │ Require Sync │
    │ Require Recovery│      │ Allow Warning│
    └─────────────────┘      └──────────────┘
            │                       │
            └───────────┬───────────┘
                        ▼
            ┌─────────────────────┐
            │ User Connects Online │
            └────────┬────────────┘
                     │
                     ▼
         ┌──────────────────────────┐
         │ Server Verifies License  │
         │ Sends Recovery Token     │
         └────────┬─────────────────┘
                  │
                  ▼
        ┌──────────────────────────┐
        │ Device Unlocks using     │
        │ Recovery Token           │
        │ Reset Counter            │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Normal Operation Resumes │
        └──────────────────────────┘
```

## Configuration Options

### Adjust Thresholds (AntiTamperingService.cs)

```csharp
// In AntiTamperingService class

// Reduce threshold for stricter security
private const int RollbackThreshold = 3;  // Default: 5

// Increase grace period for less strict checking
private const int GracePeriodSeconds = 120;  // Default: 60
```

### Custom Recovery Workflow

```csharp
public class CustomRecoveryService
{
    private readonly TamperingRecoveryWorkflow _workflow;
    private readonly SmsNotificationService _smsService;

    public async Task<RecoveryResult> InitiateWithNotificationAsync(string phoneNumber)
    {
        // Send SMS with recovery link
        var recoveryToken = await _workflow.GenerateRecoveryTokenAsync(
            DateTimeOffset.UtcNow,
            "license-id-here");

        await _smsService.SendRecoveryLinkAsync(phoneNumber, recoveryToken);

        // Return status to user
        var status = await _workflow.GetRecoveryStatusAsync();
        return new RecoveryResult(true, "Recovery link sent to your phone.");
    }
}
```

## Testing Tampering Detection

### Manual Testing

1. **Normal Operation:**
   ```
   - Start app → Should see normal operations
   - No tampering warnings
   ```

2. **Simulate Rollback:**
   ```
   - Run app, note startup time
   - Change system time backwards by 2 minutes
   - Run app again → Should see rollback warning
   ```

3. **Simulate Device Lock:**
   ```
   - Simulate rollback 5 times
   - On 5th attempt → Device should lock
   - Recovery UI should appear
   ```

4. **Simulate Recovery:**
   ```
   - With locked device, connect to network
   - Run online sync
   - Device should unlock
   - Normal operation resumes
   ```

### Automated Testing

See `ProjectX.Desktop.Tests/Services/Tampering/` for unit tests:
- `AntiTamperingServiceTests.cs`
- `TamperingRecoveryWorkflowTests.cs`
- `TamperingAwareVerificationTests.cs`

## Troubleshooting

### Device Lock Won't Clear

**Issue:** Device remains locked after online sync

**Solutions:**
1. Check recovery token format (should be base64-encodable)
2. Verify device ID matches in token
3. Check timestamp in token is recent
4. Clear storage and restart app

### False Rollback Detections

**Issue:** Device detecting rollback on normal operations

**Solutions:**
1. Increase `GracePeriodSeconds` to 120+
2. Check for system time sync services (NTP)
3. Disable automatic time adjustment temporarily
4. Check for hardware clock issues

### Storage File Corruption

**Issue:** Tampering record corrupted

**Solutions:**
1. Service auto-recovers by creating new record
2. Device may show initial warning on recovery
3. Counter resets to 0 after recovery
4. Check disk space and permissions

## Performance Considerations

- **Storage Access:** Minimal impact (one encrypted file read/write)
- **Time Validation:** < 1ms per check
- **Recovery Token:** Fast base64 operations
- **Offline Operation:** No network required for detection

## Security Notes

⚠️ **Important:** The anti-tampering system is not a complete security solution:

- It detects clock rollbacks, not all attacks
- Requires online verification for recovery (cannot bypass locally)
- Relies on DPAPI encryption (Windows user account security)
- Should be combined with license signature verification
- Works best with periodic online sync

See [security-architecture.md](../architecture/security-architecture.md) for comprehensive security model.
