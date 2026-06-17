using System.Text.Json;
using ProjectX.Desktop.Models;
using ProjectX.Desktop.Services.Storage;

namespace ProjectX.Desktop.Services.Licensing;

public sealed class LicenseCacheService : ILicenseCacheService
{
    private const string CacheFile = "license-cache.json";
    private readonly ILocalSecureStorage _storage;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    public LicenseCacheService(ILocalSecureStorage storage)
    {
        _storage = storage;
    }

    public Task SaveAsync(CachedLicense license, CancellationToken cancellationToken = default)
    {
        return _storage.SaveTextAsync(CacheFile, JsonSerializer.Serialize(license, _jsonOptions), cancellationToken);
    }

    public async Task<CachedLicense?> LoadAsync(CancellationToken cancellationToken = default)
    {
        var json = await _storage.LoadTextAsync(CacheFile, cancellationToken);
        return string.IsNullOrWhiteSpace(json)
            ? null
            : JsonSerializer.Deserialize<CachedLicense>(json, _jsonOptions);
    }

    public Task ClearAsync(CancellationToken cancellationToken = default)
    {
        return _storage.DeleteAsync(CacheFile, cancellationToken);
    }
}

