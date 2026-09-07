using System;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;

namespace DesktopAppFresh
{
    public partial class TimeCorrectionWindow : Window
    {
        public static bool IsOpen { get; private set; }

        private readonly Action? _onValidationSucceeded;
        private readonly DispatcherTimer _retryTimer;
        private bool _isChecking;
        private bool _hasSucceeded;

        public TimeCorrectionWindow(string message, Action? onValidationSucceeded = null)
        {
            InitializeComponent();
            IsOpen = true;
            _onValidationSucceeded = onValidationSucceeded;
            MessageText.Text = message;
            Topmost = true;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            ShowInTaskbar = false;
            ResizeMode = ResizeMode.NoResize;
            WindowStyle = WindowStyle.None;
            _retryTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(3) };
            _retryTimer.Tick += RetryTimer_Tick;
            _retryTimer.Start();
            Closed += (_, _) =>
            {
                _retryTimer.Stop();
                IsOpen = false;
            };
        }

        private async void TryAgainButton_Click(object sender, RoutedEventArgs e)
        {
            await CheckClockAsync(showCheckingMessage: true);
        }

        private async void RetryTimer_Tick(object? sender, EventArgs e)
        {
            await CheckClockAsync(showCheckingMessage: false);
        }

        private async Task CheckClockAsync(bool showCheckingMessage)
        {
            if (_isChecking || _hasSucceeded) return;

            _isChecking = true;
            if (showCheckingMessage)
            {
                TryAgainButton.IsEnabled = false;
                TryAgainButton.Content = "Checking clock...";
                MessageText.Text = "Checking the Windows date, time, and time zone...";
            }

            try
            {
                var validation = await Task.Run(AntiTamperingService.ValidateAndRecord);
                if (validation.IsValid)
                {
                    _hasSucceeded = true;
                    _retryTimer.Stop();
                    _onValidationSucceeded?.Invoke();
                    Close();
                    return;
                }

                MessageText.Text = validation.Message;
            }
            finally
            {
                _isChecking = false;
                if (!_hasSucceeded)
                {
                    TryAgainButton.IsEnabled = true;
                    TryAgainButton.Content = "Try again";
                }
            }
        }

        private void OpenDateTimeSettingsButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo("ms-settings:dateandtime") { UseShellExecute = true });
            }
            catch
            {
                MessageBox.Show("Open Windows Settings manually and correct the date, time, and time zone before restarting Project X.", "Settings unavailable", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }
    }
}
