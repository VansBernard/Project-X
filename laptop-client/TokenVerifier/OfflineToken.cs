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

    private static bool FixedTimeEquals(string left, string right)
    {
        var leftBytes = Encoding.UTF8.GetBytes(left ?? string.Empty);
        var rightBytes = Encoding.UTF8.GetBytes(right ?? string.Empty);

        return leftBytes.Length == rightBytes.Length &&
               CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
    }
}
