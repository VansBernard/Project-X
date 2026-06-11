using System;
using System.Text;
using Microsoft.Win32;
using TokenVerifier;
using Xunit;

namespace LockScreenApp.Tests;

public class SecureRegistryTests : IDisposable
{
    private readonly string _registryPath;

    public SecureRegistryTests()
    {
        _registryPath = $"Software\\ProjectX\\LaptopClientTests_{Guid.NewGuid():N}";
    }

    [Fact]
    public void SetAndGetEncryptedString_ReturnsSameValue()
    {
        const string valueName = "TestValue";
        const string value = "sensitive-data";

        SecureRegistry.SetEncryptedString(_registryPath, valueName, value);
        var decrypted = SecureRegistry.GetEncryptedString(_registryPath, valueName);

        Assert.Equal(value, decrypted);
    }

    [Fact]
    public void GetEncryptedString_ReturnsNullWhenValueMissing()
    {
        var value = SecureRegistry.GetEncryptedString(_registryPath, "MissingValue");
        Assert.Null(value);
    }

    public void Dispose()
    {
        try
        {
            Registry.CurrentUser.DeleteSubKeyTree(_registryPath, false);
        }
        catch
        {
            // ignore cleanup failures
        }
    }
}
