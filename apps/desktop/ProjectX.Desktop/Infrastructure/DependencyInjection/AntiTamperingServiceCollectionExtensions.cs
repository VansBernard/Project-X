using Microsoft.Extensions.DependencyInjection;
using ProjectX.Desktop.Services.Licensing;
using ProjectX.Desktop.Services.Storage;
using ProjectX.Desktop.Services.Tampering;

namespace ProjectX.Desktop.Infrastructure.DependencyInjection;

/// <summary>
/// Extension methods for registering anti-tampering services.
/// </summary>
public static class AntiTamperingServiceCollectionExtensions
{
    /// <summary>
    /// Adds anti-tampering detection and response services to the DI container.
    /// </summary>
    public static IServiceCollection AddAntiTamperingServices(this IServiceCollection services)
    {
        services.AddScoped<IAntiTamperingService, AntiTamperingService>();
        services.AddScoped<TamperingAwareVerificationService>();
        services.AddScoped<TamperingAwareOfflineValidationWorkflow>();
        services.AddScoped<TamperingRecoveryWorkflow>();

        return services;
    }
}
