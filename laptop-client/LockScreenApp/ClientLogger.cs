using System;
using System.IO;
using System.Text;
using System.Threading;

namespace LockScreenApp;

internal static class ClientLogger
{
    private static readonly string LogDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "ProjectX",
        "LaptopClient",
        "Logs");

    private static readonly string LogFilePath = Path.Combine(LogDirectory, "client.log");
    private static readonly SemaphoreSlim FileLock = new(1, 1);

    public static void LogInfo(string message)
    {
        WriteLog("INFO", message);
    }

    public static void LogWarning(string message)
    {
        WriteLog("WARN", message);
    }

    public static void LogError(string message, Exception? exception = null)
    {
        var text = string.IsNullOrWhiteSpace(message) ? string.Empty : message;
        if (exception != null)
        {
            text += Environment.NewLine + exception;
        }

        WriteLog("ERROR", text);
    }

    private static void WriteLog(string level, string message)
    {
        try
        {
            Directory.CreateDirectory(LogDirectory);
            var line = $"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff}][{level}] {message}";
            FileLock.Wait();
            File.AppendAllText(LogFilePath, line + Environment.NewLine, Encoding.UTF8);
        }
        catch
        {
            // Silently ignore logging failures so the client remains usable.
        }
        finally
        {
            FileLock.Release();
        }
    }
}
