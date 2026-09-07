using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Threading.Tasks;
using System.Windows.Threading;

namespace DesktopAppFresh
{
    public partial class App : Application
    {
        private const int MaxInvalidTimeDetectionsBeforeLock = 5;
        private readonly DispatcherTimer _timeMonitor = new() { Interval = TimeSpan.FromSeconds(3) };
        private bool _timeCorrectionShown;
        private bool _timeCheckInProgress;
        private static int _timeViolationCount;

        public static int TimeViolationCount => _timeViolationCount;

        public static void ResetTimeViolationState()
        {
            _timeViolationCount = 0;
        }

        public static void RegisterTimeViolation()
        {
            _timeViolationCount++;
        }

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            var allArgs = e.Args ?? Array.Empty<string>();
            if (AppWatchdog.IsWatchdogMode(allArgs))
            {
                AppHealthMonitor.StartHeartbeat(allArgs);
                AppWatchdog.RunWatchdogLoop();
                Shutdown();
                return;
            }

            // Do not auto-register for Windows startup or self-restart by default.
            // This prevents reboot loops and duplicate app instances after machine restart.
            AppWatchdog.EnsureRunning(allArgs);
            AppWatchdog.EnsureRegisteredForStartup();
            AuthService.LoadTokens();
            AppHealthMonitor.StartHeartbeat(allArgs);

            var integrity = AppIntegrityMonitor.CheckStartupIntegrity();
            if (!integrity.IsValid)
            {
                AppNavigator.Instance.ShowTimeCorrection(
                    integrity.Message,
                    () =>
                    {
                        AppNavigator.Instance.ShowStartup();
                    });
                return;
            }

            var timeValidation = AntiTamperingService.ValidateAndRecord();
            if (!timeValidation.IsValid)
            {
                _timeCorrectionShown = true;
                AppNavigator.Instance.ShowTimeCorrection(timeValidation.Message,
                    () =>
                    {
                        _timeCorrectionShown = false;
                        ResetTimeViolationState();
                        AppNavigator.Instance.ShowStartup();
                        StartTimeMonitor();
                    });
                return;
            }

            ResetTimeViolationState();
            StartTimeMonitor();

            // Perform OS security baseline check on first startup
            PerformSecurityBaseline();

            if (allArgs.Any(arg => string.Equals(arg, "--open-lock-screen", StringComparison.OrdinalIgnoreCase)))
            {
                var deviceId = GetArgValue(allArgs, "--device-id") ?? "direct-start-device";
                var contractId = GetArgValue(allArgs, "--contract-id") ?? "direct-start-contract";
                AppNavigator.Instance.ShowLock(deviceId, contractId);
                return;
            }

            if (allArgs.Any(arg => string.Equals(arg, "--open-dashboard", StringComparison.OrdinalIgnoreCase)))
            {
                var deviceId = GetArgValue(allArgs, "--device-id") ?? "direct-start-device";
                var contractId = GetArgValue(allArgs, "--contract-id") ?? "direct-start-contract";
                AppNavigator.Instance.ShowDashboard(deviceId, contractId);
                return;
            }

            var hasRegisteredDevice = AuthService.HasDeviceContext
                && !string.IsNullOrWhiteSpace(AuthService.DeviceId)
                && !string.IsNullOrWhiteSpace(AuthService.ContractId);

            if (hasRegisteredDevice)
            {
                AppNavigator.Instance.ShowDashboard(AuthService.DeviceId, AuthService.ContractId);
                return;
            }

            AppNavigator.Instance.ShowStartup();
        }

        private void StartTimeMonitor()
        {
            _timeMonitor.Tick += TimeMonitor_Tick;
            _timeMonitor.Start();
        }

        private async void TimeMonitor_Tick(object? sender, EventArgs e)
        {
            if (_timeCheckInProgress || _timeCorrectionShown || TimeCorrectionWindow.IsOpen || LockWindow.IsOpen) return;

            _timeCheckInProgress = true;
            try
            {
                var validation = await Task.Run(AntiTamperingService.ValidateAndRecord);
                if (validation.IsValid)
                {
                    ResetTimeViolationState();
                    return;
                }

                RegisterTimeViolation();
                if (TimeViolationCount >= MaxInvalidTimeDetectionsBeforeLock)
                {
                    if (!LockWindow.IsOpen)
                    {
                        AppNavigator.Instance.ShowLock();
                    }
                    return;
                }

                if (!_timeCorrectionShown && !TimeCorrectionWindow.IsOpen)
                {
                    _timeCorrectionShown = true;
                    AppNavigator.Instance.ShowTimeCorrection(validation.Message,
                        () =>
                        {
                            _timeCorrectionShown = false;
                            ResetTimeViolationState();
                        });
                }
            }
            finally
            {
                _timeCheckInProgress = false;
            }
        }

        private static string? GetArgValue(string[] args, string argName)
        {
            for (var i = 0; i < args.Length; i++)
            {
                if (string.Equals(args[i], argName, StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                {
                    return args[i + 1];
                }
            }

            return null;
        }

        private void PerformSecurityBaseline()
        {
            try
            {
                // Check current OS security posture
                var securityCheck = SystemSecurityMonitor.Check();

                // Log security information
                Console.WriteLine(SystemSecurityMonitor.FormatReport(securityCheck));

                // Report critical security issues to backend asynchronously
                if (securityCheck.Warnings.Any(w => w.Severity == SystemSecurityMonitor.SecuritySeverity.Critical))
                {
                    var criticalWarnings = securityCheck.Warnings.Where(w => w.Severity == SystemSecurityMonitor.SecuritySeverity.Critical).ToList();
                    ReportSecurityIncidentsAsync(criticalWarnings);
                }

                // Save baseline for future regression detection
                SystemSecurityMonitor.SaveBaseline();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[App.PerformSecurityBaseline] Error during security check: {ex.Message}");
            }
        }

        private async void ReportSecurityIncidentsAsync(List<SystemSecurityMonitor.SecurityWarning> warnings)
        {
            try
            {
                var apiClient = new DesktopApiClient();

                foreach (var warning in warnings)
                {
                    await apiClient.ReportTamperEventAsync(
                        "SECURITY_INCIDENT",
                        $"OS Security Alert: {warning.Title} - {warning.Message}",
                        DateTime.UtcNow,
                        source: "security-monitor",
                        deviceId: AuthService.DeviceId,
                        contractId: AuthService.ContractId
                    );
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[App.ReportSecurityIncidentsAsync] Failed to report security incidents: {ex.Message}");
            }
        }
    }
}
