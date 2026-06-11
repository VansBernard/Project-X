using Microsoft.Win32;

namespace TokenVerifier;

public static class RegistrationStore
{
    private const string RegistryPath = @"Software\ProjectX\LaptopClient";
    private const string RegisteredValueName = "Registered";
    private const string PaymentUrlValueName = "PaymentUrl";

    public static bool IsRegistered()
    {
        return SecureRegistry.GetEncryptedString(RegistryPath, RegisteredValueName) == "1";
    }

    public static string? GetPaymentUrl()
    {
        return SecureRegistry.GetEncryptedString(RegistryPath, PaymentUrlValueName);
    }

    public static void MarkRegistered(string paymentUrl)
    {
        SecureRegistry.SetEncryptedString(RegistryPath, RegisteredValueName, "1");
        if (!string.IsNullOrWhiteSpace(paymentUrl))
        {
            SecureRegistry.SetEncryptedString(RegistryPath, PaymentUrlValueName, paymentUrl.Trim());
        }
    }
}
