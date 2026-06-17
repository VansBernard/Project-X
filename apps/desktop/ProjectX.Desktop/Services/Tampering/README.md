# Anti-Tampering System Services

## Overview

The Anti-Tampering System is a comprehensive security layer that detects and responds to clock rollback attacks in the offline license validation system.

## Folder Structure

```
Services/
├── Tampering/
│   ├── README.md (this file)
│   ├── IAntiTamperingService.cs
│   │   └── Main interface for tampering detection
│   ├── AntiTamperingService.cs
│   │   └── Concrete implementation with rollback detection
│   ├── TamperingAwareVerificationService.cs
│   │   └── License validation integration
│   ├── TamperingAwareOfflineValidationWorkflow.cs
│   │   └── Full offline validation with tampering checks
│   └── TamperingRecoveryWorkflow.cs
│       └── Device recovery process handling
```

## Service Components

### 1. IAntiTamperingService
**Purpose:** Define the contract for tampering detection and response.

**Key Methods:**
- `ValidateSystemTimeAsync()` - Detect clock rollback
- `RecordValidTimeAsync()` - Record validated time checkpoint
- `LockDeviceAsync()` - Lock device on tampering
- `UnlockDeviceAsync()` - Unlock using recovery token
- `IsDeviceLockedAsync()` - Check lock status

**Usage:** Inject this interface into components needing tampering checks.

### 2. AntiTamperingService
**Purpose:** Implement tampering detection with secure storage.

**Algorithm:**
1. Load secure tampering record (LastValidTime, RollbackCount)
2. Compare current system time with recorded time
3. If time moved backwards > 60s: flag rollback
4. After 5 rollbacks: lock device
5. Reset counter on valid time progression

**Storage:** Encrypted in `%LocalAppData%/ProjectX/SecureStore/tampering-record.json`

**Key Features:**
- DPAPI encryption for data protection
- Grace period for minor clock adjustments
- Configurable thresholds
- Rollback counting
- Lock status management

### 3. TamperingAwareVerificationService
**Purpose:** Integrate tampering checks with license signature verification.

**Workflow:**
1. Check if device locked (fail immediately)
2. Validate license signature (RSA-SHA256)
3. Check license validity dates
4. Verify system time (no rollback)
5. Update valid time on success

**Result:** Combined license + tampering validation result

**Integration Point:** Replaces `LicenseVerificationService` in validation workflows

### 4. TamperingAwareOfflineValidationWorkflow
**Purpose:** Complete offline license validation with all checks.

**Steps:**
1. Check device lock status
2. Load cached license
3. Get device identity
4. Run combined license + tampering validation
5. Return detailed result with recovery instructions

**Result:** `OfflineValidationWithTamperingResult` with:
- Overall validity
- Tampering detection details
- Recovery requirements
- License expiration info

### 5. TamperingRecoveryWorkflow
**Purpose:** Handle device recovery after lock.

**Key Methods:**
- `GenerateRecoveryTokenAsync()` - Generate token for server
- `InitiateRecoveryAsync()` - Unlock device with token
- `GetRecoveryStatusAsync()` - Check current lock state
- `VerifyRecoveryCompleteAsync()` - Confirm unlock success
- `RecordSuccessfulVerificationAsync()` - Update valid time
- `ClearTamperingHistoryAsync()` - Reset after full sync

**Recovery Process:**
1. Locked device connects to network
2. Server verifies license
3. Server returns recovery token
4. Device unlocks using token
5. Counter resets
6. Normal operation resumes

## Models

### TamperingRecord
```csharp
public record TamperingRecord
{
    DateTimeOffset LastStartupTime;
    DateTimeOffset LastValidTime;
    int RollbackCount;
    DateTimeOffset? LastTamperingDetectedAt;
    bool IsLocked;
    string? LockReason;
    string? RecoveryAction;
}
```

Stored securely in encrypted JSON file.

### TamperingValidationResult
```csharp
public record TamperingValidationResult
{
    bool IsValid;                      // Overall validation success
    bool IsRollbackDetected;           // Clock rollback found
    int RollbackCount;                 // Number of detections
    bool IsLocked;                     // Device locked
    string Message;                    // Result message
    string? RequiredAction;            // User action needed
    long TimeOffsetSeconds;            // Time difference from recorded
}
```

