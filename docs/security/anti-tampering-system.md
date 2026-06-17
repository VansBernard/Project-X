# Anti-Tampering System Documentation

## Overview

The Anti-Tampering System is a comprehensive security mechanism designed to detect and respond to clock rollback attacks and system time manipulation attempts. This is critical for offline license validation, as attackers could otherwise extend license validity by setting system time backwards.

## Architecture

### Core Components

#### 1. **IAntiTamperingService** (Tampering Detection)
Main service for detecting and responding to tampering attempts.

**Key Responsibilities:**
- Maintain secure record of system time state
- Detect clock rollback attacks
- Track consecutive rollback attempts
- Lock device after threshold exceeded
- Generate and validate recovery tokens

**Secure Storage:**
- Uses DPAPI (Data Protection API) for encryption
- Stores: `LastStartupTime`, `LastValidTime`, `RollbackCount`, `IsLocked`
- File: `tampering-record.json` (encrypted)

#### 2. **AntiTamperingService** (Implementation)
Concrete implementation of tampering detection logic.

**Detection Algorithm:**
```
1. Load persisted tampering record
2. Compare current system time with LastValidTime
3. If time moved backwards > 60 seconds:
   - Increment RollbackCount
   - Record tampering event timestamp
   - If RollbackCount >= 5:
     - Lock device
     - Flag as tampering detected
   - Else:
     - Return rollback warning
   - Require online verification to reset counter
4. If time moved forward or within 60s grace period:
   - Update LastValidTime
   - Reset RollbackCount to 0
   - Return success
```

**Grace Period:**
- 60 seconds of clock drift allowed (system time adjustments)
- Prevents false positives from NTP sync or battery backup issues
- Protects against OS time zone changes

**Rollback Threshold:**
- 5 consecutive rollback detections trigger device lock
- Prevents accidental locks from occasional system adjustments
- Reduces false positives while maintaining security

#### 3. **TamperingAwareVerificationService** (License Integration)
Integrates tampering detection with license validation.

**Workflow:**
```
Check Tampering First
    ↓
    If Device Locked → Return failure
    ↓
Validate License Signature & Expiration
    ↓
    If License Invalid → Return failure
    ↓
Validate System Time (no rollback)
    ↓
    If Rollback Detected → Return rollback warning
    ↓
Update Valid Time & Reset Counter
    ↓
Return Success
```

**Result:** `LicenseValidationWithTamperingCheckResult`
- Contains both license and tampering validation results
- Combined validity flag
- Separate tracking for each validation type
- Detailed error messages

#### 4. **TamperingAwareOfflineValidationWorkflow** (Offline License Validation)
Enhanced offline license validation with tampering checks.

**Complete Workflow:**
1. Check device lock status
2. Load cached license
3. Get device identity
4. Run combined license + tampering validation
5. Return detailed result

**Result:** `OfflineValidationWithTamperingResult`
- Indicates if online verification required
- Specifies recovery actions needed
- Includes license expiration info

#### 5. **TamperingRecoveryWorkflow** (Device Recovery)
Handles recovery process for locked devices.

**Recovery Process:**
```
Device Locked
    ↓
User Connects to Network
    ↓
Initiate Online License Verification
    ↓
Server Validates License & Device State
    ↓
Server Sends Recovery Token
    ↓
Device Validates Token
    ↓
Device Unlocks & Resets Counter
    ↓
Device Records Valid Time
    ↓
Normal Operation Resumes
```

**Recovery Token:**
- Format: `Base64(DeviceId|LicenseId|Timestamp)`
- Generated after successful online verification
- Contains proof of valid license state
- Device-specific (includes DeviceId)
- Time-bound (includes timestamp)

## Data Model

### TamperingRecord
```csharp
{
  "lastStartupTime": "2026-06-16T10:30:00Z",
  "lastValidTime": "2026-06-16T10:30:00Z",
  "rollbackCount": 0,
  "lastTamperingDetectedAt": null,
  "isLocked": false,
  "lockReason": null,
  "recoveryAction": null
}
```

