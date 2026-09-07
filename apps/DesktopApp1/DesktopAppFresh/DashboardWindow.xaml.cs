using System;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using System.Windows.Navigation;
using System.Windows.Threading;

namespace DesktopAppFresh
{
    public partial class DashboardWindow : Window
    {
        private readonly DesktopApiClient _apiClient = new DesktopApiClient();
        private readonly string? _deviceId;
        private readonly string? _contractId;
        private readonly DispatcherTimer _timer;
        private readonly DispatcherTimer _cancellationTimer;
        private readonly DispatcherTimer _connectivityTimer;
        private static readonly HttpClient ConnectivityClient = new()
        {
            Timeout = TimeSpan.FromSeconds(4)
        };
        private long _totalSeconds;
        private bool _lockWindowShown;
        private bool _cancellationRequestInProgress;
        private bool _connectivityCheckInProgress;
        private Stopwatch? _countdownStopwatch;
        private long _initialCountdownSeconds;

        public DashboardWindow(string? deviceId = null, string? contractId = null)
        {
            InitializeComponent();
            _deviceId = deviceId ?? AuthService.DeviceId;
            _contractId = contractId ?? AuthService.ContractId;

            GreetingText.Text = string.IsNullOrWhiteSpace(AuthService.DealerName)
                ? "Welcome."
                : $"Welcome, {AuthService.DealerName}.";
            CurrentDateText.Text = DateTime.Now.ToString("dddd, MMMM d, yyyy", CultureInfo.CurrentCulture);
            DeviceNameText.Text = Environment.MachineName;
            OperatingSystemText.Text = System.Runtime.InteropServices.RuntimeInformation.OSDescription.Replace("Microsoft ", string.Empty, StringComparison.OrdinalIgnoreCase);
            DeviceStatusText.Text = "Checking";
            PermanentLicenseAvailabilityText.Text = "Checking";
            PermanentLicenseStatusText.Text = "Checking";
            PermanentLicensePriceText.Text = "Unavailable";

            DeviceIdValueText.Text = string.IsNullOrWhiteSpace(_deviceId) ? "DEVICE ID: XXXXXXXXXX" : $"DEVICE ID: {_deviceId}";
            DeviceIdValueText.Foreground = Brushes.Black;
            LicenseKeyBox.Text = "XXXXXXXXXX";
            LicenseKeyBox.Foreground = Brushes.Gray;

            _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
            _timer.Tick += Timer_Tick;
            _cancellationTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(10) };
            _cancellationTimer.Tick += CancellationTimer_Tick;
            _connectivityTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(15) };
            _connectivityTimer.Tick += ConnectivityTimer_Tick;

