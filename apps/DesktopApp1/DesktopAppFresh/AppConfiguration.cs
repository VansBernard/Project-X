using System;
using System.Collections.Generic;
using System.IO;
using System.Xml.Linq;

namespace DesktopAppFresh
{
    /// <summary>
    /// Centralized application configuration management.
    /// Loads settings from app.config with environment variable overrides.
    /// </summary>
    public static class AppConfiguration
    {
        private static XDocument? _configDocument;
        private static readonly Dictionary<string, string> _cache = new();

        // API Configuration
        public static string ApiBaseUrl => GetConfigValue("ApiConfiguration/BaseUrl", "http://localhost:4000/api/v1");
        public static int ApiTimeoutSeconds => GetConfigInt("ApiConfiguration/TimeoutSeconds", 30);
        public static int ApiRetryAttempts => GetConfigInt("ApiConfiguration/RetryAttempts", 3);

        // Storage Configuration
        public static string AppDataDirectory => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "ProjectX", 
            "DesktopApp");

        public static string TokenStoragePath => Path.Combine(AppDataDirectory, "auth.json");
        public static string LogDirectory => Path.Combine(AppDataDirectory, "logs");
        public static string CacheDirectory => Path.Combine(AppDataDirectory, "cache");

        // Token Configuration
        public static byte[] TokenEntropy => System.Text.Encoding.UTF8.GetBytes("ProjectXAuthTokenEntropy2026");
        public static int TokenRefreshBufferSeconds => GetConfigInt("TokenConfiguration/RefreshBufferSeconds", 300);

        // Watchdog Configuration
        public static int WatchdogHeartbeatIntervalSeconds => GetConfigInt("WatchdogConfiguration/HeartbeatIntervalSeconds", 5);
        public static int WatchdogHeartbeatTimeoutSeconds => GetConfigInt("WatchdogConfiguration/HeartbeatTimeoutSeconds", 15);
        public static bool WatchdogEnabled => GetConfigBool("WatchdogConfiguration/Enabled", true);

        // Anti-Tampering Configuration
        public static int AllowedClockBackwardDriftSeconds => GetConfigInt("AntiTamperingConfiguration/AllowedClockBackwardDriftSeconds", 60);
        public static bool AntiTamperingEnabled => GetConfigBool("AntiTamperingConfiguration/Enabled", true);

        // Dashboard Configuration
        public static int DashboardRefreshIntervalSeconds => GetConfigInt("DashboardConfiguration/RefreshIntervalSeconds", 1);
        public static int CancellationCheckIntervalSeconds => GetConfigInt("DashboardConfiguration/CancellationCheckIntervalSeconds", 10);

        // UI Configuration
        public static int TimeMonitorIntervalSeconds => GetConfigInt("UIConfiguration/TimeMonitorIntervalSeconds", 3);
        public static int TimeCorrectionRetryIntervalSeconds => GetConfigInt("UIConfiguration/TimeCorrectionRetryIntervalSeconds", 3);

        // Logging Configuration
        public static bool LoggingEnabled => GetConfigBool("LoggingConfiguration/Enabled", true);
        public static string LogLevel => GetConfigValue("LoggingConfiguration/Level", "Info");
        public static int LogRetentionDays => GetConfigInt("LoggingConfiguration/RetentionDays", 30);
        public static long MaxLogFileSizeBytes => GetConfigLong("LoggingConfiguration/MaxFileSizeBytes", 10485760); // 10 MB

        // Recovery Configuration
        public static int RecoveryWindowHours => GetConfigInt("RecoveryConfiguration/WindowHours", 36);
        public static int MaxRecoveryAttempts => GetConfigInt("RecoveryConfiguration/MaxAttempts", 2);

        // App Behavior
        public static bool EnableAutoUpdate => GetConfigBool("AppBehavior/EnableAutoUpdate", false);
        public static string UpdateCheckUrl => GetConfigValue("AppBehavior/UpdateCheckUrl", "");
        public static bool MinimizeToTray => GetConfigBool("AppBehavior/MinimizeToTray", true);

        /// <summary>
        /// Initialize configuration system. Call once at app startup.
        /// </summary>
        public static void Initialize()
        {
            try
            {
                _cache.Clear();
                var configPath = GetConfigFilePath();
                
                if (File.Exists(configPath))
                {
                    _configDocument = XDocument.Load(configPath);
                }
                else
                {
                    // Create default configuration if not exists
                    CreateDefaultConfiguration(configPath);
                    _configDocument = XDocument.Load(configPath);
                }

                // Ensure directories exist
                CreateRequiredDirectories();
            }
            catch (Exception ex)
            {
                // Log error but don't fail - use defaults
                System.Diagnostics.Debug.WriteLine($"Configuration initialization error: {ex.Message}");
            }
        }

