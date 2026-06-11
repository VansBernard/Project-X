using System;
using System.Windows;
using System.Windows.Threading;
using TokenVerifier;

namespace LockScreenApp;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        DispatcherUnhandledException += App_DispatcherUnhandledException;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (!DeadlineStore.IsLocked(today))
        {
            Shutdown(0);
            return;
        }

        var window = new MainWindow();
        MainWindow = window;
        window.Show();
    }

    private void App_DispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        ClientLogger.LogError("Unhandled UI exception", e.Exception);
        e.Handled = true;
    }
}