**Fields:**
- `lastStartupTime`: When app last started
- `lastValidTime`: Latest time that passed validation
- `rollbackCount`: Consecutive rollback detections (resets on normal progression)
- `lastTamperingDetectedAt`: Timestamp of tampering incident
- `isLocked`: Whether device is locked
- `lockReason`: Why device is locked (if locked)
- `recoveryAction`: What user must do to unlock

### TamperingValidationResult
```csharp
{
  "isValid": true,
  "isRollbackDetected": false,
  "rollbackCount": 0,
  "isLocked": false,
  "message": "Device passed anti-tampering checks.",
  "requiredAction": null,
  "timeOffsetSeconds": 5
}
```

## Usage Scenarios

### Scenario 1: Normal Operation
```
1. Device starts → Load tampering record (lastValidTime = 2026-06-16 10:00:00)
2. Current time = 2026-06-16 10:05:00 (5 seconds later) ✓
3. Update lastValidTime to current
4. Allow operation
```

### Scenario 2: Clock Rollback Detection
```
1. Device running → Last valid time = 2026-06-16 10:00:00
2. User sets system time back to 2026-06-16 09:50:00
3. Offset = -600 seconds (> 60s grace period) ⚠️
4. Increment rollbackCount (now 1)
5. Flag tampering detected
6. Continue operation but require online verification on next sync
```

### Scenario 3: Rollback Threshold Exceeded
```
1. Rollback detected → RollbackCount becomes 1
2. Rollback detected → RollbackCount becomes 2
3. ... [repeated 3 more times]
4. Rollback detected → RollbackCount becomes 5 (threshold!)
5. LOCK device
6. Set lockReason = "Excessive clock rollback attempts (5)"
7. Set recoveryAction = "Connect to network and verify license"
8. Block all operations until recovery
```

### Scenario 4: Device Recovery
```
1. Locked device with rollbackCount = 5
2. User connects to network
3. System attempts online license verification
4. Server returns valid license + recovery token
5. Device calls UnlockDevice(recoveryToken)
6. Device resets rollbackCount = 0
7. Device updates lastValidTime = current
8. Device is UNLOCKED
9. Normal operation resumes
```

### Scenario 5: Online Verification Reset
```
1. Device has rollbackCount = 3 (warning state)
2. Device connects to network
3. Online license verification succeeds
4. Device calls RecordValidTime(serverTime)
5. RollbackCount resets to 0
6. Last tampering flag cleared
7. Device returns to normal state
```

## Security Considerations

### 1. Secure Storage
- Uses Windows DPAPI (Data Protection API)
- Encryption key tied to current user account
- Prevents file tampering on disk
- Data protected even if storage folder accessed

### 2. Clock Skew Tolerance
- 60-second grace period prevents false positives
- Allows for NTP adjustments and system maintenance
- Still detects major rollbacks (hours/days)
- Grace period adjustable via constant

### 3. Threshold-Based Locking
- 5 attempts before lock (configurable)
- Prevents accidental locks from system issues
- Single rollback doesn't lock device
- Counter resets with online verification

### 4. Recovery Token Validation
- Device ID embedded in token (prevents device swapping)
- Timestamp included (prevents token reuse across time)
- Base64 encoded (prevents tampering)
- Server generates and validates

### 5. Offline Robustness
- Works completely offline for detection
- No network dependency for rollback check
- Graceful degradation if storage corrupted
- Starts fresh record if corruption detected

## Integration Points

### 1. Desktop Application Startup
```csharp
// In App initialization
var antiTamperingService = serviceProvider.GetRequiredService<IAntiTamperingService>();
var result = await antiTamperingService.ValidateSystemTimeAsync();
if (!result.IsValid && result.IsLocked)
{
    // Show recovery UI
    navigationService.Navigate(typeof(TamperingRecoveryPage));
}
```

### 2. License Validation
```csharp
// In validation workflow
var workflow = serviceProvider.GetRequiredService<TamperingAwareOfflineValidationWorkflow>();
var result = await workflow.ValidateAsync();
if (!result.IsValid && result.RequiresOnlineVerification)
{
    // Trigger online sync
    await networkSync.SyncLicenseAsync();
}
```

