using System;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Runtime.InteropServices;

namespace DesktopAppFresh
{
    public partial class LockWindow : Window
    {
        public static bool IsOpen { get; private set; }

        private readonly DesktopApiClient _apiClient = new DesktopApiClient();
        private readonly string? _deviceId;
        private readonly string? _contractId;
        private bool _allowClose = false; // Flag to control if window can actually close

        public LockWindow(string? deviceId = null, string? contractId = null)
        {
            InitializeComponent();
            IsOpen = true;
            _deviceId = deviceId;
            _contractId = contractId;
            RecoveryIdText.Text = string.IsNullOrWhiteSpace(_deviceId)
                ? "Recovery ID unavailable"
                : RecoveryVerifier.GetRecoveryId(_deviceId);
            PopulateRecoveryDetails();
            Loaded += LockWindow_Loaded;
            Closing += LockWindow_Closing;
            Closed += (_, _) =>
            {
                AppHealthMonitor.StopLockHeartbeat();
                IsOpen = false;
            };
        }

        private void PopulateRecoveryDetails()
        {
            var snapshot = AuthService.GetRegistrationSnapshot();
            var deviceName = !string.IsNullOrWhiteSpace(snapshot?.Model)
                ? snapshot.Model
                : Environment.MachineName;
            var operatingSystem = RuntimeInformation.OSDescription.Replace("Microsoft ", string.Empty, StringComparison.OrdinalIgnoreCase);
            var deviceId = string.IsNullOrWhiteSpace(_deviceId) ? "Unavailable" : _deviceId;
            var recoveryId = string.IsNullOrWhiteSpace(_deviceId)
                ? "Unavailable"
                : RecoveryVerifier.GetRecoveryId(_deviceId);

            RecoveryDeviceNameText.Text = deviceName;
            RecoveryOperatingSystemText.Text = operatingSystem;
            RecoveryDeviceIdText.Text = deviceId;
            RecoveryIdDetailText.Text = recoveryId;
        }

        private void LockWindow_Loaded(object sender, RoutedEventArgs e)
        {
            // Disable close button in title bar and keep the device lock as the active foreground window.
            var hwnd = new System.Windows.Interop.WindowInteropHelper(this).Handle;
            var style = GetWindowLong(hwnd, GWL_STYLE);
            SetWindowLong(hwnd, GWL_STYLE, style & ~(WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX));

            WindowState = WindowState.Maximized;
            Topmost = true;
            ShowActivated = true;
            Activate();
            Deactivated += (_, _) =>
            {
                if (!IsVisible)
                {
                    return;
                }

                Topmost = true;
                WindowState = WindowState.Maximized;
                Activate();
            };

            var paymentUrl = AuthService.GetRegistrationSnapshot()?.PaymentUrl;
            if (string.IsNullOrWhiteSpace(paymentUrl))
            {
                PaymentUrlText.Text = "Payment link unavailable. Contact the dealer for assistance.";
                return;
            }

            try
            {
                PaymentUrlText.Text = paymentUrl;
                PaymentQrImage.Source = PaymentQrCache.Load(_deviceId) ?? PaymentQrCache.CreateImage(paymentUrl);
            }
            catch (Exception ex)
            {
                PaymentUrlText.Text = "Unable to display the saved payment link.";
                SetInfoText($"QR display failed: {ex.Message}", Brushes.DarkRed);
            }
        }

        private void LockWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
        {
            // Prevent closing unless a valid recovery code or license was entered
            if (!_allowClose)
            {
                e.Cancel = true;
                MessageBox.Show(
                    "This device is locked. Enter a valid recovery authorization code or license key to proceed.",
                    "Device Locked",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);
            }
        }

