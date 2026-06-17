using System.Windows.Input;
using ProjectX.Desktop.Models;
using ProjectX.Desktop.Services.Licensing;

namespace ProjectX.Desktop.ViewModels;

public sealed class OfflineLicenseViewModel : ViewModelBase
{
    private readonly OfflineLicenseValidationWorkflow _workflow;
    private bool _unlockAllowed;
    private bool _isChecking;
    private string _statusMessage = "License has not been checked.";
    private DateTimeOffset? _expiresAt;

    public OfflineLicenseViewModel(OfflineLicenseValidationWorkflow workflow)
    {
        _workflow = workflow;
        ValidateCommand = new AsyncCommand(ValidateAsync);
    }

    public bool UnlockAllowed
    {
        get => _unlockAllowed;
        private set => SetProperty(ref _unlockAllowed, value);
    }

    public bool IsChecking
    {
        get => _isChecking;
        private set => SetProperty(ref _isChecking, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetProperty(ref _statusMessage, value);
    }

    public DateTimeOffset? ExpiresAt
    {
        get => _expiresAt;
        private set => SetProperty(ref _expiresAt, value);
    }

    public ICommand ValidateCommand { get; }

    public async Task ValidateAsync()
    {
        IsChecking = true;

        try
        {
            ApplyResult(await _workflow.ValidateAsync());
        }
        finally
        {
            IsChecking = false;
        }
    }

    private void ApplyResult(LicenseValidationResult result)
    {
        UnlockAllowed = result.IsValid;
        ExpiresAt = result.ExpiresAt;
        StatusMessage = result.IsValid ? "Offline license is valid." : result.Reason;
    }
}

public sealed class AsyncCommand : ICommand
{
    private readonly Func<Task> _execute;
    private bool _isExecuting;

    public AsyncCommand(Func<Task> execute)
    {
        _execute = execute;
    }

    public event EventHandler? CanExecuteChanged;

    public bool CanExecute(object? parameter) => !_isExecuting;

    public async void Execute(object? parameter)
    {
        if (_isExecuting)
        {
            return;
        }

        _isExecuting = true;
        CanExecuteChanged?.Invoke(this, EventArgs.Empty);

        try
        {
            await _execute();
        }
        finally
        {
            _isExecuting = false;
            CanExecuteChanged?.Invoke(this, EventArgs.Empty);
        }
    }
}

