using System.ComponentModel;
using ProjectX.Desktop.Services.Tampering;

namespace ProjectX.Desktop.ViewModels;

/// <summary>
/// ViewModel for displaying and handling device tampering detection UI.
/// </summary>
public sealed class TamperingStatusViewModel : ViewModelBase
{
    private readonly TamperingRecoveryWorkflow _recoveryWorkflow;
    private bool _isLocked;
    private string? _lockReason;
    private string? _recoveryAction;
    private int _rollbackCount;
    private DateTimeOffset? _lastTamperingDetected;
    private bool _isRecovering;
    private string? _statusMessage;

    public TamperingStatusViewModel(TamperingRecoveryWorkflow recoveryWorkflow)
    {
        _recoveryWorkflow = recoveryWorkflow;
    }

    /// <summary>
    /// Whether device is currently locked due to tampering.
    /// </summary>
    public bool IsLocked
    {
        get => _isLocked;
        set => SetProperty(ref _isLocked, value);
    }

    /// <summary>
    /// Reason for device lock.
    /// </summary>
    public string? LockReason
    {
        get => _lockReason;
        set => SetProperty(ref _lockReason, value);
    }

    /// <summary>
    /// Required action to unlock device.
    /// </summary>
    public string? RecoveryAction
    {
        get => _recoveryAction;
        set => SetProperty(ref _recoveryAction, value);
    }

    /// <summary>
    /// Number of consecutive rollback detections.
    /// </summary>
    public int RollbackCount
    {
        get => _rollbackCount;
        set => SetProperty(ref _rollbackCount, value);
    }

    /// <summary>
    /// When tampering was last detected.
    /// </summary>
    public DateTimeOffset? LastTamperingDetected
    {
        get => _lastTamperingDetected;
        set => SetProperty(ref _lastTamperingDetected, value);
    }

    /// <summary>
    /// Whether recovery is in progress.
    /// </summary>
    public bool IsRecovering
    {
        get => _isRecovering;
        set => SetProperty(ref _isRecovering, value);
    }

    /// <summary>
    /// Current status message.
    /// </summary>
    public string? StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    /// <summary>
    /// Refreshes tampering status from service.
    /// </summary>
    public async Task RefreshStatusAsync()
    {
        var status = await _recoveryWorkflow.GetRecoveryStatusAsync();

        IsLocked = status.IsLocked;
        LockReason = status.Message;
        RecoveryAction = status.RequiredAction;
        RollbackCount = status.RollbackCount;
        LastTamperingDetected = status.LastTamperingDetected;
        StatusMessage = status.IsLocked
            ? $"Device locked: {status.Message}"
            : "Device operating normally";
    }

    /// <summary>
    /// Attempts to recover device using provided token.
    /// </summary>
    public async Task<bool> AttemptRecoveryAsync(string recoveryToken)
    {
        try
        {
            IsRecovering = true;
            StatusMessage = "Processing recovery token...";

            var result = await _recoveryWorkflow.InitiateRecoveryAsync(recoveryToken);

            if (result.Success)
            {
                StatusMessage = result.Message;
                await RefreshStatusAsync();
                return true;
            }
            else
            {
                StatusMessage = $"Recovery failed: {result.Message}";
                return false;
            }
        }
        finally
        {
            IsRecovering = false;
        }
    }

    /// <summary>
    /// Checks if device recovery is complete.
    /// </summary>
    public async Task<bool> CheckRecoveryCompleteAsync()
    {
        return await _recoveryWorkflow.VerifyRecoveryCompleteAsync();
    }
}
