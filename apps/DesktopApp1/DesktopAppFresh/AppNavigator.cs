using System;
using System.Linq;
using System.Windows;

namespace DesktopAppFresh
{
    public sealed class AppNavigator
    {
        private static readonly Lazy<AppNavigator> LazyInstance = new(() => new AppNavigator());

        private Window? _loginWindow;
        private Window? _startupWindow;
        private Window? _registrationWindow;
        private Window? _dashboardWindow;
        private Window? _lockWindow;

        public static AppNavigator Instance => LazyInstance.Value;

        public void ShowTimeCorrection(string message, Action? onValidationSucceeded = null)
        {
            if (TimeCorrectionWindow.IsOpen || LockWindow.IsOpen)
            {
                return;
            }

            var activeWindow = Application.Current?.Windows
                .OfType<Window>()
                .FirstOrDefault(window => window.IsVisible);

            var timeWindow = new TimeCorrectionWindow(message, onValidationSucceeded);
            if (activeWindow != null)
            {
                timeWindow.Owner = activeWindow;
            }

            timeWindow.Topmost = true;
            timeWindow.ShowDialog();
        }

        public void ShowStartup()
        {
            if (TimeCorrectionWindow.IsOpen || LockWindow.IsOpen || IsVisible(_startupWindow))
            {
                return;
            }

            CloseWindow(_startupWindow);
            CloseWindow(_loginWindow);
            CloseWindow(_registrationWindow);
            CloseWindow(_dashboardWindow);
            CloseWindow(_lockWindow);

            _startupWindow = new StartupWindow();
            _startupWindow.Show();
        }

        public void ShowLogin()
        {
            if (TimeCorrectionWindow.IsOpen || LockWindow.IsOpen || IsVisible(_loginWindow))
            {
                return;
            }

            var validation = AntiTamperingService.ValidateAndRecord();
            if (!validation.IsValid)
            {
                ShowTimeCorrection(validation.Message);
                return;
            }

            CloseWindow(_loginWindow);
            CloseWindow(_registrationWindow);
            CloseWindow(_dashboardWindow);
            CloseWindow(_lockWindow);

            var previousStartupWindow = _startupWindow;
            _loginWindow = new LoginWindow();
            _loginWindow.Show();
            CloseWindow(previousStartupWindow);
            _startupWindow = null;
        }

        public void ShowRegistration(string? dealerEmail = null, string? dealerName = null)
        {
            if (TimeCorrectionWindow.IsOpen || LockWindow.IsOpen || IsVisible(_registrationWindow))
            {
                return;
            }

            var validation = AntiTamperingService.ValidateAndRecord();
            if (!validation.IsValid)
            {
                ShowTimeCorrection(validation.Message);
                return;
            }

            CloseWindow(_registrationWindow);
            CloseWindow(_dashboardWindow);
            CloseWindow(_lockWindow);

            _registrationWindow = new RegistrationWindow(dealerEmail, dealerName);
            _registrationWindow.Show();
        }

        public void ShowDashboard(string? deviceId = null, string? contractId = null)
        {
            if (TimeCorrectionWindow.IsOpen || LockWindow.IsOpen || IsVisible(_dashboardWindow))
            {
                return;
            }

            var validation = AntiTamperingService.ValidateAndRecord();
            if (!validation.IsValid)
            {
                ShowTimeCorrection(validation.Message);
                return;
            }

            CloseWindow(_dashboardWindow);
            CloseWindow(_lockWindow);

            _dashboardWindow = new DashboardWindow(deviceId, contractId);
            _dashboardWindow.Show();
        }

        public void ShowLock(string? deviceId = null, string? contractId = null)
        {
            if (TimeCorrectionWindow.IsOpen || IsVisible(_lockWindow))
            {
                return;
            }

            if (PermanentReleaseCache.IsReleased(deviceId, contractId))
            {
                ShowDashboard(deviceId, contractId);
                return;
            }

            CloseWindow(_lockWindow);

            _lockWindow = new LockWindow(deviceId, contractId)
            {
                Topmost = true,
                WindowStartupLocation = WindowStartupLocation.CenterScreen,
                ShowInTaskbar = false
            };
            _lockWindow.Show();
            _lockWindow.Activate();
            AppHealthMonitor.StartLockHeartbeat(deviceId, contractId);
            AppWatchdog.StartLockWatchdog(deviceId, contractId);
        }

        private static bool IsVisible(Window? window)
        {
            return window != null && window.IsVisible;
        }

        private static void CloseWindow(Window? window)
        {
            if (window != null && window.IsVisible)
            {
                try
                {
                    window.Close();
                }
                catch
                {
                    // Ignore close failures while switching screens.
                }
            }
        }
    }
}
