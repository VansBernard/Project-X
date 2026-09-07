using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Threading.Tasks;

namespace DesktopAppFresh
{
    public partial class RegistrationWindow : Window
    {
        private readonly DesktopApiClient _apiClient = new DesktopApiClient();
        private bool _isInitializing = true;

        public RegistrationWindow(string? dealerEmail = null, string? dealerName = null)
        {
            InitializeComponent();
            PopulateAutoFields(dealerEmail, dealerName);
            PopulateCountryCurrencyLists();
            GenerateContractNumber();
            SetDefaultFirstDueDate();
            _isInitializing = false;
            Loaded += RegistrationWindow_Loaded;
        }

        private void RegistrationWindow_Loaded(object sender, RoutedEventArgs e)
        {
            UpdateInstallmentPlan();
            var posture = WindowsSecurityPostureService.Read();
            SecurityPostureText.Text =
                $"Security status | BitLocker: {posture.BitLocker} | Secure Boot: {posture.SecureBoot} | BIOS password: {posture.BiosPassword} | Project X service: {posture.WindowsService}";
        }

        private void RegistrationScrollViewer_PreviewMouseWheel(object sender, System.Windows.Input.MouseWheelEventArgs e)
        {
            if (sender is ScrollViewer viewer)
            {
                var offsetChange = e.Delta * 0.12;
                viewer.ScrollToVerticalOffset(viewer.VerticalOffset - offsetChange);
                e.Handled = true;
            }
        }

        private async void RegisterBtn_Click(object sender, RoutedEventArgs e)
        {
            var timeValidation = AntiTamperingService.ValidateAndRecord();
            if (!timeValidation.IsValid)
            {
                AppNavigator.Instance.ShowTimeCorrection(timeValidation.Message);
                return;
            }

            var validationMessage = ValidateRegistration();
            if (validationMessage is not null)
            {
                ShowStatus(validationMessage, Brushes.IndianRed);
                return;
            }

            RegisterBtn.IsEnabled = false;
            RegisterBtnText.Text = "REGISTERING...";
            ShowStatus("Submitting the full registration in one step...", Brushes.SteelBlue);

            try
            {
                var registration = await CompleteRegistrationAsync();
                var customerId = registration.Customer.Id;
                var deviceId = registration.Device.Id;
                var contract = registration.Contract;
                var contractId = contract.Id;
                if (string.IsNullOrWhiteSpace(customerId) || string.IsNullOrWhiteSpace(deviceId) || string.IsNullOrWhiteSpace(contractId))
                    throw new InvalidOperationException("Registration returned incomplete records.");
                if (string.IsNullOrWhiteSpace(registration.PaymentUrl))
                    throw new InvalidOperationException("Registration did not return a payment link.");

                PaymentQrCache.Save(deviceId, registration.PaymentUrl);

                RegisterProgressBar.Width = RegisterBtn.ActualWidth;
                foreach (var voucher in registration.Vouchers)
                {
                    if (!LicenseCache.SaveOfflineVoucher(voucher))
                        throw new InvalidOperationException("Temporary payment vouchers could not be cached.");
                }

                if (registration.PermanentLicense == null || !LicenseCache.SaveOfflineVoucher(registration.PermanentLicense))
                    throw new InvalidOperationException("Permanent ownership license could not be cached.");

                AuthService.SetRegistrationSnapshot(
                    deviceId,
                    contractId,
                    contract.ContractNumber ?? ContractNumberTextBox.Text.Trim(),
                    contract.Device?.SerialNumber ?? DeviceSerialTextBox.Text.Trim(),
                    ManufacturerTextBox.Text.Trim(),
                    ModelTextBox.Text.Trim(),
                    contract.Currency ?? CurrencyComboBox.Text.Trim().ToUpperInvariant(),
                    contract.DevicePrice ?? decimal.Parse(DevicePriceTextBox.Text.Trim(), CultureInfo.InvariantCulture),
                    contract.DepositAmount ?? decimal.Parse(DepositTextBox.Text.Trim(), CultureInfo.InvariantCulture),
                    contract.InstallmentAmount ?? decimal.Parse(InstallmentAmountTextBox.Text.Trim(), CultureInfo.InvariantCulture),
                    contract.InstallmentCount ?? int.Parse(InstallmentCountTextBox.Text.Trim(), CultureInfo.InvariantCulture),
                    contract.FirstDueDate ?? FirstDueDatePicker.SelectedDate?.Date,
                    registration.PaymentUrl);

                RegisterBtnText.Text = "COMPLETE";
                RegisterBtn.Background = new SolidColorBrush(Color.FromRgb(58, 87, 65));
                ShowStatus("Registration completed: payment QR and offline unlock verification are ready.", Brushes.ForestGreen);
                await System.Threading.Tasks.Task.Delay(600);
                RegisterBtnText.Text = "OPENING DASHBOARD...";
                AuthService.SetDeviceContext(deviceId, contractId);
                AppNavigator.Instance.ShowDashboard(deviceId, contractId);
                Close();
            }
            catch (Exception ex)
            {
                ShowStatus($"Registration failed: {ex.Message}", Brushes.IndianRed);
            }
            finally
            {
                RegisterBtn.IsEnabled = true;
            }
        }

