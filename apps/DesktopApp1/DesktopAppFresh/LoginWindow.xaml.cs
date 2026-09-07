using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Media;

namespace DesktopAppFresh
{
    public partial class LoginWindow : Window
    {
        public LoginWindow()
        {
            InitializeComponent();

            if (AuthService.LoadTokens())
            {
                UsernameTextBox.Text = AuthService.DealerName ?? string.Empty;
                EmailTextBox.Text = AuthService.DealerEmail ?? string.Empty;
            }

            UsernameTextBox.TextChanged += (_, _) => UpdatePlaceholders();
            EmailTextBox.TextChanged += (_, _) => UpdatePlaceholders();
            PasswordInput.PasswordChanged += (_, _) => UpdatePlaceholders();
            PasswordVisibleTextBox.TextChanged += (s, e) =>
            {
                if (PasswordVisibleTextBox.IsVisible)
                {
                    PasswordInput.Password = PasswordVisibleTextBox.Text;
                }

                UpdatePlaceholders();
            };

            UpdatePlaceholders();
        }

        private void UpdatePlaceholders()
        {
            UsernamePlaceholderText.Visibility = string.IsNullOrWhiteSpace(UsernameTextBox.Text)
                ? Visibility.Visible
                : Visibility.Collapsed;
            EmailPlaceholderText.Visibility = string.IsNullOrWhiteSpace(EmailTextBox.Text)
                ? Visibility.Visible
                : Visibility.Collapsed;

            var password = PasswordVisibleTextBox.IsVisible
                ? PasswordVisibleTextBox.Text
                : PasswordInput.Password;
            PasswordPlaceholderText.Visibility = string.IsNullOrWhiteSpace(password)
                ? Visibility.Visible
                : Visibility.Collapsed;
        }

        private void TogglePasswordVisibility_Click(object sender, RoutedEventArgs e)
        {
            var isVisible = PasswordVisibleTextBox.Visibility == Visibility.Visible;
            PasswordVisibleTextBox.Visibility = isVisible ? Visibility.Collapsed : Visibility.Visible;
            PasswordInput.Visibility = isVisible ? Visibility.Visible : Visibility.Collapsed;

            if (!isVisible)
            {
                PasswordVisibleTextBox.Text = PasswordInput.Password;
            }
            else
            {
                PasswordInput.Password = PasswordVisibleTextBox.Text;
            }
        }

        private static void LogLoginDebug(string message)
        {
            try
            {
                var logDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ProjectX", "logs");
                Directory.CreateDirectory(logDirectory);
                var logPath = Path.Combine(logDirectory, "login-debug.txt");
                File.AppendAllText(logPath, $"{DateTime.UtcNow:O} - {message}{Environment.NewLine}");
            }
            catch
            {
                // Ignore logging failures.
            }
        }

        private async void LoginBtn_Click(object sender, RoutedEventArgs e)
        {
            var timeValidation = AntiTamperingService.ValidateAndRecord();
            if (!timeValidation.IsValid)
            {
                AppNavigator.Instance.ShowTimeCorrection(timeValidation.Message);
                return;
            }

            if (string.IsNullOrWhiteSpace(UsernameTextBox.Text) ||
                !Regex.IsMatch(EmailTextBox.Text.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$") ||
                string.IsNullOrWhiteSpace(PasswordInput.Password))
            {
                LoginInfoText.Text = "Enter your dealer name, a valid email address, and password.";
                LoginInfoText.Foreground = Brushes.IndianRed;
                return;
            }

            LoginBtn.IsEnabled = false;
            LoginInfoText.Text = "Logging in...";
            LoginInfoText.Foreground = Brushes.SteelBlue;

            try
            {
                var dealerSlug = NormalizeSlug(UsernameTextBox.Text.Trim());
                LogLoginDebug($"Starting login for dealerSlug={dealerSlug}, email={EmailTextBox.Text.Trim()}");

                var loginResult = await AuthService.LoginAsync(dealerSlug, EmailTextBox.Text.Trim(), PasswordInput.Password);
                LogLoginDebug($"AuthService.LoginAsync returned tokens. Access token length={loginResult.AccessToken?.Length ?? 0}, refresh token length={loginResult.RefreshToken?.Length ?? 0}");

                AuthService.SetSessionData(dealerSlug, UsernameTextBox.Text.Trim(), EmailTextBox.Text.Trim());
                LogLoginDebug("AuthService.SetSessionData completed.");

                LoginInfoText.Text = "Login successful. Opening device registration...";
                LoginInfoText.Foreground = Brushes.ForestGreen;

                await System.Threading.Tasks.Task.Delay(400);
                LogLoginDebug("Opening RegistrationWindow through navigator.");
                AppNavigator.Instance.ShowRegistration(EmailTextBox.Text.Trim(), UsernameTextBox.Text.Trim());
                LogLoginDebug("RegistrationWindow shown via navigator.");
                Close();
            }
            catch (Exception ex)
            {
                LogLoginDebug($"Login failed exception: {ex}");

                var logDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ProjectX", "logs");
                Directory.CreateDirectory(logDirectory);
                File.AppendAllText(Path.Combine(logDirectory, "login-errors.txt"), $"{DateTime.UtcNow:O} - Login failed: {ex}{Environment.NewLine}");

                LoginInfoText.Text = $"Login failed: {ex.Message}";
                LoginInfoText.Foreground = Brushes.IndianRed;
                LoginBtn.IsEnabled = true;
            }
        }

        private static string NormalizeSlug(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            var lower = value.Trim().ToLowerInvariant();
            var builder = new System.Text.StringBuilder();

            foreach (var ch in lower)
            {
                if (char.IsLetterOrDigit(ch) || ch == '-')
                {
                    builder.Append(ch);
                }
                else if (char.IsWhiteSpace(ch) || ch == '_' || ch == '.')
                {
                    if (builder.Length > 0 && builder[^1] != '-')
                    {
                        builder.Append('-');
                    }
                }
            }

            var result = builder.ToString().Trim('-');
            return result.Length == 0 ? lower.Replace(' ', '-') : result;
        }
    }
}
