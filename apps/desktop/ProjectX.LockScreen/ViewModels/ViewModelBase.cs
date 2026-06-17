using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace ProjectX.LockScreen.ViewModels;

/// <summary>
/// Base class for all ViewModels with INotifyPropertyChanged support.
/// </summary>
public abstract class ViewModelBase : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    protected void SetProperty<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value))
        {
            return;
        }

        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    protected void NotifyPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

/// <summary>
/// Async command for MVVM.
/// </summary>
public class AsyncRelayCommand : System.Windows.Input.ICommand
{
    private readonly Func<Task> _execute;
    private readonly Func<bool>? _canExecute;
    private bool _isExecuting;

    public event EventHandler? CanExecuteChanged
    {
        add { System.Windows.Input.CommandManager.RequerySuggested += value; }
        remove { System.Windows.Input.CommandManager.RequerySuggested -= value; }
    }

    public AsyncRelayCommand(Func<Task> execute, Func<bool>? canExecute = null)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    public bool CanExecute(object? parameter) => !_isExecuting && (_canExecute?.Invoke() ?? true);

    public async void Execute(object? parameter)
    {
        if (CanExecute(parameter))
        {
            try
            {
                _isExecuting = true;
                await _execute();
            }
            finally
            {
                _isExecuting = false;
                System.Windows.Input.CommandManager.InvalidateRequerySuggested();
            }
        }
    }
}

/// <summary>
/// Async command with parameter for MVVM.
/// </summary>
public class AsyncRelayCommand<T> : System.Windows.Input.ICommand
{
    private readonly Func<T?, Task> _execute;
    private readonly Func<T?, bool>? _canExecute;
    private bool _isExecuting;

    public event EventHandler? CanExecuteChanged
    {
        add { System.Windows.Input.CommandManager.RequerySuggested += value; }
        remove { System.Windows.Input.CommandManager.RequerySuggested -= value; }
    }

    public AsyncRelayCommand(Func<T?, Task> execute, Func<T?, bool>? canExecute = null)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    public bool CanExecute(object? parameter) =>
        !_isExecuting && (_canExecute?.Invoke((T?)parameter) ?? true);

    public async void Execute(object? parameter)
    {
        if (CanExecute(parameter))
        {
            try
            {
                _isExecuting = true;
                await _execute((T?)parameter);
            }
            finally
            {
                _isExecuting = false;
                System.Windows.Input.CommandManager.InvalidateRequerySuggested();
            }
        }
    }
}
