using Microsoft.Win32;

namespace TokenVerifier;

public static class DeadlineStore
{
    private const string RegistryPath = @"Software\ProjectX\LaptopClient";
    private const string DeadlineValueName = "AccessDeadline";
    private const string ReleasedValueName = "PermanentlyReleased";

    public static DateOnly? GetDeadline()
    {
        var rawValue = SecureRegistry.GetEncryptedString(RegistryPath, DeadlineValueName);
        return DateOnly.TryParse(rawValue, out var deadline) ? deadline : null;
    }

    public static void SetDeadline(DateOnly deadline)
    {
        SecureRegistry.SetEncryptedString(RegistryPath, DeadlineValueName, deadline.ToString("yyyy-MM-dd"));
    }

    public static bool IsPermanentlyReleased()
    {
        return SecureRegistry.GetEncryptedString(RegistryPath, ReleasedValueName) == "1";
    }

    public static void PermanentlyRelease()
    {
        SecureRegistry.SetEncryptedString(RegistryPath, ReleasedValueName, "1");
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