        private async Task<RegistrationData> CompleteRegistrationAsync()
        {
            var currency = CurrencyComboBox.Text.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(currency))
            {
                throw new InvalidOperationException("Select the contract currency before continuing.");
            }

            var customerPayload = new Dictionary<string, object?>
            {
                ["firstName"] = CustomerFirstNameTextBox.Text.Trim(),
                ["lastName"] = CustomerLastNameTextBox.Text.Trim(),
                ["metadata"] = new { source = "desktop-registration" }
            };

            var email = CustomerEmailTextBox.Text.Trim();
            if (!string.IsNullOrWhiteSpace(email))
            {
                customerPayload["email"] = email;
            }

            var phone = CustomerPhoneTextBox.Text.Trim();
            if (!string.IsNullOrWhiteSpace(phone))
            {
                customerPayload["phone"] = phone;
            }

            var address = CustomerAddressTextBox.Text.Trim();
            if (!string.IsNullOrWhiteSpace(address))
            {
                customerPayload["address"] = address;
            }

            var city = CustomerCityTextBox.Text.Trim();
            if (!string.IsNullOrWhiteSpace(city))
            {
                customerPayload["city"] = city;
            }

            var state = CustomerStateTextBox.Text.Trim();
            if (!string.IsNullOrWhiteSpace(state))
            {
                customerPayload["state"] = state;
            }

            var country = GetCountryCode(CountryComboBox.Text.Trim());
            if (!string.IsNullOrWhiteSpace(country))
            {
                customerPayload["country"] = country;
            }

            var devicePrice = decimal.Parse(DevicePriceTextBox.Text.Trim(), System.Globalization.CultureInfo.InvariantCulture);
            var deposit = decimal.Parse(DepositTextBox.Text.Trim(), System.Globalization.CultureInfo.InvariantCulture);
            var installmentAmount = decimal.Parse(InstallmentAmountTextBox.Text.Trim(), System.Globalization.CultureInfo.InvariantCulture);
            var installmentCount = int.Parse(InstallmentCountTextBox.Text.Trim(), System.Globalization.CultureInfo.InvariantCulture);

            var contractPayload = new Dictionary<string, object?>
            {
                ["contractNumber"] = ContractNumberTextBox.Text.Trim(),
                ["currency"] = currency,
                ["devicePrice"] = devicePrice,
                ["deposit"] = deposit,
                ["installmentAmount"] = installmentAmount,
                ["installmentCount"] = installmentCount,
                ["paymentPlan"] = GetSelectedPaymentPlan(),
                ["metadata"] = new { source = "desktop-registration" }
            };

            if (FirstDueDatePicker.SelectedDate.HasValue)
            {
                contractPayload["firstDueDate"] = FirstDueDatePicker.SelectedDate.Value;
            }

            var payload = new Dictionary<string, object?>
            {
                ["customer"] = customerPayload,
                ["device"] = new Dictionary<string, object?>
                {
                    ["serialNumber"] = DeviceSerialTextBox.Text.Trim(),
                    ["manufacturer"] = ManufacturerTextBox.Text.Trim(),
                    ["model"] = ModelTextBox.Text.Trim(),
                    ["hardwareFingerprint"] = HardwareFingerprintTextBox.Text.Trim(),
                    ["metadata"] = new { mac = DeviceMacAddressTextBox.Text.Trim() }
                },
                ["contract"] = contractPayload
            };

            var result = await _apiClient.CompleteRegistrationAsync(payload);
            if (string.IsNullOrWhiteSpace(result.Customer.Id) || !Guid.TryParse(result.Customer.Id, out _))
            {
                throw new InvalidOperationException("Registration returned an invalid customer identifier.");
            }

