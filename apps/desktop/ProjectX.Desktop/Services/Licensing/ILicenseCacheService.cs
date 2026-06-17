using ProjectX.Desktop.Models;

namespace ProjectX.Desktop.Services.Licensing;

public interface ILicenseCacheService
{
    Task SaveAsync(CachedLicense license, CancellationToken cancellationToken = default);

    Task<CachedLicense?> LoadAsync(CancellationToken cancellationToken = default);

    Task ClearAsync(CancellationToken cancellationToken = default);
}