            Loaded += DashboardWindow_Loaded;
            Closing += DashboardWindow_Closing;
            ResetCountdownDisplay();
        }

        private async void DashboardWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await RefreshConnectivityAsync();
            _connectivityTimer.Start();
            if (PermanentReleaseCache.IsReleased(_deviceId, _contractId))
            {
                StopCountdownTimer();
                DaysBox.Text = "--";
                HoursBox.Text = "--";
                MinsBox.Text = "--";
                SecsBox.Text = "--";
                StatusText.Text = "This device has been permanently released.";
                CancelPlanBtn.Visibility = Visibility.Collapsed;
                CancellationStatusText.Text = "Plan cancellation approved by dealer.";
                return;
            }

            RefreshCancellationAvailability();
            if (TryApplyRecoveryCountdown())
            {
                _cancellationTimer.Start();
            }

            await LoadDashboardAsync();
            if (!string.IsNullOrWhiteSpace(_contractId))
            {
                await CheckCancellationRequestAsync();
                _cancellationTimer.Start();
            }
        }

        private void DashboardWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
        {
            // Stop timers when closing
            _timer.Stop();
            _cancellationTimer.Stop();
            _connectivityTimer.Stop();

            // Allow closing without confirmation
            // The app will continue running in the background via AppWatchdog
        }

        private async void CancellationTimer_Tick(object? sender, EventArgs e)
        {
            RefreshCancellationAvailability();
            await CheckCancellationRequestAsync();
        }

        private async void ConnectivityTimer_Tick(object? sender, EventArgs e)
        {
            await RefreshConnectivityAsync();
        }

        private async Task RefreshConnectivityAsync()
        {
            if (_connectivityCheckInProgress)
            {
                return;
            }

            _connectivityCheckInProgress = true;
            SetConnectivityState("Checking internet...", "#FFF7E6", "#C98A00");

            try
            {
                var connected = NetworkInterface.GetIsNetworkAvailable();
                if (connected)
                {
                    using var response = await ConnectivityClient.GetAsync(
                        "https://www.msftconnecttest.com/connecttest.txt",
                        HttpCompletionOption.ResponseHeadersRead);
                    connected = response.IsSuccessStatusCode;
                }

                SetConnectivityState(
                    connected ? "Internet connected" : "Internet unavailable",
                    connected ? "#E6F6EF" : "#FDECEC",
                    connected ? "#16845A" : "#C93630");
            }
            catch
            {
                SetConnectivityState("Internet unavailable", "#FDECEC", "#C93630");
            }
            finally
            {
                _connectivityCheckInProgress = false;
            }
        }

        private void SetConnectivityState(string text, string background, string foreground)
        {
            var foregroundBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(foreground));
            InternetStatusText.Text = text;
            InternetStatusText.Foreground = foregroundBrush;
            InternetStatusDot.Fill = foregroundBrush;
            InternetStatusBadge.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(background));
        }

        private void RefreshCancellationAvailability()
        {
            var inRecoveryMode = !string.IsNullOrWhiteSpace(_deviceId) && RecoveryCache.FindActive(_deviceId, DateTime.UtcNow) != null;
            if (!inRecoveryMode)
            {
                CancelPlanBtn.Visibility = Visibility.Collapsed;
                CancelPlanBtn.IsEnabled = false;
                CancellationStatusText.Text = "Plan cancellation is available only during the active recovery window.";
                return;
            }

            CancelPlanBtn.Visibility = Visibility.Visible;
            CancelPlanBtn.IsEnabled = !_cancellationRequestInProgress;
            CancellationStatusText.Text = string.IsNullOrWhiteSpace(CancellationStatusText.Text) || CancellationStatusText.Text.Contains("available only during")
                ? "Recovery mode is active. You may request cancellation before the 36-hour window ends."
                : CancellationStatusText.Text;
        }

        private async Task CheckCancellationRequestAsync()
        {
            if (string.IsNullOrWhiteSpace(_contractId)) return;

            RefreshCancellationAvailability();

            try
            {
                var request = await _apiClient.GetCancellationRequestAsync(_contractId);
                if (request == null) return;

                if (string.Equals(request.Status, "pending", StringComparison.OrdinalIgnoreCase))
                {
                    CancellationStatusText.Text = "Cancellation request sent. Waiting for dealer confirmation.";
                    CancelPlanBtn.IsEnabled = false;
                    CancelPlanBtn.Visibility = Visibility.Visible;
                }
                else if (string.Equals(request.Status, "rejected", StringComparison.OrdinalIgnoreCase))
                {
                    CancellationStatusText.Text = string.IsNullOrWhiteSpace(request.DecisionReason)
                        ? "The dealer rejected the cancellation request."
                        : $"The dealer rejected the request: {request.DecisionReason}";
                    CancelPlanBtn.IsEnabled = true;
                    CancelPlanBtn.Visibility = Visibility.Visible;
                }
                else if (string.Equals(request.Status, "approved", StringComparison.OrdinalIgnoreCase))
                {
                    _cancellationTimer.Stop();
                    CancelPlanBtn.IsEnabled = false;
                    if (!string.IsNullOrWhiteSpace(_deviceId) && !string.IsNullOrWhiteSpace(_contractId) &&
                        PermanentReleaseCache.SaveRelease(_deviceId, _contractId))
                    {
                        StopCountdownTimer();
                        DaysBox.Text = "--";
                        HoursBox.Text = "--";
                        MinsBox.Text = "--";
                        SecsBox.Text = "--";
                        CancelPlanBtn.Visibility = Visibility.Collapsed;
                        CancellationStatusText.Text = "Plan cancellation approved. This device is permanently released.";
                        StatusText.Text = "This device has been permanently released.";
                        MessageBox.Show("Your plan cancellation was approved. This device is permanently released.", "Plan Released", MessageBoxButton.OK, MessageBoxImage.Information);
                    }
                    else
                    {
                        CancelPlanBtn.IsEnabled = true;
                        CancelPlanBtn.Visibility = Visibility.Visible;
                        _cancellationTimer.Start();
                        CancellationStatusText.Text = "Cancellation was approved, but the permanent release could not be saved locally. Keep the app open and try again.";
                    }
                }
            }
            catch
            {
                // Keep the dashboard usable while the backend is temporarily unavailable.
            }
        }

        private async void CancelPlanBtn_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_contractId) || _cancellationRequestInProgress) return;
            if (string.IsNullOrWhiteSpace(_deviceId) || RecoveryCache.FindActive(_deviceId, DateTime.UtcNow) == null)
            {
                CancelPlanBtn.Visibility = Visibility.Collapsed;
                CancellationStatusText.Text = "Plan cancellation is only available during the active recovery window.";
                return;
            }

            var confirmation = MessageBox.Show(
                "Send a cancellation request to your dealer? The plan remains active until the dealer confirms.",
                "Request plan cancellation",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);
            if (confirmation != MessageBoxResult.Yes) return;

            _cancellationRequestInProgress = true;
            CancelPlanBtn.IsEnabled = false;
            CancellationStatusText.Text = "Sending cancellation request...";
            try
            {
                await _apiClient.RequestCancellationAsync(_contractId, "Requested from desktop application.");
                CancellationStatusText.Text = "Cancellation request sent. Waiting for dealer confirmation.";
                _cancellationTimer.Start();
            }
            catch (Exception ex)
            {
                CancelPlanBtn.IsEnabled = true;
                CancellationStatusText.Text = $"Unable to send the cancellation request: {ex.Message}";
            }
            finally
            {
                _cancellationRequestInProgress = false;
            }
        }

        private async Task LoadDashboardAsync()
        {
            var snapshot = AuthService.GetRegistrationSnapshot();
            if (snapshot != null)
            {
                ApplySnapshotToUi(snapshot);
                StartCountdownFromSnapshot(snapshot);
            }

            try
            {
                StatusText.Text = "Connecting to backend...";
                LicenseStatusData? licenseStatus = null;

                if (!string.IsNullOrWhiteSpace(_deviceId))
                {
                    licenseStatus = await FetchLicenseStatusAsync(_deviceId);
                }
                else
                {
                    StatusText.Text = "Device context is missing. Dashboard cannot load backend license status.";
                    return;
                }

                if (licenseStatus != null)
                {
                    UpdateLicenseUi(licenseStatus);
                    if (licenseStatus.License?.SignedPayload != null && !string.IsNullOrWhiteSpace(licenseStatus.License.Signature))
                    {
                        LicenseCache.SaveLicense(licenseStatus.License);
                    }

                    if (licenseStatus.License != null &&
                        string.Equals(licenseStatus.License.Status, "active", StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(licenseStatus.License.LicenseType, "permanent", StringComparison.OrdinalIgnoreCase) &&
                        !string.IsNullOrWhiteSpace(_deviceId) && !string.IsNullOrWhiteSpace(_contractId) &&
                        PermanentReleaseCache.SaveRelease(_deviceId, _contractId))
                    {
                        ApplyPermanentReleaseUi();
                    }
                }
                else if (snapshot != null)
                {
                    var cachedLicense = LicenseCache.FindLatestActiveLicense(_deviceId!, _contractId);
                    if (cachedLicense != null)
                    {
                        UpdateLicenseUi(new LicenseStatusData { UnlockAllowed = true, License = cachedLicense });
                        StatusText.Text = "Using cached license data because live backend license data is unavailable.";
                    }
                    else
                    {
                        StatusText.Text = "Using the saved registration snapshot because live backend license data is unavailable.";
                    }
                }
                else
                {
                    StatusText.Text = "No backend license status returned.";
                }
            }
            catch (Exception)
            {
                var cachedLicense = !string.IsNullOrWhiteSpace(_deviceId)
                    ? LicenseCache.FindLatestActiveLicense(_deviceId, _contractId)
                    : null;

                if (cachedLicense != null)
                {
                    UpdateLicenseUi(new LicenseStatusData { UnlockAllowed = true, License = cachedLicense });
                    StatusText.Text = "Offline mode: using cached license data for permanent/temporary unlock display.";
                    return;
                }

                if (snapshot != null)
                {
                    StatusText.Text = "Offline mode: showing the locally saved registration details.";
                    return;
                }

                StatusText.Text = "Unable to load dashboard. Please check your network or try again.";
            }
        }

        private async Task<LicenseStatusData?> FetchLicenseStatusAsync(string deviceId)
        {
            return await _apiClient.GetDeviceLicenseStatusAsync(deviceId);
        }

        private void ApplyPermanentReleaseUi()
        {
            StopCountdownTimer();
            DaysBox.Text = "--";
            HoursBox.Text = "--";
            MinsBox.Text = "--";
            SecsBox.Text = "--";
            CancelPlanBtn.Visibility = Visibility.Collapsed;
            CancellationStatusText.Text = "Permanent payment completed. This device is permanently released.";
            StatusText.Text = "Permanent payment completed. This device has been permanently released.";
            PermanentLicenseAvailabilityText.Text = "Active";
            PermanentLicenseStatusText.Text = "Released";
        }

        private void ApplySnapshotToUi(DashboardSnapshot snapshot)
        {
            if (!string.IsNullOrWhiteSpace(snapshot.Model))
            {
                DeviceNameText.Text = snapshot.Model;
            }

            if (!string.IsNullOrWhiteSpace(snapshot.DeviceId))
            {
                DeviceIdValueText.Text = $"DEVICE ID: {snapshot.DeviceId}";
            }

            if (snapshot.FirstDueDate.HasValue)
            {
                PlanActivityDetailsText.Text = $"First due date: {snapshot.FirstDueDate.Value:MMMM d, yyyy}";
                RegistrationActivityDetailsText.Text = $"{DeviceNameText.Text} registered for this contract.";
            }

            if (snapshot.InstallmentCount.HasValue)
            {
                PlanFrequencyText.Text = snapshot.InstallmentCount.Value switch
                {
                    7 => "Weekly",
                    12 => "Monthly",
                    1 => "Yearly",
                    _ => $"{snapshot.InstallmentCount.Value} installments"
                };
            }

            // amount text now reflects installment amount, not full device price.
            if (snapshot.InstallmentAmount.HasValue)
            {
                AmountText.Text = $"{(string.IsNullOrWhiteSpace(snapshot.Currency) ? "GHS" : snapshot.Currency)} {snapshot.InstallmentAmount.Value:0.00}";
                AmountText.Visibility = Visibility.Visible;
            }
            else
            {
                AmountText.Visibility = Visibility.Collapsed;
            }

            if (!string.IsNullOrWhiteSpace(snapshot.ContractNumber))
            {
                ContractNumberText.Text = $"Contract: {snapshot.ContractNumber}";
                ContractNumberText.Visibility = Visibility.Visible;
            }
            else
            {
                ContractNumberText.Visibility = Visibility.Collapsed;
            }

            if (snapshot.InstallmentAmount.HasValue && snapshot.InstallmentCount.HasValue)
            {
                string frequencyLabel;
                if (snapshot.InstallmentCount == 7)
                {
                    frequencyLabel = "Weekly plan";
                }
                else if (snapshot.InstallmentCount == 12)
                {
                    frequencyLabel = "Monthly plan";
                }
                else if (snapshot.InstallmentCount == 1)
                {
                    frequencyLabel = "Yearly plan";
                }
                else
                {
                    frequencyLabel = $"{snapshot.InstallmentCount} installments";
                }

                InstallmentPlanText.Text = frequencyLabel;
                InstallmentPlanText.Visibility = Visibility.Visible;
                PlanFrequencyText.Text = frequencyLabel.Replace(" plan", string.Empty, StringComparison.OrdinalIgnoreCase);
            }
            else
            {
                InstallmentPlanText.Visibility = Visibility.Collapsed;
            }

            if (snapshot.DevicePrice.HasValue && snapshot.Deposit.HasValue)
            {
                var balance = Math.Max(0m, snapshot.DevicePrice.Value - snapshot.Deposit.Value);
                var currency = string.IsNullOrWhiteSpace(snapshot.Currency) ? "GHS" : snapshot.Currency;
                var paid = Math.Max(0m, Math.Min(snapshot.Deposit.Value, snapshot.DevicePrice.Value));
                var paidPercent = snapshot.DevicePrice.Value <= 0m ? 0 : (int)Math.Round(paid / snapshot.DevicePrice.Value * 100m);
                BalanceText.Text = $"Outstanding balance: {currency} {balance:0.00}";
                BalanceAmountText.Text = $"{currency} {balance:0.00} of {currency} {snapshot.DevicePrice.Value:0.00}";
                PaidAmountText.Text = $"{currency} {paid:0.00} paid";
                ProgressPercentText.Text = $"{paidPercent}% paid";
                PaidProgressBar.Width = paidPercent;
                BalanceText.Visibility = Visibility.Visible;
            }
            else
            {
                BalanceText.Visibility = Visibility.Collapsed;
            }

            if (snapshot.FirstDueDate.HasValue)
            {
                NextPaymentText.Text = $"First due date: {snapshot.FirstDueDate.Value:MMM dd, yyyy}";
                NextPaymentText.Visibility = Visibility.Visible;
            }
            else
            {
                NextPaymentText.Visibility = Visibility.Collapsed;
            }

            StatusText.Text = "Offline mode: showing the locally saved registration details.";
        }

        private void UpdateLicenseUi(LicenseStatusData licenseStatus)
        {
            if (!licenseStatus.UnlockAllowed || licenseStatus.License == null)
            {
                PermanentLicenseAvailabilityText.Text = "Unavailable";
                PermanentLicenseStatusText.Text = "Not activated";
                LicenseKeyBox.Text = string.Empty;
                PermanentLicensePanel.Visibility = Visibility.Collapsed;
                OpenPermanentPaymentBtn.Visibility = Visibility.Visible;
                VerifyPermanentBtn.Visibility = Visibility.Visible;
                VerifyLicenseBtn.Visibility = Visibility.Collapsed;
                VerifyStatusText.Text = string.Empty;
                StatusText.Text = "No active unlock license has been issued yet. Enter the valid key when available.";
                return;
            }

            var license = licenseStatus.License;
            LicenseKeyBox.Text = license.LicenseKey ?? string.Empty;
            PermanentLicenseAvailabilityText.Text = "Available";
            PermanentLicenseStatusText.Text = string.Equals(license.LicenseType, "permanent", StringComparison.OrdinalIgnoreCase)
                ? "Available"
                : "Not activated";

            if (string.Equals(license.LicenseType, "permanent", StringComparison.OrdinalIgnoreCase))
            {
                PermanentLicensePanel.Visibility = Visibility.Visible;
                OpenPermanentPaymentBtn.Visibility = Visibility.Visible;
                VerifyPermanentBtn.Visibility = Visibility.Visible;
                VerifyLicenseBtn.Visibility = Visibility.Collapsed;
                PermanentLicenseText.Text = license.LicenseKey ?? "N/A";
                StatusText.Text = "A permanent unlock license is available. Use this code if the device needs to be unlocked again.";
            }
            else
            {
                PermanentLicensePanel.Visibility = Visibility.Collapsed;
                OpenPermanentPaymentBtn.Visibility = Visibility.Collapsed;
                VerifyPermanentBtn.Visibility = Visibility.Collapsed;
                VerifyLicenseBtn.Visibility = Visibility.Visible;
                StatusText.Text = license.ExpiresAt.HasValue
                    ? $"One-time unlock license is active until {license.ExpiresAt:MMM dd, yyyy}. Countdown remains based on registration snapshot."
                    : "An unlock license exists for this device. Enter the issued key below.";
                VerifyStatusText.Text = string.Empty;
            }
        }

        private async void VerifyPermanentBtn_Click(object sender, RoutedEventArgs e)
        {
            await VerifyLicenseAsync(isPermanent: true);
        }

        private async void VerifyLicenseBtn_Click(object sender, RoutedEventArgs e)
        {
            await VerifyLicenseAsync(isPermanent: false);
        }

        private async Task VerifyLicenseAsync(bool isPermanent)
        {
            var key = LicenseKeyBox.Text?.Trim();
            if (string.IsNullOrWhiteSpace(key) || key == "XXXXXXXXXX")
            {
                VerifyStatusText.Foreground = Brushes.DarkRed;
                VerifyStatusText.Text = "Enter the license key in the box then click Verify.";
                return;
            }

            if (isPermanent && !AuthService.HasAccessToken)
            {
                VerifyStatusText.Foreground = Brushes.DarkRed;
                VerifyStatusText.Text = "Sign in via the Dashboard to verify permanent licenses online.";
                return;
            }

            try
            {
                VerifyStatusText.Foreground = Brushes.SteelBlue;
                VerifyStatusText.Text = isPermanent
                    ? "Verifying permanent license with server..."
                    : "Verifying license with server...";

                var result = await _apiClient.VerifyLicenseAsync(key, _deviceId ?? string.Empty, _contractId ?? string.Empty);
                if (result != null && result.Valid)
                {
                    VerifyStatusText.Foreground = Brushes.ForestGreen;
                    VerifyStatusText.Text = "License verified successfully.";
                    var status = await FetchLicenseStatusAsync(_deviceId!);
                    if (status?.License != null)
                    {
                        LicenseCache.SaveLicense(status.License);
                        UpdateLicenseUi(status);
                    }
                }
                else
                {
                    VerifyStatusText.Foreground = Brushes.DarkRed;
                    VerifyStatusText.Text = "License verification failed. Ensure the key is correct and try again.";
                }
            }
            catch (Exception ex)
            {
                VerifyStatusText.Foreground = Brushes.DarkRed;
                VerifyStatusText.Text = $"Verification error: {ex.Message}";
            }
            finally
            {
                if (!isPermanent)
                {
                    StatusText.Text = string.Empty;
                }
            }
        }

        public static bool ShouldRequestLock(DateTime? contractExpiryUtc, long remainingSeconds, bool recoveryWindowActive)
        {
            if (recoveryWindowActive)
            {
                return false;
            }

            if (!contractExpiryUtc.HasValue)
            {
                return false;
            }

            return remainingSeconds <= 0;
        }

        private void Timer_Tick(object? sender, EventArgs e)
        {
            var now = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(_deviceId) && RecoveryCache.FindActive(_deviceId, now) != null)
            {
                var active = RecoveryCache.FindActive(_deviceId, now);
                if (active != null)
                {
                    var recoveryRemainingSeconds = Math.Max(0, (long)(active.ActiveUntil - now).TotalSeconds);
                    _totalSeconds = recoveryRemainingSeconds;
                    UpdateCountdownDisplay(recoveryRemainingSeconds);
                    StatusText.Text = "Recovery mode active. Plan cancellation remains available until the 36-hour recovery window ends.";
                    if (recoveryRemainingSeconds <= 0)
                    {
                        CancelPlanBtn.Visibility = Visibility.Collapsed;
                        CancelPlanBtn.IsEnabled = false;
                        CancellationStatusText.Text = "The 36-hour recovery window has ended.";
                    }
                    return;
                }
            }

            if (_countdownStopwatch == null || !_countdownStopwatch.IsRunning)
            {
                StopCountdownTimer();
                return;
            }

            var elapsed = _countdownStopwatch.Elapsed.TotalSeconds;
            var remaining = Math.Max(0, _initialCountdownSeconds - (long)elapsed);
            var expiryUtc = _initialCountdownSeconds > 0 ? DateTime.UtcNow.AddSeconds(remaining) : (DateTime?)null;

            if (ShouldRequestLock(expiryUtc, remaining, false))
            {
                StopCountdownTimer();
                if (!_lockWindowShown)
                {
                    _lockWindowShown = true;
                    AppNavigator.Instance.ShowLock(_deviceId, _contractId);
                    Close();
                }
                return;
            }

            _totalSeconds = remaining;
            UpdateCountdownDisplay(remaining);
        }

        private void UpdateCountdownDisplay(long totalSeconds)
        {
            _totalSeconds = totalSeconds;
            var total = Math.Max(0, _totalSeconds);
            var totalDays = (int)(total / 86400);
            var days = totalDays % 30;
            var remainderSeconds = total % 86400;
            var hours = (int)(remainderSeconds / 3600);
            remainderSeconds %= 3600;
            var minutes = (int)(remainderSeconds / 60);
            var seconds = (int)(remainderSeconds % 60);

            if (DaysBox != null)
            {
                DaysBox.Text = days.ToString("D2", CultureInfo.InvariantCulture);
                DaysBox.Foreground = total == 0 ? Brushes.Red : Brushes.Black;
            }

            if (HoursBox != null)
            {
                HoursBox.Text = hours.ToString("D2", CultureInfo.InvariantCulture);
                HoursBox.Foreground = total == 0 ? Brushes.Red : Brushes.Black;
            }

            if (MinsBox != null)
            {
                MinsBox.Text = minutes.ToString("D2", CultureInfo.InvariantCulture);
                MinsBox.Foreground = total == 0 ? Brushes.Red : Brushes.Black;
            }

            if (SecsBox != null)
            {
                SecsBox.Text = seconds.ToString("D2", CultureInfo.InvariantCulture);
                SecsBox.Foreground = total == 0 ? Brushes.Red : Brushes.Black;
            }
        }

        private void StartCountdownFromLicense(LicenseData? license)
        {
            if (license?.ExpiresAt == null)
            {
                ResetCountdownDisplay();
                return;
            }

            StartCountdownFromDate(license.ExpiresAt.Value, "License expires at the scheduled unlock date.");
        }

        private void StartCountdownFromSnapshot(DashboardSnapshot snapshot)
        {
            if (!snapshot.FirstDueDate.HasValue)
            {
                ResetCountdownDisplay();
                return;
            }

            StartCountdownFromDate(snapshot.FirstDueDate.Value, "Countdown to the first scheduled due date from saved registration.");
        }

        private bool TryApplyRecoveryCountdown()
        {
            if (string.IsNullOrWhiteSpace(_deviceId))
            {
                return false;
            }

            var recovery = RecoveryCache.FindActive(_deviceId, DateTime.UtcNow);
            if (recovery == null)
            {
                return false;
            }

            var remaining = Math.Max(0, (long)(recovery.ActiveUntil - DateTime.UtcNow).TotalSeconds);
            _initialCountdownSeconds = remaining;
            _countdownStopwatch = Stopwatch.StartNew();
            UpdateCountdownDisplay(remaining);
            StatusText.Text = "Recovery mode active. The 36-hour recovery window is counting down.";
            if (!_timer.IsEnabled)
            {
                _timer.Start();
            }

            return true;
        }

        private void StartCountdownFromDate(DateTime targetDate, string statusMessage)
        {
            var remaining = targetDate.ToUniversalTime() - DateTime.UtcNow;
            var seconds = (long)Math.Max(0, remaining.TotalSeconds);
            
            _initialCountdownSeconds = seconds;
            _countdownStopwatch = Stopwatch.StartNew();
            
            UpdateCountdownDisplay(seconds);
            StatusText.Text = statusMessage;

            if (seconds > 0 && !_timer.IsEnabled)
            {
                _timer.Start();
            }
            else if (seconds == 0)
            {
                StopCountdownTimer();
            }
        }

        private void StopCountdownTimer()
        {
            if (_timer.IsEnabled)
            {
                _timer.Stop();
            }
            
            _countdownStopwatch?.Stop();
            _countdownStopwatch = null;
        }

        private void ResetCountdownDisplay()
        {
            StopCountdownTimer();
            UpdateCountdownDisplay(0);
            StatusText.Text = "Countdown paused until a registration snapshot due date is available.";
        }

        private void LicenseKeyBox_GotFocus(object sender, RoutedEventArgs e)
        {
            if (LicenseKeyBox.Text == "XXXXXXXXXX")
            {
                LicenseKeyBox.Text = string.Empty;
                LicenseKeyBox.Foreground = Brushes.Black;
            }
        }

        private void LicenseKeyBox_LostFocus(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(LicenseKeyBox.Text))
            {
                LicenseKeyBox.Text = "XXXXXXXXXX";
                LicenseKeyBox.Foreground = Brushes.Gray;
            }
        }

        private void OpenPermanentPaymentBtn_Click(object sender, RoutedEventArgs e)
        {
            var baseUrl = AuthService.GetRegistrationSnapshot()?.PaymentUrl;
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                baseUrl = "https://pay.project-x.com/permanent";
            }
            else
            {
                // Add permanent license type parameter
                baseUrl = AppendQueryParam(baseUrl, "type", "permanent");
            }

            TryOpenBrowser(baseUrl, "Open permanent license payment page");
        }

        private void MakePaymentBtn_Click(object sender, RoutedEventArgs e)
        {
            var baseUrl = AuthService.GetRegistrationSnapshot()?.PaymentUrl;
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                baseUrl = "https://pay.project-x.com/renew?type=temporary";
            }
            else
            {
                // Add temporary license type parameter
                baseUrl = AppendQueryParam(baseUrl, "type", "temporary");
            }

            TryOpenBrowser(baseUrl, "Open temporary license payment page");
        }

        private string AppendQueryParam(string url, string paramName, string paramValue)
        {
            if (string.IsNullOrWhiteSpace(url)) return url;

            var separator = url.Contains("?") ? "&" : "?";
            return $"{url}{separator}{paramName}={Uri.EscapeDataString(paramValue)}";
        }

        private void PaymentLink_RequestNavigate(object sender, RequestNavigateEventArgs e)
        {
            var url = e.Uri?.AbsoluteUri;
            if (string.IsNullOrWhiteSpace(url))
            {
                url = "https://pay.project-x.com/permanent?type=permanent";
            }
            TryOpenBrowser(url, "Open payment page");
            e.Handled = true;
        }

        private void TryOpenBrowser(string url, string actionLabel)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                MessageBox.Show("No payment link is available for this device yet.", actionLabel, MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Unable to open the payment page: {ex.Message}", "Navigation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

    }
}