### LicenseValidationWithTamperingCheckResult
```csharp
public record LicenseValidationWithTamperingCheckResult
{
    bool LicenseValid;                 // License signature & dates valid
    bool TamperingCheckPassed;         // System time valid
    TamperingValidationResult TamperingResult;
    bool CombinedValid;                // Both checks passed
    string Message;
    bool RequiresOnlineVerification;   // Must sync with server
}
```

### OfflineValidationWithTamperingResult
```csharp
public record OfflineValidationWithTamperingResult
{
    bool IsValid;                      // Overall validation
    string Message;
    bool RequiresOnlineVerification;
    bool TamperingDetected;
    TamperingValidationResult? TamperingDetails;
    bool RecoveryRequired;
    string? RecoveryAction;
}
```

## Integration Points

### 1. Application Startup
```csharp
// Check tampering on app start
var result = await antiTamperingService.ValidateSystemTimeAsync();
if (result.IsLocked)
{
    // Show recovery UI
}
```

### 2. License Validation
```csharp
// Use tampering-aware workflow
var result = await tamperingAwareWorkflow.ValidateAsync();
if (!result.IsValid && result.TamperingDetected)
{
    // Handle tampering
}
```

### 3. Online Sync
```csharp
// After server verification
await antiTamperingService.RecordValidTimeAsync(serverTime);

// If recovery token available
await recoveryWorkflow.InitiateRecoveryAsync(token);
```

### 4. UI Display
```csharp
// Use ViewModel for UI updates
var viewModel = new TamperingStatusViewModel(recoveryWorkflow);
await viewModel.RefreshStatusAsync();
```

## Configuration

### Thresholds (AntiTamperingService.cs)

```csharp
private const int RollbackThreshold = 5;        // Lock after N rollbacks
private const int GracePeriodSeconds = 60;      // Allow N seconds drift
```

**Recommendations:**
- RollbackThreshold: 5 (prevents accidental lock, stops attacks)
- GracePeriodSeconds: 60 (handles NTP sync, timezone changes)

## Security Features

✅ **Secure Storage**
- DPAPI encryption for tampering record
- File protection even if folder accessed
- User-account-scoped encryption key

✅ **Intelligent Detection**
- 60-second grace period for system adjustments
- Threshold-based locking (prevents false positives)
- Rollback counting with reset

✅ **Device Recovery**
- Recovery token validation (device ID + timestamp)
- Online verification required to unlock
- Counter reset on successful verification

✅ **Offline Robustness**
- Works completely offline
- No network dependency for detection
- Graceful handling of corrupted storage

## Testing

### Unit Tests Location
```
ProjectX.Desktop.Tests/
└── Services/
    └── Tampering/
        ├── AntiTamperingServiceTests.cs
        ├── TamperingRecoveryWorkflowTests.cs
        └── TamperingAwareVerificationTests.cs
```

### Test Scenarios
1. Normal time progression → Counter resets
2. Rollback within grace → No action
3. Rollback exceeds grace → Counter increments
4. Threshold exceeded → Device locks
5. Valid verification → Counter resets
6. Recovery token → Unlock succeeds
7. Corrupted storage → Fresh record created

## Performance

- **Validation:** < 1ms per check
- **Storage I/O:** Minimal (one encrypted file)
- **Recovery Token:** Fast base64 operations
- **Offline Operation:** No network delay

## Related Documentation

- [anti-tampering-system.md](anti-tampering-system.md) - Comprehensive design documentation
- [anti-tampering-integration.md](anti-tampering-integration.md) - Integration guide
- [offline-license-validation.md](offline-license-validation.md) - License validation context
- [security-architecture.md](../architecture/security-architecture.md) - Security model

## Dependencies

- `ILocalSecureStorage` - For encrypted storage
- `IDeviceIdentityService` - For device identification
- `LicenseVerificationService` - For license signature verification
- `System.Security.Cryptography` - For DPAPI
- `System.Text.Json` - For serialization

## Future Enhancements

- [ ] Multiple lock severity levels
- [ ] Rate limiting on recovery attempts
- [ ] Windows Hello (biometric) unlock
- [ ] TPM-backed time validation
- [ ] Server-side tampering telemetry
- [ ] Hardware time sync validation
