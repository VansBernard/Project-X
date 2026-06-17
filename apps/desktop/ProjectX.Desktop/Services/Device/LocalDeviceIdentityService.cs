using System.Security.Cryptography;
using System.Text;
using ProjectX.Desktop.Models;
using ProjectX.Desktop.Services.Storage;

namespace ProjectX.Desktop.Services.Device;

public sealed class LocalDeviceIdentityService : IDeviceIdentityService
{
    private const string DeviceIdentityFile = "device-identity.json";
    private readonly ILocalSecureStorage _storage;

    public LocalDeviceIdentityService(ILocalSecureStorage storage)
    {
        _storage = storage;
    }

    public async Task<DeviceIdentity> GetDeviceIdentityAsync(CancellationToken cancellationToken = default)
    {
        var json = await _storage.LoadTextAsync(DeviceIdentityFile, cancellationToken);
        if (!string.IsNullOrWhiteSpace(json))
        {
            var identity = System.Text.Json.JsonSerializer.Deserialize<DeviceIdentity>(json);
            if (identity is not null)
            {
                return identity;
            }
        }

        var deviceId = StableMachineHash();

        // Contract assignment is expected to be written during online registration/sync.
        var created = new DeviceIdentity(deviceId, string.Empty);
        await _storage.SaveTextAsync(
            DeviceIdentityFile,
            System.Text.Json.JsonSerializer.Serialize(created),
            cancellationToken);

        return created;
    }

    private static string StableMachineHash()
    {
        var source = $"{Environment.MachineName}|{Environment.UserDomainName}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(source));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

