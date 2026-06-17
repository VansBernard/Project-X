using System.Windows.Input;
using ProjectX.LockScreen.Models;

namespace ProjectX.LockScreen.ViewModels;

/// <summary>
/// ViewModel for the main lock screen.
/// Displays when device is locked and waiting for license verification.
/// </summary>
public sealed class LockScreenViewModel : ViewModelBase
{
    private string _deviceId;
    private string _status;
    private bool _isDeviceTampered;
    private string? _tamperingMessage;
    private ICommand? _unlockCommand;
    private ICommand? _entryLicenseCommand;
    private ICommand? _showStatusCommand;

    public string DeviceId
    {
        get => _deviceId;
        set => SetProperty(ref _deviceId, value);
    }

    public string Status
    {
        get => _status;
        set => SetProperty(ref _status, value);
    }

    public bool IsDeviceTampered
    {
        get => _isDeviceTampered;
        set => SetProperty(ref _isDeviceTampered, value);
    }

    public string? TamperingMessage
    {
        get => _tamperingMessage;
        set => SetProperty(ref _tamperingMessage, value);
    }

    public ICommand? UnlockCommand
    {
        get => _unlockCommand;
        set => SetProperty(ref _unlockCommand, value);
    }

    public ICommand? EntryLicenseCommand
    {
        get => _entryLicenseCommand;
        set => SetProperty(ref _entryLicenseCommand, value);
    }

    public ICommand? ShowStatusCommand
    {
        get => _showStatusCommand;
        set => SetProperty(ref _showStatusCommand, value);
    }

    public LockScreenViewModel()
    {
        _deviceId = "Device ID: [Loading...]";
        _status = "Device Locked - License Required";
        _isDeviceTampered = false;
    }

    public void Initialize(LockScreenSession session)
    {
        IsDeviceTampered = session.IsTampered;
        
        if (session.IsTampered)
        {
            TamperingMessage = "⚠️ Device tampering detected. Contact support to unlock.";
            Status = "Device Locked - Tampering Detected";
        }
        else if (!session.IsLicenseValid)
        {
            Status = "Device Locked - License Required";
        }
    }
}

/// <summary>
/// ViewModel for license entry/input screen.
/// Allows users to enter license information or recovery tokens.
/// </summary>
public sealed class LicenseEntryViewModel : ViewModelBase
{
    private string _licenseInput;
    private bool _isValidating;
    private string? _validationMessage;
    private bool _isValidationSuccess;
    private ICommand? _submitCommand;
    private ICommand? _cancelCommand;

    public string LicenseInput
    {
        get => _licenseInput;
        set => SetProperty(ref _licenseInput, value);
    }

    public bool IsValidating
    {
        get => _isValidating;
        set => SetProperty(ref _isValidating, value);
    }

    public string? ValidationMessage
    {
        get => _validationMessage;
        set => SetProperty(ref _validationMessage, value);
    }

    public bool IsValidationSuccess
    {
        get => _isValidationSuccess;
        set => SetProperty(ref _isValidationSuccess, value);
    }

    public ICommand? SubmitCommand
    {
        get => _submitCommand;
        set => SetProperty(ref _submitCommand, value);
    }

    public ICommand? CancelCommand
    {
        get => _cancelCommand;
        set => SetProperty(ref _cancelCommand, value);
    }

    public LicenseEntryViewModel()
    {
        _licenseInput = string.Empty;
    }

    public void SetSubmitCommand(Func<string, Task> submitHandler)
    {
        SubmitCommand = new AsyncRelayCommand<string>(
            async param =>
            {
                if (string.IsNullOrWhiteSpace(param))
                {
                    ValidationMessage = "Please enter a license";
                    IsValidationSuccess = false;
                    return;
                }

                IsValidating = true;
                try
                {
                    await submitHandler(param);
                }
                finally
                {
                    IsValidating = false;
                }
            });
    }
}

/// <summary>
/// ViewModel for activation/recovery screen.
/// Handles device recovery and activation flows.
/// </summary>
public sealed class ActivationViewModel : ViewModelBase
{
    private string _recoveryToken;
    private bool _isRecovering;
    private string? _recoveryStatus;
    private bool _recoverySuccess;
    private DeviceLockInfo? _lockInfo;
    private ICommand? _attemptRecoveryCommand;
    private ICommand? _contactSupportCommand;
    private ICommand? _backCommand;

    public string RecoveryToken
    {
        get => _recoveryToken;
        set => SetProperty(ref _recoveryToken, value);
    }

    public bool IsRecovering
    {
        get => _isRecovering;
        set => SetProperty(ref _isRecovering, value);
    }

