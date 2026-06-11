using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace TokenVerifier;

public static class OfflineToken
{
    public static string Generate(string hardwareUuid, int year, int month, string secret)
    {
        if (string.IsNullOrWhiteSpace(hardwareUuid))
        {
            throw new ArgumentException("Hardware UUID is required.", nameof(hardwareUuid));
        }

        if (string.IsNullOrWhiteSpace(secret))
        {
            throw new ArgumentException("Token secret is required.", nameof(secret));
        }

        if (month < 1 || month > 12)
        {
            throw new ArgumentOutOfRangeException(nameof(month), "Month must be between 1 and 12.");
        }

        var payload = $"{hardwareUuid}{year}{month}";
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var digest = hmac.ComputeHash(payloadBytes);
        var firstEightHexChars = Convert.ToHexString(digest).Substring(0, 8);
        var numericToken = uint.Parse(firstEightHexChars, NumberStyles.HexNumber) % 100_000_000;

        return numericToken.ToString("D8", CultureInfo.InvariantCulture);
    }

    public static bool Verify(string enteredToken, string hardwareUuid, int year, int month, string secret)
    {
        var expectedToken = Generate(hardwareUuid, year, month, secret);
        return FixedTimeEquals(enteredToken, expectedToken);
    }

    public static string GenerateRelease(string hardwareUuid, string secret)
    {
        if (string.IsNullOrWhiteSpace(hardwareUuid))
        {
            throw new ArgumentException("Hardware UUID is required.", nameof(hardwareUuid));
        }

        if (string.IsNullOrWhiteSpace(secret))
        {
            throw new ArgumentException("Token secret is required.", nameof(secret));
        }

        var payload = $"{hardwareUuid}:release";
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var digest = hmac.ComputeHash(payloadBytes);
        var firstEightHexChars = Convert.ToHexString(digest).Substring(0, 8);
        var numericToken = uint.Parse(firstEightHexChars, NumberStyles.HexNumber) % 100_000_000;

        return numericToken.ToString("D8", CultureInfo.InvariantCulture);
    }

    public static bool VerifyRelease(string enteredToken, string hardwareUuid, string secret)
    {
        var expectedToken = GenerateRelease(hardwareUuid, secret);
        return FixedTimeEquals(enteredToken, expectedToken);
    }

    public static bool VerifyWithPublicKey(string enteredToken, string hardwareUuid, int year, int month, string publicKeyPem)
    {
        if (!TryParseSignedToken(enteredToken, out var payload, out var signature))
        {
            return false;
        }

        var expectedPayload = $"{hardwareUuid}{year}{month}";
        if (!FixedTimeEquals(payload, expectedPayload))
        {
            return false;
        }

        return VerifySignature(payload, signature, publicKeyPem);
    }

    public static bool VerifyReleaseWithPublicKey(string enteredToken, string hardwareUuid, string publicKeyPem)
    {
        if (!TryParseSignedToken(enteredToken, out var payload, out var signature))
        {
            return false;
        }

        var expectedPayload = $"{hardwareUuid}:release";
        if (!FixedTimeEquals(payload, expectedPayload))
        {
            return false;
        }

        return VerifySignature(payload, signature, publicKeyPem);
    }

    private static bool TryParseSignedToken(string enteredToken, out string payload, out byte[] signature)
    {
        payload = string.Empty;
        signature = Array.Empty<byte>();

        var parts = enteredToken.Split('.', 2);
        if (parts.Length != 2)
        {
            return false;
        }

        payload = parts[0];
        try
        {
            signature = Convert.FromBase64String(parts[1]);
            return signature.Length > 0;
        }
        catch
        {
            return false;
        }
    }

    private static bool VerifySignature(string payload, byte[] signature, string publicKeyPem)
    {
        try
        {
            using var rsa = RSA.Create();
            rsa.ImportFromPem(publicKeyPem);
            var payloadBytes = Encoding.UTF8.GetBytes(payload);
            return rsa.VerifyData(payloadBytes, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        }
        catch
        {
            return false;
        }
    }

    private static bool FixedTimeEquals(string left, string right)
    {
        var leftBytes = Encoding.UTF8.GetBytes(left ?? string.Empty);
        var rightBytes = Encoding.UTF8.GetBytes(right ?? string.Empty);

        return leftBytes.Length == rightBytes.Length &&
               CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
    }
}