        private static string GetConfigFilePath()
        {
            var appPath = AppDomain.CurrentDomain.BaseDirectory;
            return Path.Combine(appPath, "app.config");
        }

        private static string GetConfigValue(string path, string defaultValue)
        {
            if (_cache.TryGetValue(path, out var cached))
                return cached;

            var value = defaultValue;

            try
            {
                // Try environment variable first (for production overrides)
                var envVar = path.Replace('/', '_').Replace(' ', '_');
                var envValue = Environment.GetEnvironmentVariable($"PROJECTX_APP_{envVar}");
                if (!string.IsNullOrWhiteSpace(envValue))
                {
                    value = envValue;
                }
                else if (_configDocument?.Root != null)
                {
                    // Try config file
                    var parts = path.Split('/');
                    var element = _configDocument.Root;
                    foreach (var part in parts)
                    {
                        element = element?.Element(part);
                        if (element == null) break;
                    }

                    if (element != null)
                    {
                        var fileValue = element.Value;
                        if (!string.IsNullOrWhiteSpace(fileValue))
                            value = fileValue;
                    }
                }
            }
            catch
            {
                // Use default on error
            }

            _cache[path] = value;
            return value;
        }

        private static int GetConfigInt(string path, int defaultValue)
        {
            var value = GetConfigValue(path, defaultValue.ToString());
            return int.TryParse(value, out var result) ? result : defaultValue;
        }

        private static long GetConfigLong(string path, long defaultValue)
        {
            var value = GetConfigValue(path, defaultValue.ToString());
            return long.TryParse(value, out var result) ? result : defaultValue;
        }

        private static bool GetConfigBool(string path, bool defaultValue)
        {
            var value = GetConfigValue(path, defaultValue.ToString());
            return bool.TryParse(value, out var result) ? result : defaultValue;
        }

        private static void CreateRequiredDirectories()
        {
            try
            {
                Directory.CreateDirectory(AppDataDirectory);
                Directory.CreateDirectory(LogDirectory);
                Directory.CreateDirectory(CacheDirectory);
            }
            catch
            {
                // Ignore directory creation errors
            }
        }

        private static void CreateDefaultConfiguration(string configPath)
        {
            try
            {
                var configDir = Path.GetDirectoryName(configPath);
                if (!string.IsNullOrWhiteSpace(configDir) && !Directory.Exists(configDir))
                {
                    Directory.CreateDirectory(configDir);
                }

                var defaultConfig = new XDocument(
                    new XElement("configuration",
                        new XElement("ApiConfiguration",
                            new XElement("BaseUrl", "http://localhost:4000/api/v1"),
                            new XElement("TimeoutSeconds", "30"),
                            new XElement("RetryAttempts", "3")
                        ),
                        new XElement("TokenConfiguration",
                            new XElement("RefreshBufferSeconds", "300")
                        ),
                        new XElement("WatchdogConfiguration",
                            new XElement("Enabled", "true"),
                            new XElement("HeartbeatIntervalSeconds", "5"),
                            new XElement("HeartbeatTimeoutSeconds", "15")
                        ),
                        new XElement("AntiTamperingConfiguration",
                            new XElement("Enabled", "true"),
                            new XElement("AllowedClockBackwardDriftSeconds", "60")
                        ),
                        new XElement("DashboardConfiguration",
                            new XElement("RefreshIntervalSeconds", "1"),
                            new XElement("CancellationCheckIntervalSeconds", "10")
                        ),
                        new XElement("UIConfiguration",
                            new XElement("TimeMonitorIntervalSeconds", "3"),
                            new XElement("TimeCorrectionRetryIntervalSeconds", "3")
                        ),
                        new XElement("LoggingConfiguration",
                            new XElement("Enabled", "true"),
                            new XElement("Level", "Info"),
                            new XElement("RetentionDays", "30"),
                            new XElement("MaxFileSizeBytes", "10485760")
                        ),
                        new XElement("RecoveryConfiguration",
                            new XElement("WindowHours", "36"),
                            new XElement("MaxAttempts", "2")
                        ),
                        new XElement("AppBehavior",
                            new XElement("EnableAutoUpdate", "false"),
                            new XElement("UpdateCheckUrl", ""),
                            new XElement("MinimizeToTray", "true")
                        )
                    )
                );

                defaultConfig.Save(configPath);
            }
            catch
            {
                // Ignore creation errors - will use hardcoded defaults
            }
        }

        /// <summary>
        /// Reload configuration from file.
        /// </summary>
        public static void Reload()
        {
            _cache.Clear();
            Initialize();
        }
    }
}
