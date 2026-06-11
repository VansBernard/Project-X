using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using QRCoder;
using TokenVerifier;

namespace LockScreenApp
{
    public partial class MainWindow : Window
    {
        private static readonly Regex DigitsOnly = new("^[0-9]+$", RegexOptions.Compiled);
        private static readonly HttpClient HttpClient = new();
        private bool _canClose;
        private IntPtr _keyboardHook = IntPtr.Zero;
        private LowLevelKeyboardProc? _keyboardProc;

        public MainWindow()
        {
            InitializeComponent();
            LoadEnvironmentVariables();
        }

        protected override void OnSourceInitialized(EventArgs e)
        {
            base.OnSourceInitialized(e);
            _keyboardProc = HookCallback;
            _keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, _keyboardProc, GetModuleHandle(Process.GetCurrentProcess().MainModule?.ModuleName ?? string.Empty), 0);
        }

        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        private const int WH_KEYBOARD_LL = 13;
        private const int WM_KEYDOWN = 0x0100;
        private const int WM_SYSKEYDOWN = 0x0104;
        private const int VK_TAB = 0x09;
        private const int VK_ESCAPE = 0x1B;
        private const int VK_F4 = 0x73;
        private const int VK_LWIN = 0x5B;
        private const int VK_RWIN = 0x5C;
        private const int VK_CONTROL = 0x11;
        private const int VK_MENU = 0x12;

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll")]
        private static extern short GetAsyncKeyState(int vKey);

        private static bool IsModifierDown(int vk)
        {
            return (GetAsyncKeyState(vk) & 0x8000) != 0;
        }