            if (string.IsNullOrWhiteSpace(result.Device.Id) || !Guid.TryParse(result.Device.Id, out _))
            {
                throw new InvalidOperationException("Registration returned an invalid device identifier.");
            }

            if (string.IsNullOrWhiteSpace(result.Contract.Id) || !Guid.TryParse(result.Contract.Id, out _))
            {
                throw new InvalidOperationException("Registration returned an invalid contract identifier.");
            }

            return result;
        }

        private void PopulateAutoFields(string? dealerEmail, string? dealerName)
        {
            DealerIdTextBox.Text = AuthService.DealerSlug ?? AuthService.DealerName ?? "UNKNOWN";
            RegenerateDeviceIdentityFields();
            ManufacturerTextBox.Text = GetManufacturer();
            ModelTextBox.Text = GetModel();
            DeviceMacAddressTextBox.Text = GetMacAddress();

            if (!string.IsNullOrWhiteSpace(dealerEmail))
                CustomerEmailTextBox.Text = dealerEmail;

            if (!string.IsNullOrWhiteSpace(dealerName))
                CustomerFirstNameTextBox.Text = dealerName;
        }

        private void PopulateCountryCurrencyLists()
        {
            var regionInfos = CultureInfo.GetCultures(CultureTypes.SpecificCultures)
                .Select(c =>
                {
                    try
                    {
                        return new RegionInfo(c.Name);
                    }
                    catch
                    {
                        return null;
                    }
                })
                .Where(r => r != null)
                .Select(r => r!)
                .DistinctBy(r => r.TwoLetterISORegionName)
                .OrderBy(r => r.EnglishName)
                .ToList();

            CountryComboBox.ItemsSource = regionInfos
                .Select(r => $"{r.TwoLetterISORegionName} - {r.EnglishName}")
                .ToList();

            var currencyCodes = regionInfos
                .Select(r => r.ISOCurrencySymbol)
                .Where(code => !string.IsNullOrWhiteSpace(code))
                .Distinct()
                .OrderBy(code => code)
                .ToList();

            CurrencyComboBox.ItemsSource = currencyCodes;
        }

        private void GenerateContractNumber()
        {
            ContractNumberTextBox.Text = $"PX-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";
        }

        private void SetDefaultFirstDueDate(int daysToAdd = 7)
        {
            FirstDueDatePicker.SelectedDate = DateTime.Today.AddDays(daysToAdd);
        }

        private static long ConvertToPesewas(decimal amount)
        {
            return (long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);
        }

        private string GetSelectedPaymentPlan()
        {
            if (WeeklyRadioButton.IsChecked == true)
                return "weekly";

            if (MonthlyRadioButton.IsChecked == true)
                return "monthly";

            return "yearly";
        }

        private int GetTemporaryLicenseValidityDays()
        {
            if (WeeklyRadioButton.IsChecked == true)
                return 7;

            if (MonthlyRadioButton.IsChecked == true)
                return 30;

            return 365;
        }

        private void UpdateInstallmentPlan()
        {
            if (DevicePriceTextBox == null || DepositTextBox == null || InstallmentAmountTextBox == null || InstallmentCountTextBox == null || WeeklyRadioButton == null || MonthlyRadioButton == null || FirstDueDatePicker == null)
            {
                return;
            }

            var devicePriceText = DevicePriceTextBox.Text?.Trim() ?? string.Empty;
            var depositText = DepositTextBox.Text?.Trim() ?? string.Empty;

            if (!decimal.TryParse(devicePriceText, NumberStyles.Number, CultureInfo.InvariantCulture, out var devicePrice)
                || !decimal.TryParse(depositText, NumberStyles.Number, CultureInfo.InvariantCulture, out var deposit))
            {
                InstallmentAmountTextBox.Text = string.Empty;
                InstallmentCountTextBox.Text = string.Empty;
                UpdatePlanSummary(null, null, null);
                return;
            }

            var remaining = devicePrice - deposit;
            if (remaining <= 0m)
            {
                InstallmentAmountTextBox.Text = string.Empty;
                InstallmentCountTextBox.Text = string.Empty;
                UpdatePlanSummary(null, null, null);
                return;
            }

            int installmentCount;
            int dueDays;
            if (WeeklyRadioButton.IsChecked == true)
            {
                installmentCount = 7;
                dueDays = 7;
            }
            else if (MonthlyRadioButton.IsChecked == true)
            {
                installmentCount = 12;
                dueDays = 30;
            }
            else
            {
                installmentCount = 1;
                dueDays = 365;
            }

            var remainingPesewas = ConvertToPesewas(remaining);
            var baseInstallmentPesewas = remainingPesewas / installmentCount;

            if (baseInstallmentPesewas <= 0)
            {
                InstallmentAmountTextBox.Text = string.Empty;
                InstallmentCountTextBox.Text = string.Empty;
                UpdatePlanSummary(null, null, null);
                return;
            }

            var installmentAmount = baseInstallmentPesewas / 100m;

            InstallmentAmountTextBox.Text = installmentAmount.ToString("0.00", CultureInfo.InvariantCulture);
            InstallmentCountTextBox.Text = installmentCount.ToString(CultureInfo.InvariantCulture);
            UpdatePlanSummary(remaining, installmentAmount, GetSelectedPaymentPlan());
            SetDefaultFirstDueDate(dueDays);
        }

