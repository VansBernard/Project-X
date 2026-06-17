using Xunit;
using ProjectX.Desktop.Models;
using ProjectX.Desktop.Services.Storage;
using ProjectX.Desktop.Services.Tampering;
using Moq;

namespace ProjectX.Desktop.Tests.Services.Tampering;

/// <summary>
/// Unit tests for AntiTamperingService.
/// </summary>
public class AntiTamperingServiceTests
{
    private readonly Mock<ILocalSecureStorage> _storageMock;
    private readonly AntiTamperingService _service;

    public AntiTamperingServiceTests()
    {
        _storageMock = new Mock<ILocalSecureStorage>();
        _service = new AntiTamperingService(_storageMock.Object);
    }

    [Fact]
    public async Task ValidateSystemTime_WithNormalTimeProgression_ResetsRollbackCounter()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var lastValid = now.AddSeconds(-60); // 60 seconds ago
        var record = new TamperingRecord(
            lastStartupTime: lastValid,
            lastValidTime: lastValid,
            rollbackCount: 3); // Existing rollbacks

        await SetupStorageWithRecord(record);

        // Act
        var result = await _service.ValidateSystemTimeAsync(now);

        // Assert
        Assert.True(result.IsValid);
        Assert.False(result.IsRollbackDetected);
        