        private IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN))
            {
                var vkCode = Marshal.ReadInt32(lParam);
                if (PaymentPanel.Visibility == Visibility.Visible)
                {
                    var altDown = IsModifierDown(VK_MENU);
                    var ctrlDown = IsModifierDown(VK_CONTROL);

                    if (vkCode == VK_LWIN || vkCode == VK_RWIN)
                        return (IntPtr)1;

                    if (vkCode == VK_TAB && altDown)
                        return (IntPtr)1;

                    if (vkCode == VK_F4 && altDown)
                        return (IntPtr)1;

                    if (vkCode == VK_ESCAPE && ctrlDown)
                        return (IntPtr)1;
                }
            }

            return CallNextHookEx(_keyboardHook, nCode, wParam, lParam);
        }

        private void Window_Closed(object? sender, EventArgs e)
        {
            if (_keyboardHook != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_keyboardHook);
                _keyboardHook = IntPtr.Zero;
            }
        }

        private static void LoadEnvironmentVariables()
        {
            var useEnvFile = string.Equals(
                Environment.GetEnvironmentVariable("PROJECTX_USE_ENV_FILE"),
                "true",
                StringComparison.OrdinalIgnoreCase);

            if (!useEnvFile)
            {
                return;
            }

            var envPath = FindDotEnvPath(Path.GetDirectoryName(typeof(MainWindow).Assembly.Location) ?? ".");
            if (envPath == null)
            {
                envPath = FindDotEnvPath(Environment.CurrentDirectory);
            }

            if (envPath == null)
            {
                ClientLogger.LogWarning("PROJECTX_USE_ENV_FILE is enabled but no .env file was found.");
                return;
            }

            ClientLogger.LogInfo($"Loading environment variables from {envPath}");

            foreach (var line in File.ReadLines(envPath))
            {
                var trimmed = line.Trim();
                if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("#"))
                    continue;

                var parts = trimmed.Split('=', 2);
                if (parts.Length == 2)
                {
                    var key = parts[0].Trim();
                    var value = parts[1].Trim().Trim('"');
                    if (!string.IsNullOrWhiteSpace(key) && Environment.GetEnvironmentVariable(key) == null)
                    {
                        Environment.SetEnvironmentVariable(key, value);
                    }
                }
            }
        }

        private static string? FindDotEnvPath(string startDirectory)
        {
            var directory = new DirectoryInfo(startDirectory);
            while (directory != null)
            {
                var candidate = Path.Combine(directory.FullName, ".env");
                if (File.Exists(candidate))
                    return candidate;

                directory = directory.Parent;
            }

            return null;
        }

        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            Activate();
            Focus();

            DeviceAddressText.Text = HardwareFingerprint.GetDeviceAddress();
            var defaultPaymentUrl = Environment.GetEnvironmentVariable("PAYMENT_URL") ?? "https://project-x-kg81.onrender.com";
            PaymentUrlText.Text = RegistrationStore.GetPaymentUrl() ?? defaultPaymentUrl;
            CodePanel.Visibility = Visibility.Collapsed;

            if (RegistrationStore.IsRegistered())
            {
                RegistrationPanel.Visibility = Visibility.Collapsed;
                PaymentPanel.Visibility = Visibility.Visible;
                CodeInput.Focus();
                UpdatePaymentQr(PaymentUrlText.Text);
            }
            else
            {
                RegistrationPanel.Visibility = Visibility.Visible;
                PaymentPanel.Visibility = Visibility.Collapsed;
                CustomerNameInput.Focus();
            }
        }

        private void Window_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
        {
            e.Cancel = !_canClose;
        }

        private async void Window_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key is Key.System or Key.F4 or Key.Escape)
            {
                e.Handled = true;
                return;
            }

            if (e.Key == Key.Enter)
            {
                e.Handled = true;
                if (RegistrationPanel.Visibility == Visibility.Visible)
                {
                    await RegisterDeviceAsync();
                }
                else if (PaymentPanel.Visibility == Visibility.Visible)
                {
                    TryUnlock();
                }
            }
        }

        private void Window_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (PaymentPanel.Visibility == Visibility.Visible)
            {
                if (e.Key == Key.System || e.Key == Key.F4 || e.Key == Key.Escape)
                {
                    e.Handled = true;
                }
            }
        }

        private void Window_Deactivated(object sender, EventArgs e)
        {
            if (PaymentPanel.Visibility == Visibility.Visible)
            {
                Activate();
                Topmost = true;
            }
        }

        private void CodeInput_PreviewTextInput(object sender, TextCompositionEventArgs e)
        {
            e.Handled = !DigitsOnly.IsMatch(e.Text);
        }

        private void CodeInput_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
        {
            MessageText.Text = string.Empty;
        }

        private void UnlockButton_Click(object sender, RoutedEventArgs e)
        {
            TryUnlock();
        }

        private async void RegisterButton_Click(object sender, RoutedEventArgs e)
        {
            await RegisterDeviceAsync();
        }

        private void HaveCodeButton_Click(object sender, RoutedEventArgs e)
        {
            CodePanel.Visibility = Visibility.Visible;
            CodeInput.Focus();
        }

        private void RegistrationCloseButton_Click(object sender, RoutedEventArgs e)
        {
            _canClose = true;
            Close();
        }

        private void CopyPaymentLinkButton_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(PaymentUrlText.Text))
            {
                ShowPopupMessage("No payment link is available yet.", Brushes.OrangeRed);
                return;
            }

            Clipboard.SetText(PaymentUrlText.Text);
            ShowPopupMessage("Payment link copied to clipboard.", Brushes.SeaGreen);
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            ShowPopupMessage("Cancel is blocked while the device is locked. Complete payment and enter the unlock code.", Brushes.LightGray);
            MessageText.Text = "Cancel is blocked while the device is locked. Complete payment and enter the unlock code.";
        }

        private void ShowPopupMessage(string message, Brush background, int durationMs = 3200)
        {
            PopupMessageText.Text = message;
            PopupMessageBorder.Background = background;
            PopupMessageBorder.Visibility = Visibility.Visible;
            PopupMessageBorder.Opacity = 0;

            if (PopupMessageBorder.RenderTransform is TranslateTransform transform)
            {
                transform.Y = 60;
            }

            var fadeIn = new DoubleAnimation(1, TimeSpan.FromMilliseconds(240));
            var slideIn = new DoubleAnimation(0, TimeSpan.FromMilliseconds(240))
            {
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
            };

            PopupMessageBorder.BeginAnimation(OpacityProperty, fadeIn);
            if (PopupMessageBorder.RenderTransform is TranslateTransform transformIn)
            {
                transformIn.BeginAnimation(TranslateTransform.YProperty, slideIn);
            }

            _ = HidePopupMessageAsync(durationMs);
        }

        private async Task HidePopupMessageAsync(int delayMs)
        {
            await Task.Delay(delayMs);
            if (PopupMessageBorder.Visibility != Visibility.Visible)
            {
                return;
            }

            var fadeOut = new DoubleAnimation(0, TimeSpan.FromMilliseconds(220));
            var slideOut = new DoubleAnimation(60, TimeSpan.FromMilliseconds(220))
            {
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseIn }
            };

            fadeOut.Completed += (_, __) => PopupMessageBorder.Visibility = Visibility.Collapsed;
            PopupMessageBorder.BeginAnimation(OpacityProperty, fadeOut);

            if (PopupMessageBorder.RenderTransform is TranslateTransform transformOut)
            {
                transformOut.BeginAnimation(TranslateTransform.YProperty, slideOut);
            }
        }

        private void UpdatePaymentQr(string paymentUrl)
        {
            if (string.IsNullOrWhiteSpace(paymentUrl))
            {
                PaymentQrImage.Source = null;
                return;
            }

            try
            {
                using var qrGenerator = new QRCodeGenerator();
                using var qrData = qrGenerator.CreateQrCode(paymentUrl, QRCodeGenerator.ECCLevel.Q);
                using var qrCode = new PngByteQRCode(qrData);
                var qrBytes = qrCode.GetGraphic(20, new byte[] { 255, 255, 255 }, new byte[] { 17, 24, 39 });

                var bitmap = new BitmapImage();
                using var stream = new MemoryStream(qrBytes);
                bitmap.BeginInit();
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.StreamSource = stream;
                bitmap.EndInit();
                bitmap.Freeze();

                PaymentQrImage.Source = bitmap;
            }
            catch
            {
                PaymentQrImage.Source = null;
            }
        }

        private async Task RegisterDeviceAsync()
        {
            RegistrationMessageText.Text = string.Empty;

            var customerName = CustomerNameInput.Text.Trim();
            var customerEmail = CustomerEmailInput.Text.Trim();
            var phoneNumber = PhoneNumberInput.Text.Trim();
            var deviceName = DeviceNameInput.Text.Trim();
            var totalAmountText = TotalAmountInput.Text.Trim();
            var paymentAmountText = PaymentAmountInput.Text.Trim();
            var frequencyItem = PaymentFrequencyCombo.SelectedItem as System.Windows.Controls.ComboBoxItem;
            var paymentFrequency = frequencyItem?.Content?.ToString() ?? "Monthly";

            if (string.IsNullOrWhiteSpace(customerName)
                || string.IsNullOrWhiteSpace(customerEmail)
                || string.IsNullOrWhiteSpace(phoneNumber)
                || string.IsNullOrWhiteSpace(deviceName)
                || string.IsNullOrWhiteSpace(totalAmountText)
                || string.IsNullOrWhiteSpace(paymentAmountText))
            {
                RegistrationMessageText.Text = "Please complete all registration fields.";
                ShowPopupMessage("Please complete all registration fields.", Brushes.OrangeRed);
                return;
            }

            if (!decimal.TryParse(totalAmountText, out var totalAmount) || totalAmount <= 0)
            {
                RegistrationMessageText.Text = "Enter a valid total contract amount.";
                ShowPopupMessage("Enter a valid total contract amount.", Brushes.OrangeRed);
                return;
            }

            if (!decimal.TryParse(paymentAmountText, out var paymentAmount) || paymentAmount <= 0)
            {
                RegistrationMessageText.Text = "Enter a valid payment amount.";
                ShowPopupMessage("Enter a valid payment amount.", Brushes.OrangeRed);
                return;
            }

            var hardwareUuid = HardwareFingerprint.GetHardwareUuid();
            var deviceAddress = HardwareFingerprint.GetDeviceAddress();
            var backendUrl = Environment.GetEnvironmentVariable("BACKEND_URL") ?? "https://project-x-kg81.onrender.com";
            var request = new
            {
                hardwareUuid,
                deviceAddress,
                deviceName,
                customerName,
                customerEmail,
                phoneNumber,
                totalContractAmount = totalAmount,
                paymentFrequency,
                paymentAmount
            };

            try
            {
                var response = await HttpClient.PostAsJsonAsync($"{backendUrl}/api/v1/devices/register", request);
                if (!response.IsSuccessStatusCode)
                {
                    var error = await ReadErrorMessageAsync(response);
                    RegistrationMessageText.Text = $"Registration failed: {error}";
                    ShowPopupMessage($"Registration failed: {error}", Brushes.OrangeRed);
                    return;
                }

                var registrationResult = await response.Content.ReadFromJsonAsync<RegistrationResult>();
                if (registrationResult is null || registrationResult.status != "ok")
                {
                    RegistrationMessageText.Text = "Registration failed: invalid server response.";
                    ShowPopupMessage("Registration failed: invalid server response.", Brushes.OrangeRed);
                    return;
                }

                RegistrationStore.MarkRegistered(registrationResult.paymentUrl);
                PaymentUrlText.Text = registrationResult.paymentUrl;
                UpdatePaymentQr(registrationResult.paymentUrl);
                RegistrationPanel.Visibility = Visibility.Collapsed;
                PaymentPanel.Visibility = Visibility.Visible;
                CodePanel.Visibility = Visibility.Collapsed;
                CodeInput.Focus();
                RegistrationMessageText.Text = "Registration successful. Open the payment link on your phone and enter the unlock code once received.";
                ShowPopupMessage("Registration successful. Open the payment link on your phone.", Brushes.SeaGreen);
            }
            catch (HttpRequestException ex)
            {
                RegistrationMessageText.Text = $"No internet connection or backend unavailable. Check your network and try again.";
                ShowPopupMessage("No internet connection or backend unavailable.", Brushes.OrangeRed);
                ClientLogger.LogError("Registration request failed.", ex);
            }
            catch (System.Text.Json.JsonException ex)
            {
                RegistrationMessageText.Text = "Registration failed: received an invalid response from the backend.";
                ShowPopupMessage("Registration failed: invalid server response.", Brushes.OrangeRed);
                ClientLogger.LogError("Failed to parse registration response.", ex);
            }
            catch (Exception ex)
            {
                RegistrationMessageText.Text = $"Registration failed: {ex.Message}";
                ShowPopupMessage($"Registration failed: {ex.Message}", Brushes.OrangeRed);
                ClientLogger.LogError("Registration failed with unexpected error.", ex);
            }
        }

        private static async Task<string> ReadErrorMessageAsync(HttpResponseMessage response)
        {
            try
            {
                var errorResponse = await response.Content.ReadFromJsonAsync<ErrorResponse>();
                if (!string.IsNullOrWhiteSpace(errorResponse?.error))
                {
                    return errorResponse.error;
                }
            }
            catch
            {
                // Ignore parse failures and fall back to raw text.
            }

            var fallback = await response.Content.ReadAsStringAsync();
            return string.IsNullOrWhiteSpace(fallback)
                ? response.ReasonPhrase ?? "Unknown error"
                : fallback;
        }

        private class RegistrationResult
        {
            public string status { get; set; } = string.Empty;
            public string paymentUrl { get; set; } = string.Empty;
        }

        private class ErrorResponse
        {
            public string error { get; set; } = string.Empty;
        }

        private void TryUnlock()
        {
            var code = CodeInput.Text.Trim();
            if (code.Length != 8 || !DigitsOnly.IsMatch(code))
            {
                var text = "Enter the 8-digit code.";
                MessageText.Text = text;
                ShowPopupMessage(text, Brushes.OrangeRed);
                CodeInput.Focus();
                return;
            }

            var secret = Environment.GetEnvironmentVariable("TOKEN_SECRET");
            var publicKey = Environment.GetEnvironmentVariable("TOKEN_PUBLIC_KEY");
            if (string.IsNullOrWhiteSpace(secret) && string.IsNullOrWhiteSpace(publicKey))
            {
                var text = "Unlock service is not configured.";
                MessageText.Text = text;
                ShowPopupMessage(text, Brushes.OrangeRed);
                ClientLogger.LogError("TOKEN_SECRET and TOKEN_PUBLIC_KEY are both missing.");
                return;
            }

            try
            {
                var hardwareUuid = HardwareFingerprint.GetHardwareUuid();
                var now = DateTime.UtcNow;
                var isReleaseCode = false;
                var isValid = false;

                if (!string.IsNullOrWhiteSpace(publicKey))
                {
                    isReleaseCode = OfflineToken.VerifyReleaseWithPublicKey(code, hardwareUuid, publicKey);
                    isValid = isReleaseCode || OfflineToken.VerifyWithPublicKey(code, hardwareUuid, now.Year, now.Month, publicKey);
                }

                if (!isValid && !string.IsNullOrWhiteSpace(secret))
                {
                    isReleaseCode = OfflineToken.VerifyRelease(code, hardwareUuid, secret);
                    isValid = isReleaseCode || OfflineToken.Verify(code, hardwareUuid, now.Year, now.Month, secret);
                }

                if (isReleaseCode)
                {
                    DeadlineStore.PermanentlyRelease();
                }
                else if (!isValid)
                {
                    if (!string.IsNullOrWhiteSpace(publicKey))
                    {
                        isValid = OfflineToken.VerifyWithPublicKey(code, hardwareUuid, now.AddMonths(1).Year, now.AddMonths(1).Month, publicKey);
                    }

                    if (!isValid && !string.IsNullOrWhiteSpace(secret))
                    {
                        var nextMonth = now.AddMonths(1);
                        isValid = OfflineToken.Verify(code, hardwareUuid, nextMonth.Year, nextMonth.Month, secret);
                        if (isValid)
                        {
                            DeadlineStore.SetDeadline(new DateOnly(nextMonth.Year, nextMonth.Month, DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month)));
                        }
                    }
                }
                else
                {
                    DeadlineStore.SetDeadline(new DateOnly(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month)));
                }

                if (!isValid)
                {
                    var text = "Invalid code.";
                    MessageText.Text = text;
                    ShowPopupMessage(text, Brushes.OrangeRed);
                    CodeInput.SelectAll();
                    CodeInput.Focus();
                    return;
                }

                _canClose = true;
                Application.Current.Shutdown(0);
            }
            catch (Exception ex)
            {
                MessageText.Text = "Could not verify this device.";
                ClientLogger.LogError("Unlock verification failed.", ex);
            }
        }
    }
}

