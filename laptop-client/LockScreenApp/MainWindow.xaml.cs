using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
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

        public MainWindow()
        {
            InitializeComponent();
        }

        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            Activate();
            Focus();

            DeviceAddressText.Text = HardwareFingerprint.GetDeviceAddress();
            PaymentUrlText.Text = Environment.GetEnvironmentVariable("PAYMENT_URL") ?? "https://pay.projectx.com";
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
            var backendUrl = Environment.GetEnvironmentVariable("BACKEND_URL") ?? "http://localhost:3000";
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

                RegistrationStore.MarkRegistered();
                PaymentUrlText.Text = registrationResult.paymentUrl;
                UpdatePaymentQr(registrationResult.paymentUrl);
                RegistrationPanel.Visibility = Visibility.Collapsed;
                PaymentPanel.Visibility = Visibility.Visible;
                CodePanel.Visibility = Visibility.Collapsed;
                CodeInput.Focus();
                RegistrationMessageText.Text = "Registration successful. Open the payment link on your phone and enter the unlock code once received.";
                ShowPopupMessage("Registration successful. Open the payment link on your phone.", Brushes.SeaGreen);
            }
            catch (HttpRequestException)
            {
                RegistrationMessageText.Text = $"No internet connection or backend unavailable. Check your network and try again.";
                ShowPopupMessage("No internet connection or backend unavailable.", Brushes.OrangeRed);
            }
            catch (System.Text.Json.JsonException)
            {
                RegistrationMessageText.Text = "Registration failed: received an invalid response from the backend.";
                ShowPopupMessage("Registration failed: invalid server response.", Brushes.OrangeRed);
            }
            catch (Exception ex)
            {
                RegistrationMessageText.Text = $"Registration failed: {ex.Message}";
                ShowPopupMessage($"Registration failed: {ex.Message}", Brushes.OrangeRed);
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
            if (string.IsNullOrWhiteSpace(secret))
            {
                var text = "Unlock service is not configured.";
                MessageText.Text = text;
                ShowPopupMessage(text, Brushes.OrangeRed);
                return;
            }

            try
            {
                var hardwareUuid = HardwareFingerprint.GetHardwareUuid();
                var now = DateTime.UtcNow;
                var isReleaseCode = OfflineToken.VerifyRelease(code, hardwareUuid, secret);
                var isValid = isReleaseCode || OfflineToken.Verify(code, hardwareUuid, now.Year, now.Month, secret);

                if (isReleaseCode)
                {
                    DeadlineStore.PermanentlyRelease();
                }
                else if (!isValid)
                {
                    var nextMonth = now.AddMonths(1);
                    isValid = OfflineToken.Verify(code, hardwareUuid, nextMonth.Year, nextMonth.Month, secret);
                    if (isValid)
                    {
                        DeadlineStore.SetDeadline(new DateOnly(nextMonth.Year, nextMonth.Month, DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month)));
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
            catch
            {
                MessageText.Text = "Could not verify this device.";
            }
        }
    }
}

