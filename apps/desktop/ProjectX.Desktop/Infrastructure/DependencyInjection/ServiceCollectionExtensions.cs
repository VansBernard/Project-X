using Microsoft.Extensions.DependencyInjection;
using ProjectX.Desktop.Services.Device;
using ProjectX.Desktop.Services.Licensing;
using ProjectX.Desktop.Services.Storage;
using ProjectX.Desktop.ViewModels;

namespace ProjectX.Desktop.Infrastructure.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddOfflineLicenseValidation(this IServiceCollection services)
    {
        services.AddSingleton<ILocalSecureStorage, ProtectedFileStorage>();
        services.AddSingleton<IDeviceIdentityService, LocalDeviceIdentityService>();
        services.AddSingleton<ILicenseCacheService, LicenseCacheService>();
        services.AddSingleton<LicenseVerificationService>();
        services.AddSingleton<OfflineLicenseValidationWorkflow>();
        services.AddTransient<OfflineLicenseViewModel>();

        return services;
    }
}

