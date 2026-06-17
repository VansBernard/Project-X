using ProjectX.Desktop.Models;

namespace ProjectX.Desktop.Services.Device;

public interface IDeviceIdentityService
{
    Task<DeviceIdentity> GetDeviceIdentityAsync(CancellationToken cancellationToken = default);
}

