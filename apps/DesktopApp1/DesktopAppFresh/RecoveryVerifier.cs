using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DesktopAppFresh
{
    public sealed class RecoveryVerificationResult
    {
        public bool Valid { get; set; }
        public bool SignatureValid { get; set; }
        public bool NotExpired { get; set; }
        public bool DeviceMatches { get; set; }
        public string AuthorizationId { get; set; } = string.Empty;
        public DateTime? IssuedAt { get; set; }
        public DateTime? AuthorizationExpiresAt { get; set; }
        public string? Message { get; set; }
    }

    public static class RecoveryVerifier
    {
        private static readonly string PublicKeyBase64 =
            Environment.GetEnvironmentVariable("PROJECTX_RECOVERY_PUBLIC_KEY_BASE64") ?? string.Empty;

        public static string GetRecoveryId(string deviceId)
        {
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(deviceId));
            return $"PX-{Convert.ToHexString(hash)[..12]}";
        }

        public static RecoveryVerificationResult Verify(string authorization, string expectedDeviceId)
        {
            var result = new RecoveryVerificationResult();
            try
            {
                var parts = authorization.Trim().Split('.', 2);
                if (parts.Length != 2) return Invalid(result, "Recovery authorization format is invalid.");

                using var payloadDocument = JsonDocument.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(parts[0])));
                var payload = payloadDocument.RootElement;
                result.AuthorizationId = payload.GetProperty("authorizationId").GetString() ?? string.Empty;
                result.IssuedAt = DateTime.Parse(payload.GetProperty("issuedAt").GetString()!).ToUniversalTime();
                result.AuthorizationExpiresAt = DateTime.Parse(payload.GetProperty("expiresAt").GetString()!).ToUniversalTime();

                if (!string.Equals(payload.GetProperty("authorizationType").GetString(), "temporary_recovery", StringComparison.Ordinal))
                    return Invalid(result, "This is not a recovery authorization.");

                var deviceId = payload.GetProperty("deviceId").GetString();
                var challenge = payload.GetProperty("challenge").GetString();
                result.DeviceMatches = string.Equals(deviceId, expectedDeviceId, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(challenge, GetRecoveryId(expectedDeviceId), StringComparison.OrdinalIgnoreCase);
                if (!result.DeviceMatches) return Invalid(result, "This recovery authorization is for another device.");

                if (string.IsNullOrWhiteSpace(PublicKeyBase64)) return Invalid(result, "Recovery verification key is not configured.");
                using var rsa = RSA.Create();
                rsa.ImportSubjectPublicKeyInfo(Convert.FromBase64String(PublicKeyBase64.Trim()), out _);
                var signatureValid = rsa.VerifyData(
                    Encoding.UTF8.GetBytes(CanonicalJson(payload)),
                    Convert.FromBase64String(parts[1]),
                    HashAlgorithmName.SHA256,
                    RSASignaturePadding.Pkcs1);
                result.SignatureValid = signatureValid;
                result.NotExpired = result.AuthorizationExpiresAt > DateTime.UtcNow && result.IssuedAt <= DateTime.UtcNow;
                result.Valid = signatureValid && result.NotExpired;
                result.Message = result.Valid ? "Recovery authorization verified." : "Recovery authorization is invalid or expired.";
                return result;
            }
            catch (Exception ex) when (ex is FormatException || ex is JsonException || ex is CryptographicException || ex is InvalidOperationException || ex is KeyNotFoundException || ex is ArgumentException)
            {
                return Invalid(result, "Recovery authorization could not be verified.");
            }
        }

        private static RecoveryVerificationResult Invalid(RecoveryVerificationResult result, string message)
        {
            result.Valid = false;
            result.Message = message;
            return result;
        }

        private static string CanonicalJson(JsonElement value)
        {
            return value.ValueKind switch
            {
                JsonValueKind.Object => "{" + string.Join(",", value.EnumerateObject().OrderBy(property => property.Name, StringComparer.Ordinal).Select(property => JsonSerializer.Serialize(property.Name) + ":" + CanonicalJson(property.Value))) + "}",
                JsonValueKind.Array => "[" + string.Join(",", value.EnumerateArray().Select(CanonicalJson)) + "]",
                JsonValueKind.String => JsonSerializer.Serialize(value.GetString()),
                JsonValueKind.Number => value.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => "null",
                _ => throw new InvalidOperationException("Unsupported recovery payload value.")
            };
        }
    }
}