        private void UpdatePlanSummary(decimal? balance, decimal? installmentAmount, string? paymentPlan)
        {
            var currency = CurrencyComboBox?.Text?.Trim().ToUpperInvariant();

            if (!balance.HasValue || !installmentAmount.HasValue || string.IsNullOrWhiteSpace(paymentPlan))
            {
                BalanceToFinanceTextBlock.Text = string.IsNullOrWhiteSpace(currency) ? "Select currency" : $"{currency} 0.00";
                EstimatedPaymentTextBlock.Text = string.IsNullOrWhiteSpace(currency) ? "Select currency" : $"{currency} 0.00 weekly";
                return;
            }

            BalanceToFinanceTextBlock.Text = $"{currency} {balance.Value:0.00}";
            EstimatedPaymentTextBlock.Text = $"{currency} {installmentAmount.Value:0.00} {paymentPlan}";
        }

        private string GetCountryCode(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return string.Empty;

            var trimmed = text.Trim();
            if (trimmed.Length == 2 && trimmed.All(char.IsLetter))
                return trimmed.ToUpperInvariant();

            var candidate = trimmed.Split('-', 2)[0].Trim();
            if (candidate.Length == 2 && candidate.All(char.IsLetter))
                return candidate.ToUpperInvariant();

            var region = CultureInfo.GetCultures(CultureTypes.SpecificCultures)
                .Select(c =>
                {
                    try { return new RegionInfo(c.Name); }
                    catch { return null; }
                })
                .Where(r => r != null)
                .Select(r => r!)
                .FirstOrDefault(r => string.Equals(r.EnglishName, trimmed, StringComparison.OrdinalIgnoreCase)
                                  || string.Equals(r.NativeName, trimmed, StringComparison.OrdinalIgnoreCase)
                                  || string.Equals(r.TwoLetterISORegionName, trimmed, StringComparison.OrdinalIgnoreCase));

            return region?.TwoLetterISORegionName ?? string.Empty;
        }

        private void InstallmentFrequency_Checked(object sender, RoutedEventArgs e)
        {
            if (_isInitializing || !IsLoaded)
                return;

            UpdateInstallmentPlan();
        }

        private void InstallmentInput_TextChanged(object sender, TextChangedEventArgs e)
        {
            if (_isInitializing || !IsLoaded)
                return;

            UpdateInstallmentPlan();
        }

