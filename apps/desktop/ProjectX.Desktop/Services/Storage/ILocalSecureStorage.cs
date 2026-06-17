namespace ProjectX.Desktop.Services.Storage;

public interface ILocalSecureStorage
{
    Task SaveTextAsync(string name, string value, CancellationToken cancellationToken = default);

    Task<string?> LoadTextAsync(string name, CancellationToken cancellationToken = default);

    Task DeleteAsync(string name, CancellationToken cancellationToken = default);
}

