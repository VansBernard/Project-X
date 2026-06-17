using Microsoft.Extensions.DependencyInjection;
using ProjectX.LockScreen.Infrastructure;
using ProjectX.LockScreen.Views;

namespace ProjectX.LockScreen;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : System.Windows.Application
{
    private ServiceProvider? _serviceProvider;

    protected override void OnStartup(System.Windows.StartupEventArgs e)
    {
        base.OnStartup(e);

        // Build dependency injection container
        var services = new ServiceCollection();
        services.AddLockScreenServices();
        _serviceProvider = services.BuildServiceProvider();

        // Show main window
        MainWindow = new LockScreenWindow();
        MainWindow.DataContext = _serviceProvider.GetRequiredService<ViewModels.LockScreenViewModel>();
        MainWindow.Show();
    }

    protected override void OnExit(System.Windows.ExitEventArgs e)
    {
        _serviceProvider?.Dispose();
        base.OnExit(e);
    }
}
