using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace LockScreenApp;

/// <summary>
/// Provides DPAPI-based encryption for locally storing sensitive data.
/// Encryption is scoped to the current user and machine.
/// </summary>
public static class SecureStorage
{
    private static readonly string StorageDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "ProjectX",
        "LaptopClient",
        "Secure");

    static SecureStorage()
    {
        try
        {
            Directory.CreateDirectory(StorageDirectory);
        }
        catch (Exception ex)
        {
            ClientLogger.LogError("Failed to create secure storage directory", ex);
        }
    }

    /// <summary>
    /// Encrypts and stores a value securely using DPAPI.
    /// </summary>
    public static void StoreSecure(string key, string value)
    {
        try
        {
            var plainBytes = Encoding.UTF8.GetBytes(value);
            var encryptedBytes = ProtectedData.Protect(
                plainBytes,
                null,
                DataProtectionScope.CurrentUser);

            var filePath = GetStoragePath(key);
            File.WriteAllBytes(filePath, encryptedBytes);
            ClientLogger.LogInfo($"Stored secure value for key: {key}");
        }
        catch (Exception ex)
        {
            ClientLogger.LogError($"Failed to store secure value for key {key}", ex);
        }
    }

    /// <summary>
    /// Retrieves and decrypts a value from secure storage.
    /// Returns null if the key does not exist or decryption fails.
    /// </summary>
    public static string? RetrieveSecure(string key)
    {
        try
        {
            var filePath = GetStoragePath(key);
            if (!File.Exists(filePath))
            {
                return null;
            }

            var encryptedBytes = File.ReadAllBytes(filePath);
            var plainBytes = ProtectedData.Unprotect(
                encryptedBytes,
                null,
                DataProtectionScope.CurrentUser);

            return Encoding.UTF8.GetString(plainBytes);
        }
        catch (Exception ex)
        {
            ClientLogger.LogError($"Failed to retrieve secure value for key {key}", ex);
            return null;
        }
    }

    /// <summary>
    /// Deletes a stored secure value.
    /// </summary>
    public static void DeleteSecure(string key)
    {
        try
        {
            var filePath = GetStoragePath(key);
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                ClientLogger.LogInfo($"Deleted secure value for key: {key}");
            }
        }
        catch (Exception ex)
        {
            ClientLogger.LogError($"Failed to delete secure value for key {key}", ex);
        }
    }

    private static string GetStoragePath(string key)
    {
        var safeName = Convert.ToBase64String(Encoding.UTF8.GetBytes(key))
            .Replace('/', '_')
            .Replace('+', '-');
        return Path.Combine(StorageDirectory, $"{safeName}.sec");
    }
}