    public string? RecoveryStatus
    {
        get => _recoveryStatus;
        set => SetProperty(ref _recoveryStatus, value);
    }

    public bool RecoverySuccess
    {
        get => _recoverySuccess;
        set => SetProperty(ref _recoverySuccess, value);
    }

    public DeviceLockInfo? LockInfo
    {
        get => _lockInfo;
        set => SetProperty(ref _lockInfo, value);
    }

    public ICommand? AttemptRecoveryCommand
    {
        get => _attemptRecoveryCommand;
        set => SetProperty(ref _attemptRecoveryCommand, value);
    }

    public ICommand? ContactSupportCommand
    {
        get => _contactSupportCommand;
        set => SetProperty(ref _contactSupportCommand, value);
    }

    public ICommand? BackCommand
    {
        get => _backCommand;
        set => SetProperty(ref _backCommand, value);
    }

    public ActivationViewModel()
    {
        _recoveryToken = string.Empty;
        RecoveryStatus = "Connect to network to recover device";
    }

    public void SetLockInfo(DeviceLockInfo lockInfo)
    {
        LockInfo = lockInfo;
        RecoveryStatus = lockInfo.RecoveryAction ?? "Device recovery required";
    }
}

/// <summary>
/// ViewModel for device status screen.
/// Displays license and device information.
/// </summary>
public sealed class StatusViewModel : ViewModelBase
{
    private LicenseInfo? _licenseInfo;
    private DeviceLockInfo? _deviceLockInfo;
    private string _deviceId;
    private string? _expirationWarning;
    private bool _showExpirationWarning;
    private string? _lockWarning;
    private bool _showLockWarning;
    private ICommand? _syncCommand;
    private ICommand? _closeCommand;
    private bool _isSyncing;

    public LicenseInfo? LicenseInfo
    {
        get => _licenseInfo;
        set
        {
            SetProperty(ref _licenseInfo, value);
            UpdateExpirationWarning();
        }
    }

    public DeviceLockInfo? DeviceLockInfo
    {
        get => _deviceLockInfo;
        set
        {
            SetProperty(ref _deviceLockInfo, value);
            UpdateLockWarning();
        }
    }

    public string DeviceId
    {
        get => _deviceId;
        set => SetProperty(ref _deviceId, value);
    }

    public string? ExpirationWarning
    {
        get => _expirationWarning;
        set => SetProperty(ref _expirationWarning, value);
    }

    public bool ShowExpirationWarning
    {
        get => _showExpirationWarning;
        set => SetProperty(ref _showExpirationWarning, value);
    }

    public string? LockWarning
    {
        get => _lockWarning;
        set => SetProperty(ref _lockWarning, value);
    }

    public bool ShowLockWarning
    {
        get => _showLockWarning;
        set => SetProperty(ref _showLockWarning, value);
    }

    public ICommand? SyncCommand
    {
        get => _syncCommand;
        set => SetProperty(ref _syncCommand, value);
    }

    public ICommand? CloseCommand
    {
        get => _closeCommand;
        set => SetProperty(ref _closeCommand, value);
    }

    public bool IsSyncing
    {
        get => _isSyncing;
        set => SetProperty(ref _isSyncing, value);
    }

    public StatusViewModel()
    {
        _deviceId = "Device ID: [Loading...]";
    }

    private void UpdateExpirationWarning()
    {
        if (_licenseInfo is null)
        {
            ShowExpirationWarning = false;
            return;
        }

        switch (_licenseInfo.Status)
        {
            case LicenseStatus.ExpiringSoon:
                ExpirationWarning = $"⚠️ License expires in {_licenseInfo.DaysRemaining} days";
                ShowExpirationWarning = true;
                break;

            case LicenseStatus.Expired:
                ExpirationWarning = "❌ License has expired. Please renew.";
                ShowExpirationWarning = true;
                break;

            default:
                ShowExpirationWarning = false;
                break;
        }
    }

    private void UpdateLockWarning()
    {
        if (_deviceLockInfo is null || !_deviceLockInfo.IsLocked)
        {
            ShowLockWarning = false;
            return;
        }

        if (_deviceLockInfo.TamperingDetected)
        {
            LockWarning = "⚠️ Tampering detected. Device is locked.";
        }
        else
        {
            LockWarning = $"⚠️ Device locked: {_deviceLockInfo.Reason}";
        }

        ShowLockWarning = true;
    }

    public void SetSyncCommand(Func<Task> syncHandler)
    {
        SyncCommand = new AsyncRelayCommand(async () =>
        {
            IsSyncing = true;
            try
            {
                await syncHandler();
            }
            finally
            {
                IsSyncing = false;
            }
        });
    }
}
