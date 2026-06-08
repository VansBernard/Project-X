using System.Windows;
using TokenVerifier;

namespace LockScreenApp;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

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
}
