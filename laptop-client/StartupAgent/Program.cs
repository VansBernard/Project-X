using Microsoft.Win32;
using System.Diagnostics;
using TokenVerifier;

const string appName = "ProjectXStartupAgent";
const int checkIntervalSeconds = 30;

var options = AgentOptions.Parse(args);

if (options.InstallStartup)
{
    StartupRegistration.Install(appName, ResolveAgentExecutablePath());
    Console.WriteLine("Startup agent installed for this Windows user.");
    return;
}

if (options.UninstallStartup)
{
    StartupRegistration.Uninstall(appName);
    Console.WriteLine("Startup agent removed for this Windows user.");
    return;
}

if (options.Status)
{
    PrintStatus();
    return;
}

if (options.RunOnce)
{
    CheckAndLaunchLockScreen();
    return;
}

while (true)
{
    CheckAndLaunchLockScreen();
    Thread.Sleep(TimeSpan.FromSeconds(checkIntervalSeconds));
}

static void CheckAndLaunchLockScreen()
{
    if (DeadlineStore.IsPermanentlyReleased())
    {
        return;
    }

    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    if (!DeadlineStore.IsLocked(today))
    {
        return;
    }

    if (Process.GetProcessesByName("LockScreenApp").Length > 0)
    {
        return;
    }

    var lockScreenPath = ResolveLockScreenPath();
    if (!File.Exists(lockScreenPath))
    {
        Console.WriteLine($"Lock screen app not found: {lockScreenPath}");
        return;
    }

    Process.Start(new ProcessStartInfo
    {
        FileName = lockScreenPath,
        UseShellExecute = true
    });
}

static string ResolveLockScreenPath()
{
    var configuredPath = Environment.GetEnvironmentVariable("PROJECTX_LOCKSCREEN_PATH");
    if (!string.IsNullOrWhiteSpace(configuredPath))
    {
        return configuredPath;
    }

    var agentDir = AppContext.BaseDirectory;
    var candidatePaths = new[]
    {
        Path.Combine(agentDir, "LockScreenApp.exe"),
        Path.Combine(agentDir, "..", "LockScreenApp", "LockScreenApp.exe"),
        Path.Combine(agentDir, "..", "..", "LockScreenApp", "bin", "Debug", "net8.0-windows", "LockScreenApp.exe"),
        Path.Combine(agentDir, "..", "..", "LockScreenApp", "bin", "Release", "net8.0-windows", "LockScreenApp.exe")
    };

    foreach (var path in candidatePaths)
    {
        var fullPath = Path.GetFullPath(path);
        if (File.Exists(fullPath))
        {
            return fullPath;
        }
    }

    return Path.Combine(agentDir, "LockScreenApp.exe");
}

static string ResolveAgentExecutablePath()
{
    var exePath = Path.Combine(AppContext.BaseDirectory, "StartupAgent.exe");
    if (File.Exists(exePath))
    {
        return exePath;
    }

    var dllPath = Path.Combine(AppContext.BaseDirectory, "StartupAgent.dll");
    if (File.Exists(dllPath))
    {
        return dllPath;
    }

    return Environment.ProcessPath ?? throw new InvalidOperationException("Could not find agent path.");
}

static void PrintStatus()
{
    var deadline = DeadlineStore.GetDeadline();
    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    var lockScreenPath = ResolveLockScreenPath();

    Console.WriteLine($"Startup installed: {StartupRegistration.IsInstalled(appName)}");
    Console.WriteLine($"Today: {today:yyyy-MM-dd}");
    Console.WriteLine($"Deadline: {(deadline is null ? "not set" : deadline.Value.ToString("yyyy-MM-dd"))}");
    Console.WriteLine($"Permanently released: {DeadlineStore.IsPermanentlyReleased()}");
    Console.WriteLine($"Lock status: {(DeadlineStore.IsLocked(today) ? "LOCKED" : "UNLOCKED")}");
    Console.WriteLine($"Lock screen path: {lockScreenPath}");
}

internal sealed class AgentOptions
{
    public bool InstallStartup { get; private init; }
    public bool UninstallStartup { get; private init; }
    public bool RunOnce { get; private init; }
    public bool Status { get; private init; }

    public static AgentOptions Parse(string[] args)
    {
        return new AgentOptions
        {
            InstallStartup = args.Contains("--install-startup", StringComparer.OrdinalIgnoreCase),
            UninstallStartup = args.Contains("--uninstall-startup", StringComparer.OrdinalIgnoreCase),
            RunOnce = args.Contains("--run-once", StringComparer.OrdinalIgnoreCase),
            Status = args.Contains("--status", StringComparer.OrdinalIgnoreCase)
        };
    }
}

internal static class StartupRegistration
{
    private const string RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";

    public static void Install(string name, string executablePath)
    {
        using var key = Registry.CurrentUser.OpenSubKey(RunKeyPath, writable: true) ??
                        throw new InvalidOperationException("Could not open Windows startup registry key.");

        key.SetValue(name, $"\"{executablePath}\"", RegistryValueKind.String);
    }

    public static void Uninstall(string name)
    {
        using var key = Registry.CurrentUser.OpenSubKey(RunKeyPath, writable: true);
        key?.DeleteValue(name, throwOnMissingValue: false);
    }

    public static bool IsInstalled(string name)
    {
        using var key = Registry.CurrentUser.OpenSubKey(RunKeyPath);
        return key?.GetValue(name) is not null;
    }
}