### 3. Online Sync Complete
```csharp
// After successful server communication
var recoveryWorkflow = serviceProvider.GetRequiredService<TamperingRecoveryWorkflow>();

// If device was locked:
if (serverResponse.HasRecoveryToken)
{
    await recoveryWorkflow.InitiateRecoveryAsync(serverResponse.RecoveryToken);
}

// Update valid time
await recoveryWorkflow.RecordSuccessfulVerificationAsync(serverResponse.ServerTime);
```

### 4. UI Display
```csharp
// ViewModel usage
var viewModel = new TamperingStatusViewModel(recoveryWorkflow);
await viewModel.RefreshStatusAsync();

if (viewModel.IsLocked)
{
    // Show lock message
    MessageBox.Show($"Recovery required: {viewModel.RecoveryAction}");
}
```

## Configuration

### Adjustable Constants
```csharp
private const int RollbackThreshold = 5;        // Lock after N detections
private const int GracePeriodSeconds = 60;      // Allow N seconds clock drift
private const string TamperingRecordFile = "tampering-record.json";
```

### Recommended Settings
- **RollbackThreshold:** 5 (prevents accidental locks, stops determined attacks)
- **GracePeriodSeconds:** 60 (handles NTP sync, timezone changes)
- **Storage:** Encrypted DPAPI in user's LocalApplicationData

## Logging & Monitoring

### Events to Log
1. Rollback detection → Log with timestamp and offset
2. Threshold exceeded → Log lock event with details
3. Device recovery → Log unlock event with recovery method
4. Online verification → Log sync timestamp update
5. Storage corruption → Log recovery action taken

### Audit Trail
```
2026-06-16T10:00:00Z: Tampering record created (startup)
2026-06-16T10:05:00Z: System time validation passed (+5s)
2026-06-16T10:15:00Z: Rollback detected: -600s offset, count=1
2026-06-16T10:20:00Z: Rollback detected: -300s offset, count=2
2026-06-16T10:45:00Z: Online sync: verified license, reset counter
2026-06-16T10:50:00Z: Tampering record cleared (full sync)
```

## API Reference

### IAntiTamperingService

#### ValidateSystemTimeAsync
```csharp
Task<TamperingValidationResult> ValidateSystemTimeAsync(
    DateTimeOffset? currentSystemTime = null,
    CancellationToken cancellationToken = default);
```
Validates system time against recorded history. Detects rollbacks.

#### RecordValidTimeAsync
```csharp
Task RecordValidTimeAsync(
    DateTimeOffset validatedTime,
    CancellationToken cancellationToken = default);
```
Records a validated time checkpoint. Resets rollback counter.

#### LockDeviceAsync
```csharp
Task LockDeviceAsync(
    string reason,
    string recoveryAction,
    CancellationToken cancellationToken = default);
```
Locks device due to tampering. Specifies unlock requirements.

#### UnlockDeviceAsync
```csharp
Task<bool> UnlockDeviceAsync(
    string recoveryToken,
    CancellationToken cancellationToken = default);
```
Unlocks device using recovery token. Resets counters.

#### IsDeviceLockedAsync
```csharp
Task<bool> IsDeviceLockedAsync(CancellationToken cancellationToken = default);
```
Checks current lock status.

## Testing

### Unit Test Cases
1. Normal time progression → Counter resets
2. Time rollback within grace period → No action
3. Time rollback > grace period → Counter increments
4. Threshold reached → Device locked
5. Valid license verification → Counter resets
6. Device recovery → Unlock succeeds
7. Storage corruption → Fresh record created

### Integration Test Cases
1. End-to-end: Rollback → Lock → Recovery → Unlock
2. Multiple rollbacks → Progressive locking
3. Online sync → Counter reset
4. Corrupted storage → Graceful recovery

## Future Enhancements

1. **Multiple rollback thresholds** - Different locks for different severity
2. **Rate limiting** - Throttle recovery attempts
3. **Biometric unlock** - Windows Hello integration
4. **Admin unlock** - Dealer/admin override capability
5. **Telemetry** - Report tampering attempts to server
6. **Hardware-backed time** - Use TPM time if available
7. **Time sync validation** - Detect NTP spoofing attempts

## Related Documentation

- See [offline-license-validation.md](offline-license-validation.md) for license validation context
- See [security-architecture.md](../security-architecture.md) for broader security model
- See [license-engine.md](license-engine.md) for license management