        // Verify counter was reset
        var updatedRecord = await _service.GetTamperingRecordAsync();
        Assert.Equal(0, updatedRecord.RollbackCount);
    }

    [Fact]
    public async Task ValidateSystemTime_WithMinorClockSkew_AllowsWithinGracePeriod()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var lastValid = now.AddSeconds(30); // 30 seconds in future
        var record = new TamperingRecord(
            lastStartupTime: lastValid,
            lastValidTime: lastValid,
            rollbackCount: 0);

        await SetupStorageWithRecord(record);

        // Act - 30 seconds is within 60-second grace period
        var result = await _service.ValidateSystemTimeAsync(now);

        // Assert
        Assert.True(result.IsValid);
        Assert.False(result.IsRollbackDetected);
    }

    [Fact]
    public async Task ValidateSystemTime_WithClockRollback_DetectsAndIncrementsCounter()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var lastValid = now.AddSeconds(120); // Time in future (rollback scenario)
        var record = new TamperingRecord(
            lastStartupTime: lastValid,
            lastValidTime: lastValid,
            rollbackCount: 2);

        await SetupStorageWithRecord(record);

        // Act
        var result = await _service.ValidateSystemTimeAsync(now);

        // Assert
        Assert.False(result.IsValid);
        Assert.True(result.IsRollbackDetected);
        Assert.Equal(3, result.RollbackCount);
        Assert.False(result.IsLocked); // Not yet at threshold
    }

    [Fact]
    public async Task ValidateSystemTime_WithThresholdExceeded_LocksDevice()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var lastValid = now.AddSeconds(120);
        var record = new TamperingRecord(
            lastStartupTime: lastValid,
            lastValidTime: lastValid,
            rollbackCount: 5); // Already at threshold

        await SetupStorageWithRecord(record);

        // Act
        var result = await _service.ValidateSystemTimeAsync(now);

        // Assert
        Assert.False(result.IsValid);
        Assert.True(result.IsLocked);
        
        var lockedRecord = await _service.GetTamperingRecordAsync();
        Assert.True(lockedRecord.IsLocked);
        Assert.NotNull(lockedRecord.LockReason);
    }

    [Fact]
    public async Task RecordValidTime_ResetsRollbackCounter()
    {
        // Arrange
        var record = new TamperingRecord(
            lastStartupTime: DateTimeOffset.UtcNow,
            lastValidTime: DateTimeOffset.UtcNow.AddHours(-1),
            rollbackCount: 3);

        await SetupStorageWithRecord(record);

        var validTime = DateTimeOffset.UtcNow;

        // Act
        await _service.RecordValidTimeAsync(validTime);

        // Assert
        var updated = await _service.GetTamperingRecordAsync();
        Assert.Equal(0, updated.RollbackCount);
        Assert.Equal(validTime, updated.LastValidTime);
    }

    [Fact]
    public async Task LockDevice_SetsLockState()
    {
        // Arrange
        var record = new TamperingRecord();
        await SetupStorageWithRecord(record);

        // Act
        await _service.LockDeviceAsync(
            reason: "Test tampering",
            recoveryAction: "Verify license online");

        // Assert
        var locked = await _service.GetTamperingRecordAsync();
        Assert.True(locked.IsLocked);
        Assert.Equal("Test tampering", locked.LockReason);
        Assert.Equal("Verify license online", locked.RecoveryAction);
    }

    [Fact]
    public async Task UnlockDevice_ClearsLockState()
    {
        // Arrange
        var record = new TamperingRecord(
            lastStartupTime: DateTimeOffset.UtcNow,
            lastValidTime: DateTimeOffset.UtcNow,
            rollbackCount: 5,
            isLocked: true,
            lockReason: "Test lock",
            recoveryAction: "Verify license");

        await SetupStorageWithRecord(record);

        // Act
        var success = await _service.UnlockDeviceAsync("recovery-token");

        // Assert
        Assert.True(success);
        
        var unlocked = await _service.GetTamperingRecordAsync();
        Assert.False(unlocked.IsLocked);
        Assert.Null(unlocked.LockReason);
        Assert.Equal(0, unlocked.RollbackCount);
    }

    [Fact]
    public async Task IsDeviceLockedAsync_ReturnsTrueWhenLocked()
    {
        // Arrange
        var record = new TamperingRecord(
            lastStartupTime: DateTimeOffset.UtcNow,
            lastValidTime: DateTimeOffset.UtcNow,
            isLocked: true);

        await SetupStorageWithRecord(record);

        // Act
        var isLocked = await _service.IsDeviceLockedAsync();

        // Assert
        Assert.True(isLocked);
    }

    [Fact]
    public async Task ClearTamperingHistory_CreatesNewRecord()
    {
        // Arrange
        var oldRecord = new TamperingRecord(
            lastStartupTime: DateTimeOffset.UtcNow.AddHours(-1),
            lastValidTime: DateTimeOffset.UtcNow.AddHours(-1),
            rollbackCount: 5,
            isLocked: true);

        await SetupStorageWithRecord(oldRecord);

        // Act
        await _service.ClearTamperingHistoryAsync();

        // Assert
        var cleared = await _service.GetTamperingRecordAsync();
        Assert.Equal(0, cleared.RollbackCount);
        Assert.False(cleared.IsLocked);
    }

    [Fact]
    public async Task GetTamperingRecord_WithCorruptedStorage_CreatesNewRecord()
    {
        // Arrange - Simulate corrupted JSON
        _storageMock
            .Setup(s => s.LoadTextAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("{invalid json");

        // Act
        var record = await _service.GetTamperingRecordAsync();

        // Assert
        Assert.NotNull(record);
        Assert.Equal(0, record.RollbackCount);
        Assert.False(record.IsLocked);
    }

    private async Task SetupStorageWithRecord(TamperingRecord record)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(record);
        _storageMock
            .Setup(s => s.LoadTextAsync(
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(json);

        _storageMock
            .Setup(s => s.SaveTextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
    }
}

/// <summary>
/// Unit tests for TamperingRecoveryWorkflow.
/// </summary>
public class TamperingRecoveryWorkflowTests
{
    private readonly Mock<IAntiTamperingService> _antiTamperingServiceMock;
    private readonly Mock<IDeviceIdentityService> _deviceIdentityMock;
    private readonly TamperingRecoveryWorkflow _workflow;

    public TamperingRecoveryWorkflowTests()
    {
        _antiTamperingServiceMock = new Mock<IAntiTamperingService>();
        _deviceIdentityMock = new Mock<IDeviceIdentityService>();
        _workflow = new TamperingRecoveryWorkflow(
            _antiTamperingServiceMock.Object,
            _deviceIdentityMock.Object);
    }

    [Fact]
    public async Task GenerateRecoveryToken_CreatesValidToken()
    {
        // Arrange
        var deviceId = "device-123";
        var licenseId = "license-456";
        var validationTime = DateTimeOffset.UtcNow;

        _deviceIdentityMock
            .Setup(d => d.GetDeviceIdentityAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Models.DeviceIdentity(deviceId, "contract-789"));

        // Act
        var token = await _workflow.GenerateRecoveryTokenAsync(validationTime, licenseId);

        // Assert
        Assert.NotNull(token);
        Assert.NotEmpty(token);

        // Verify token can be decoded
        var decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(token));
        Assert.Contains(deviceId, decoded);
        Assert.Contains(licenseId, decoded);
    }

    [Fact]
    public async Task InitiateRecovery_WithValidToken_UnlocksDevice()
    {
        // Arrange
        var recoveryToken = GenerateValidToken("device-123", "license-456");

        _deviceIdentityMock
            .Setup(d => d.GetDeviceIdentityAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Models.DeviceIdentity("device-123", "contract-789"));

        _antiTamperingServiceMock
            .Setup(a => a.UnlockDeviceAsync(
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _workflow.InitiateRecoveryAsync(recoveryToken);

        // Assert
        Assert.True(result.Success);
        Assert.True(result.IsUnlocked);
    }

    [Fact]
    public async Task InitiateRecovery_WithInvalidToken_FailsRecovery()
    {
        // Arrange
        var invalidToken = "invalid-token-data";

        _deviceIdentityMock
            .Setup(d => d.GetDeviceIdentityAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Models.DeviceIdentity("device-123", "contract-789"));

        // Act
        var result = await _workflow.InitiateRecoveryAsync(invalidToken);

        // Assert
        Assert.False(result.Success);
        Assert.False(result.IsUnlocked);
    }

    [Fact]
    public async Task GetRecoveryStatus_WhenLocked_ReturnsLockDetails()
    {
        // Arrange
        var record = new TamperingRecord(
            lastStartupTime: DateTimeOffset.UtcNow,
            lastValidTime: DateTimeOffset.UtcNow,
            rollbackCount: 5,
            isLocked: true,
            lockReason: "Excessive rollback",
            recoveryAction: "Verify license");

        _antiTamperingServiceMock
            .Setup(a => a.GetTamperingRecordAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(record);

        _antiTamperingServiceMock
            .Setup(a => a.GetLockStatusAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((true, "Excessive rollback", "Verify license"));

        // Act
        var status = await _workflow.GetRecoveryStatusAsync();

        // Assert
        Assert.True(status.IsLocked);
        Assert.NotNull(status.RequiredAction);
    }

    [Fact]
    public async Task VerifyRecoveryComplete_WhenUnlocked_ReturnsTrue()
    {
        // Arrange
        _antiTamperingServiceMock
            .Setup(a => a.IsDeviceLockedAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var complete = await _workflow.VerifyRecoveryCompleteAsync();

        // Assert
        Assert.True(complete);
    }

    private static string GenerateValidToken(string deviceId, string licenseId)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var tokenData = $"{deviceId}|{licenseId}|{timestamp}";
        var tokenBytes = System.Text.Encoding.UTF8.GetBytes(tokenData);
        return Convert.ToBase64String(tokenBytes);
    }
}
