using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;

namespace TokenVerifier;

public static class SecureRegistry
{
    public static void SetEncryptedString(string registryPath, string valueName, string? value)
    {
        using var key = Registry.CurrentUser.CreateSubKey(registryPath);
        if (value is null)
        {
            key.DeleteValue(valueName, false);
            return;
        }

        var bytes = Encoding.UTF8.GetBytes(value);
        var encrypted = ProtectedData.Protect(bytes, null, DataProtectionScope.CurrentUser);
        key.SetValue(valueName, encrypted, RegistryValueKind.Binary);
    }

    public static string? GetEncryptedString(string registryPath, string valueName)
    {
        using var key = Registry.CurrentUser.OpenSubKey(registryPath);
        var rawValue = key?.GetValue(valueName) as byte[];
        if (rawValue is null || rawValue.Length == 0)
        {
            return null;
        }

        try
        {
            var decrypted = ProtectedData.Unprotect(rawValue, null, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(decrypted);
        }
        catch
        {
            return null;
        }
    }
}