        private void CurrencyComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_isInitializing || !IsLoaded)
                return;

            UpdateInstallmentPlan();
        }

        private string? ValidateRegistration()
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(DeviceSerialTextBox.Text))
                errors.Add("Enter a device serial number.");

            if (string.IsNullOrWhiteSpace(ManufacturerTextBox.Text))
                errors.Add("Enter the device manufacturer.");

            if (string.IsNullOrWhiteSpace(ModelTextBox.Text))
                errors.Add("Enter the device model.");

            if (string.IsNullOrWhiteSpace(HardwareFingerprintTextBox.Text))
                errors.Add("Enter the hardware fingerprint.");

            if (string.IsNullOrWhiteSpace(CustomerFirstNameTextBox.Text))
                errors.Add("Enter the customer first name.");

            if (string.IsNullOrWhiteSpace(CustomerLastNameTextBox.Text))
                errors.Add("Enter the customer last name.");

            if (!string.IsNullOrWhiteSpace(CustomerEmailTextBox.Text) && !Regex.IsMatch(CustomerEmailTextBox.Text.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                errors.Add("Enter a valid customer email address.");

            if (string.IsNullOrWhiteSpace(DepositTextBox.Text) && string.IsNullOrWhiteSpace(DevicePriceTextBox.Text))
                errors.Add("Enter the device price and deposit values.");

            if (string.IsNullOrWhiteSpace(CountryComboBox.Text))
                errors.Add("Choose a country.");

            if (!decimal.TryParse(DevicePriceTextBox.Text.Trim(), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var devicePrice) || devicePrice <= 0)
                errors.Add("Enter a valid device price.");

            if (!decimal.TryParse(DepositTextBox.Text.Trim(), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var deposit) || deposit < 0)
                errors.Add("Enter a valid deposit amount.");

            if (!decimal.TryParse(InstallmentAmountTextBox.Text.Trim(), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var installmentAmount) || installmentAmount <= 0)
                errors.Add("Enter a valid installment amount.");

            if (!int.TryParse(InstallmentCountTextBox.Text.Trim(), out var installmentCount) || installmentCount <= 0)
                errors.Add("Enter a valid installment count.");

            if (!FirstDueDatePicker.SelectedDate.HasValue)
                errors.Add("Choose a first due date.");

            if (errors.Count == 0 && deposit > devicePrice)
                errors.Add("Deposit cannot exceed the device price.");

            if (errors.Count == 0 && FirstDueDatePicker.SelectedDate.HasValue && FirstDueDatePicker.SelectedDate.Value.Date < DateTime.Today)
                errors.Add("First due date cannot be in the past.");

            if (errors.Count == 0)
            {
                var currency = CurrencyComboBox.Text.Trim();
                if (string.IsNullOrWhiteSpace(currency))
                    errors.Add("Choose a currency.");
            }

            return errors.Count == 0 ? null : errors[0];
        }

        private static bool IsDuplicateDeviceError(HttpStatusCode statusCode, string body)
        {
            return statusCode == HttpStatusCode.Conflict
                || body.Contains("DEVICE_ALREADY_EXISTS", StringComparison.OrdinalIgnoreCase)
                || body.Contains("\"code\":\"CONFLICT\"", StringComparison.OrdinalIgnoreCase)
                || body.Contains("already exists", StringComparison.OrdinalIgnoreCase);
        }

        private string BuildDealerReference(string? dealerEmail, string? dealerName)
        {
            var seed = string.Join("|", new[]
            {
                dealerEmail ?? string.Empty,
                dealerName ?? string.Empty,
                Environment.MachineName
            });

            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(seed));
            return new Guid(hash.Take(16).ToArray()).ToString();
        }

        private void RegenerateDeviceIdentityFields()
        {
            DeviceSerialTextBox.Text = GenerateDeviceSerialNumber();
            HardwareFingerprintTextBox.Text = GenerateHardwareFingerprint();
        }

        private string GenerateDeviceSerialNumber()
        {
            var seed = $"{Environment.MachineName}|{Environment.UserName}|{Environment.OSVersion.VersionString}|{DateTime.UtcNow:yyyyMMddHHmmssfff}|{Guid.NewGuid():N}";
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(seed));
            return $"PC-{Convert.ToHexString(hash).Substring(0, 16).ToUpperInvariant()}";
        }

        private string GenerateHardwareFingerprint()
        {
            return HardwareIdentifier.GetStableFingerprint();
        }

        private string GetManufacturer()
        {
            return RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? "Microsoft Corporation" : "Unknown Manufacturer";
        }

        private string GetModel()
        {
            return RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                ? $"Windows PC ({Environment.OSVersion.VersionString})"
                : "Unknown Model";
        }

        private string GetMacAddress()
        {
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus != OperationalStatus.Up)
                    continue;

                var address = nic.GetPhysicalAddress();
                if (address == null || address.GetAddressBytes().Length == 0)
                    continue;

                return string.Join("-", address.GetAddressBytes().Select(b => b.ToString("X2")));
            }

            return "00-00-00-00-00-00";
        }

        private void ShowStatus(string message, Brush color)
        {
            RegisterInfoText.Text = message;
            RegisterInfoText.Foreground = color;
        }

        private sealed class ApiResponse<T>
        {
            public T? Data { get; set; }
        }

        private sealed class CustomerData
        {
            public string Id { get; set; } = string.Empty;
        }

        private sealed class DeviceData
        {
            public string Id { get; set; } = string.Empty;
        }

        private sealed class ContractData
        {
            public string Id { get; set; } = string.Empty;
        }
    }
}
