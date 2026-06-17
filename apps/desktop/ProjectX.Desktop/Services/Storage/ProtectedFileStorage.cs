using System.Security.Cryptography;
using System.Text;

namespace ProjectX.Desktop.Services.Storage;

public sealed class ProtectedFileStorage : ILocalSecureStorage
{
    private readonly string _root;

    public ProtectedFileStorage()
    {
        _root = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            "SecureStore");
    }

    public async Task SaveTextAsync(string name, string value, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(_root);
        var path = PathFor(name);
        var bytes = Encoding.UTF8.GetBytes(value);
        var protectedBytes = ProtectedData.Protect(bytes, null, DataProtectionScope.CurrentUser);
        await File.WriteAllBytesAsync(path, protectedBytes, cancellationToken);
    }

    public async Task<string?> LoadTextAsync(string name, CancellationToken cancellationToken = default)
    {
        var path = PathFor(name);
        if (!File.Exists(path))
        {
            return null;
        }

        var protectedBytes = await File.ReadAllBytesAsync(path, cancellationToken);
        var bytes = ProtectedData.Unprotect(protectedBytes, null, DataProtectionScope.CurrentUser);
        return Encoding.UTF8.GetString(bytes);
    }

    public Task DeleteAsync(string name, CancellationToken cancellationToken = default)
    {
        var path = PathFor(name);
        if (File.Exists(path))
        {
            File.Delete(path);
        }

        return Task.CompletedTask;
    }

    private string PathFor(string name)
    {
        var safeName = string.Concat(name.Where(character => char.IsLetterOrDigit(character) || character is '.' or '-' or '_'));
        return Path.Combine(_root, safeName);
    }
}