        private void ShutdownBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "shutdown",
                    Arguments = "/s /t 0",
                    CreateNoWindow = true,
                    UseShellExecute = false
                };

                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Unable to power off this device: {ex.Message}", "Shutdown Failed", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void VerifyKeyBtn_Click(object sender, RoutedEventArgs e)
        {
            var timeValidation = AntiTamperingService.ValidateAndRecord();
            if (!timeValidation.IsValid)
            {
                new TimeCorrectionWindow(timeValidation.Message).ShowDialog();
                return;
            }

            var key = LicenseKeyBox.Text?.Trim();
            if (string.IsNullOrWhiteSpace(key) || key.Length < 8)
            {
                SetInfoText("Invalid key format. Please enter the full license key.", Brushes.DarkRed);
                return;
            }

            if (key.Contains('.', StringComparison.Ordinal))
            {
                VerifyRecoveryAuthorization(key);
                return;
            }

            if (string.IsNullOrWhiteSpace(_deviceId) || string.IsNullOrWhiteSpace(_contractId))
            {
                SetInfoText("Device registration context is missing. Restart the app to recover.", Brushes.DarkRed);
                return;
            }

            VerifyKeyBtn.IsEnabled = false;
            SetInfoText("Verifying license, please wait...", Brushes.SteelBlue);

            try
            {
                var localLicense = LicenseCache.FindLicense(_deviceId!, _contractId!, key);
                if (localLicense != null && localLicense.SignedPayload != null && !string.IsNullOrWhiteSpace(localLicense.Signature))
                {
                    var verification = LicenseVerifier.Verify(
                        localLicense.SignedPayload.Value,
                        localLicense.Signature,
                        _deviceId!,
                        _contractId!);
                    if (verification.Valid)
                    {
                        var licenseLabel = string.Equals(localLicense.LicenseType, "permanent", StringComparison.OrdinalIgnoreCase)
                            ? "Permanent ownership license"
                            : "Temporary payment license";
                        SetInfoText($"{licenseLabel} accepted offline. Unlocking now.", Brushes.ForestGreen);
                        MessageBox.Show("License validated locally. The device is unlocked.", "Access Restored", MessageBoxButton.OK, MessageBoxImage.Information);

                        _allowClose = true;
                        AppNavigator.Instance.ShowDashboard(_deviceId, _contractId);
                        Close();
                        return;
                    }

                    SetInfoText("The entered license is cached but invalid or expired.", Brushes.DarkRed);
                    return;
                }

                if (AuthService.HasAccessToken)
                {
                    var status = await _apiClient.GetDeviceLicenseStatusAsync(_deviceId!);
                    if (status.License != null && status.License.SignedPayload != null && !string.IsNullOrWhiteSpace(status.License.Signature) &&
                        string.Equals(status.License.LicenseKey?.Trim(), key, StringComparison.OrdinalIgnoreCase) && status.UnlockAllowed)
                    {
                        LicenseCache.SaveLicense(status.License);
                        var verification = LicenseVerifier.Verify(
                            status.License.SignedPayload.Value,
                            status.License.Signature,
                            _deviceId!,
                            _contractId!);
                        if (verification.Valid)
                        {
                            SetInfoText("License synchronized and accepted locally. Unlocking now.", Brushes.ForestGreen);
                            MessageBox.Show("License validated locally. The device is unlocked.", "Access Restored", MessageBoxButton.OK, MessageBoxImage.Information);

                            _allowClose = true;
                            AppNavigator.Instance.ShowDashboard(_deviceId, _contractId);
                            Close();
                            return;
                        }
                    }
                }

                SetInfoText("No cached license was found for this device. Connect online once to sync the issued license.", Brushes.DarkRed);
            }
            catch (Exception ex)
            {
                SetInfoText($"Verification failed: {ex.Message}", Brushes.DarkRed);
            }
            finally
            {
                VerifyKeyBtn.IsEnabled = true;
            }
        }

