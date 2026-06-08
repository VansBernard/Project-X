using Microsoft.Win32;

namespace TokenVerifier;

public static class RegistrationStore
{
    private const string RegistryPath = @"Software\ProjectX\LaptopClient";
    private const string RegisteredValueName = "Registered";

    public static bool IsRegistered()
    {
        using var key = Registry.CurrentUser.OpenSubKey(RegistryPath);
        return key?.GetValue(RegisteredValueName)?.ToString() == "1";
    }

    public static void MarkRegistered()
    {
        using var key = Registry.CurrentUser.CreateSubKey(RegistryPath);
        key.SetValue(RegisteredValueName, "1", RegistryValueKind.String);
    }
}
