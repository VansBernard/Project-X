using System;
using System.Security.Cryptography;
using System.Text;
using TokenVerifier;
using Xunit;

namespace LockScreenApp.Tests;

public class OfflineTokenTests
{
    [Fact]
    public void GenerateAndVerifyToken_ReturnsTrue()
    {
        var hardwareUuid = "TEST-HARDWARE-UUID";
        var secret = "super-secret-key-1234567890";
        var code = OfflineToken.Generate(hardwareUuid, 2026, 6, secret);

        Assert.True(OfflineToken.Verify(code, hardwareUuid, 2026, 6, secret));
    }

    [Fact]
    public void GenerateAndVerifyReleaseToken_ReturnsTrue()
    {
        var hardwareUuid = "TEST-HARDWARE-UUID";
        var secret = "another-super-secret-key";
        var code = OfflineToken.GenerateRelease(hardwareUuid, secret);

        Assert.True(OfflineToken.VerifyRelease(code, hardwareUuid, secret));
    }

    [Fact]
    public void VerifyWithPublicKey_ReturnsTrue_ForSignedToken()
    {
        var hardwareUuid = "TEST-HARDWARE-UUID";
        var year = 2026;
        var month = 6;
        var payload = $"{hardwareUuid}{year}{month}";

        using var rsa = RSA.Create(2048);
        var signature = rsa.SignData(Encoding.UTF8.GetBytes(payload), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        var publicKeyPem = ExportPublicKeyPem(rsa);
        var token = $"{payload}.{Convert.ToBase64String(signature)}";

        Assert.True(OfflineToken.VerifyWithPublicKey(token, hardwareUuid, year, month, publicKeyPem));
    }

    private static string ExportPublicKeyPem(RSA rsa)
    {
        var publicKeyBytes = rsa.ExportSubjectPublicKeyInfo();
        var publicKeyBase64 = Convert.ToBase64String(publicKeyBytes);
        var builder = new StringBuilder();
        builder.AppendLine("-----BEGIN PUBLIC KEY-----");
        for (var index = 0; index < publicKeyBase64.Length; index += 64)
        {
            builder.AppendLine(publicKeyBase64[index..Math.Min(index + 64, publicKeyBase64.Length)]);
        }
        builder.AppendLine("-----END PUBLIC KEY-----");
        return builder.ToString();
    }
}