        private void VerifyRecoveryAuthorization(string authorization)
        {
            if (string.IsNullOrWhiteSpace(_deviceId))
            {
                SetInfoText("Device registration context is missing. Restart the app to recover.", Brushes.DarkRed);
                return;
            }

            var verification = RecoveryVerifier.Verify(authorization, _deviceId);
            if (!verification.Valid)
            {
                SetInfoText(verification.Message ?? "Recovery authorization is invalid or expired.", Brushes.DarkRed);
                return;
            }

            var now = DateTime.UtcNow;
            var active = RecoveryCache.FindActive(_deviceId, now);
            var decision = RecoveryPolicy.Decide(
                verification.Valid,
                RecoveryCache.HasAccepted(_deviceId, verification.AuthorizationId),
                active != null,
                RecoveryCache.GetSuccessfulCount(_deviceId));

            if (decision == RecoveryDecision.Rejected)
            {
                SetInfoText(verification.Message ?? "Recovery authorization is invalid or expired.", Brushes.DarkRed);
                return;
            }

            if (decision == RecoveryDecision.LimitHit)
            {
                SetInfoText("Limit hit. This device has already used its two recovery periods.", Brushes.DarkRed);
                return;
            }

            if (decision == RecoveryDecision.Reused)
            {
                SetInfoText("This recovery authorization has already been used.", Brushes.DarkRed);
                return;
            }

            if (decision == RecoveryDecision.ActiveAlready)
            {
                SetInfoText("Recovery authorization accepted offline. Unlocking now.", Brushes.ForestGreen);
                _allowClose = true;
                AppNavigator.Instance.ShowDashboard(_deviceId, _contractId);
                Close();
                return;
            }

            var acceptedAt = now;
            var activeUntil = acceptedAt.AddHours(36);
            if (!RecoveryCache.SaveAcceptance(_deviceId, new RecoveryAcceptance
            {
                AuthorizationId = verification.AuthorizationId,
                AcceptedAt = acceptedAt,
                ActiveUntil = activeUntil
            }))
            {
                SetInfoText("Recovery could not be saved securely on this device.", Brushes.DarkRed);
                return;
            }

            SetInfoText("Recovery accepted offline for 36 hours. Unlocking now.", Brushes.ForestGreen);
            _allowClose = true;
            AppNavigator.Instance.ShowDashboard(_deviceId, _contractId);
            Close();
        }

        private void LicenseKeyBox_GotFocus(object sender, RoutedEventArgs e)
        {
            if (LicenseKeyBox.Text == "XXXX-XXXX-XXXX-XXXX")
            {
                LicenseKeyBox.Text = string.Empty;
                LicenseKeyBox.Foreground = Brushes.Black;
            }
        }

        private void LicenseKeyBox_LostFocus(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(LicenseKeyBox.Text))
            {
                LicenseKeyBox.Text = "XXXX-XXXX-XXXX-XXXX";
                LicenseKeyBox.Foreground = Brushes.Gray;
            }
        }

        private void LicenseKeyBox_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == System.Windows.Input.Key.Enter)
            {
                VerifyKeyBtn_Click(sender, e);
            }
        }

        private void SetInfoText(string text, Brush brush)
        {
            InfoText.Text = text;
            InfoText.Foreground = brush;
        }

        private void RecoveryBtn_Click(object sender, RoutedEventArgs e)
        {
            RecoveryPanel.Visibility = Visibility.Visible;
            RecoveryBtn.Visibility = Visibility.Collapsed;
        }

        private void CloseRecoveryBtn_Click(object sender, RoutedEventArgs e)
        {
            RecoveryPanel.Visibility = Visibility.Collapsed;
            RecoveryBtn.Visibility = Visibility.Visible;
        }

        private void OpenPaymentQrBtn_Click(object sender, RoutedEventArgs e)
        {
            OpenPaymentUrl();
        }

        private void OpenPaymentUrlBtn_Click(object sender, RoutedEventArgs e)
        {
            OpenPaymentUrl();
        }

        private void OpenPaymentUrl()
        {
            try
            {
                var baseUrl = AuthService.GetRegistrationSnapshot()?.PaymentUrl;
                if (string.IsNullOrWhiteSpace(baseUrl))
                {
                    MessageBox.Show("Payment link is not available. Please contact support.", "Payment Link Unavailable", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                // Add temporary license type parameter to differentiate from permanent
                var paymentUrl = AppendQueryParam(baseUrl, "type", "temporary");

                // Open the payment URL in the default browser
                var psi = new ProcessStartInfo
                {
                    FileName = paymentUrl,
                    UseShellExecute = true
                };
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Unable to open payment link: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private string AppendQueryParam(string url, string paramName, string paramValue)
        {
            if (string.IsNullOrWhiteSpace(url)) return url;

            var separator = url.Contains("?") ? "&" : "?";
            return $"{url}{separator}{paramName}={Uri.EscapeDataString(paramValue)}";
        }

        // P/Invoke declarations to disable close button in window title bar
        private const int GWL_STYLE = -16;
        private const int WS_SYSMENU = 0x80000;
        private const int WS_MINIMIZEBOX = 0x20000;
        private const int WS_MAXIMIZEBOX = 0x10000;

        [DllImport("user32.dll", SetLastError = true)]
        private static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    }
}
