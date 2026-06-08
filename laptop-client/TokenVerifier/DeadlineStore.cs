using Microsoft.Win32;

namespace TokenVerifier;

public static class DeadlineStore
{
    private const string RegistryPath = @"Software\ProjectX\LaptopClient";
    private const string DeadlineValueName = "AccessDeadline";
    private const string ReleasedValueName = "PermanentlyReleased";

    public static DateOnly? GetDeadline()
    {
        using var key = Registry.CurrentUser.OpenSubKey(RegistryPath);
        var rawValue = key?.GetValue(DeadlineValueName)?.ToString();

        return DateOnly.TryParse(rawValue, out var deadline) ? deadline : null;
    }

    public static void SetDeadline(DateOnly deadline)
    {
        using var key = Registry.CurrentUser.CreateSubKey(RegistryPath);
        key.SetValue(DeadlineValueName, deadline.ToString("yyyy-MM-dd"), RegistryValueKind.String);
    }

    public static bool IsPermanentlyReleased()
    {
        using var key = Registry.CurrentUser.OpenSubKey(RegistryPath);
        return key?.GetValue(ReleasedValueName)?.ToString() == "1";
    }

    public static void PermanentlyRelease()
    {
        using var key = Registry.CurrentUser.CreateSubKey(RegistryPath);
        key.SetValue(ReleasedValueName, "1", RegistryValueKind.String);
    }

    public static bool IsLocked(DateOnly today)
    {
        if (IsPermanentlyReleased())
        {
            return false;
        }

        var deadline = GetDeadline();
        return deadline is null || today > deadline.Value;
    }
}
