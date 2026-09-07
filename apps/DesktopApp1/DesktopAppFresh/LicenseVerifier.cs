using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DesktopAppFresh
{
    public sealed class LocalLicenseVerificationResult
    {
        public bool Valid { get; set; }
        public bool SignatureValid { get; set; }
        public bool NotExpired { get; set; }
        public bool Issued { get; set; }        public bool HardwareBound { get; set; }        public string? Message { get; set; }
    }

    public static class LicenseVerifier
    {
        private static readonly string PublicKeyBase64 =
            Environment.GetEnvironmentVariable("PROJECTX_LICENSE_PUBLIC_KEY_BASE64")
            ?? "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA0E2SHzEwcUgOkEWYliHGHXwtqzc1Qu3vrWXfpM3DPYr890K3yGRHd+jWfIcDHZEPZx0w1Y9hB8zyzcurzDInI8/W05GvYi4UIuB+fU4T3VOv1R+Oxld3vDKVpruUXi98dc8o7SCWcTyvDeaTt/L9e9OVwjitd2movtSyaC+wfy3/9ZeIWnB9gXinx4YYkDzZ6gRGdCM1UpL/f3Aoyp8e6pc/kS0sLLCG4CtNnv+/u0TrMpr0mJKcLQ36IhKZVHGt/MEw7jM7vmNZtW4ganTKDOQX3faRWO9Vbnis8uk7wZL8AQyftOSsTsvwxWTjXIXvBzHLhpmCqwdBa8CvU7x0BDry7bjLiUjuenHmYvGe8617CRlU7pdqew5JKoRZblaRZykGod7WPO478HYtFPyG/k5lN5g0W9Lm8lRTEgF8r0ZN3PTMut8FngD7UPC58Y72jRuh/06+GdlOra8pLgrXKDq7hlTxYy/LRMM1ouQyxD67NBL2Kv+xBE3dKZX0uBf0NsYa5TjQnDBvnsVH6wOAg0daAuupXhv7MlcOOIE6GH5yXcoUbaqNzaKrgB3L7sn35EXFo74s9O5HjZuv9TtAUX9+WxqFrZsxdya64a4txvIyJJ1wpP+gXO698/Ky25rlDIFbG6IC+xLY1RIwB9lvkHGMBM983yF0si+iCn8/s1sCAwEAAQ==";

        public static LocalLicenseVerificationResult Verify(
            JsonElement signedPayload,
            string signature,
            string expectedDeviceId,
            string expectedContractId,
            string? expectedHardwareFingerprint = null)
        {
            if (string.IsNullOrWhiteSpace(signature))
            {
                return new LocalLicenseVerificationResult
                {
                    Valid = false,
                    SignatureValid = false,
                    NotExpired = false,
                    Issued = false,
                    Message = "Signature is missing."
                };
            }

            byte[] publicKeyBytes;
            try
            {
                publicKeyBytes = Convert.FromBase64String(PublicKeyBase64.Trim());
            }
            catch (FormatException)
            {
                return new LocalLicenseVerificationResult
                {
                    Valid = false,
                    SignatureValid = false,
                    NotExpired = false,
                    Issued = false,
                    Message = "Public key is not valid base64."
                };
            }

            using var rsa = RSA.Create();
            try
            {
                rsa.ImportSubjectPublicKeyInfo(publicKeyBytes, out _);
            }
            catch (Exception ex)
            {
                return new LocalLicenseVerificationResult
                {
                    Valid = false,
                    SignatureValid = false,
                    NotExpired = false,
                    Issued = false,
                    Message = $"Unable to parse public key: {ex.Message}"
                };
            }

            string canonicalPayload;
            try
            {
                canonicalPayload = CanonicalJson(signedPayload);
            }
            catch (Exception ex)
            {
                return new LocalLicenseVerificationResult
                {
                    Valid = false,
                    SignatureValid = false,
                    NotExpired = false,
                    Issued = false,
                    Message = $"Unable to canonicalize payload: {ex.Message}"
                };
            }

            var data = Encoding.UTF8.GetBytes(canonicalPayload);
            var signatureBytes = Convert.FromBase64String(signature);
            var signatureValid = rsa.VerifyData(data, signatureBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

            if (!signatureValid)
            {
                return new LocalLicenseVerificationResult
                {
                    Valid = false,
                    SignatureValid = false,
                    NotExpired = false,
                    Issued = false,
                    Message = "Signature verification failed."
                };
            }

            if (!signedPayload.TryGetProperty("deviceId", out var deviceIdElement)
                || !signedPayload.TryGetProperty("contractId", out var contractIdElement)
                || !string.Equals(deviceIdElement.GetString(), expectedDeviceId, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(contractIdElement.GetString(), expectedContractId, StringComparison.OrdinalIgnoreCase))
            {
                return new LocalLicenseVerificationResult
                {
                    Valid = false,
                    SignatureValid = true,
                    NotExpired = false,
                    Issued = false,
                    HardwareBound = false,
                    Message = "This license is not issued for the current device and contract."
                };
            }

            // Validate hardware binding if a hardware fingerprint is present in the license
            var hardwareBound = true;
            if (signedPayload.TryGetProperty("hardwareFingerprint", out var hwFpElement))
            {
                var licenseHwFp = hwFpElement.GetString();
                if (!string.IsNullOrWhiteSpace(licenseHwFp))
                {
                    if (string.IsNullOrWhiteSpace(expectedHardwareFingerprint))
                    {
                        // License is hardware-bound but we don't have the device's hardware fingerprint
                        expectedHardwareFingerprint = HardwareIdentifier.GetStableFingerprint();
                    }

                    hardwareBound = string.Equals(licenseHwFp, expectedHardwareFingerprint, StringComparison.OrdinalIgnoreCase);
                    if (!hardwareBound)
                    {
                        return new LocalLicenseVerificationResult
                        {
                            Valid = false,
                            SignatureValid = true,
                            NotExpired = false,
                            Issued = false,
                            HardwareBound = false,
                            Message = "This license is bound to a different device. Hardware fingerprint mismatch."
                        };
                    }
                }
            }

            var now = DateTime.UtcNow;
            var issuedAt = signedPayload.GetProperty("issuedAt").GetString();
            var expiresAt = signedPayload.TryGetProperty("expiresAt", out var expiresAtElement) && expiresAtElement.ValueKind == JsonValueKind.String
                ? expiresAtElement.GetString()
                : null;

            var issued = DateTime.TryParse(issuedAt, out var issuedDate) && issuedDate <= now;
            var notExpired = true;
            if (!string.IsNullOrWhiteSpace(expiresAt))
            {
                notExpired = DateTime.TryParse(expiresAt, out var expiresDate) && expiresDate > now;
            }

            var valid = signatureValid && issued && notExpired && hardwareBound;
            return new LocalLicenseVerificationResult
            {
                Valid = valid,
                SignatureValid = signatureValid,
                NotExpired = notExpired,
                Issued = issued,
                HardwareBound = hardwareBound,
                Message = valid ? "License payload verified locally." : "Payload is valid but license has expired or not yet issued."
            };
        }

        private static string CanonicalJson(JsonElement value)
        {
            return value.ValueKind switch
            {
                JsonValueKind.Object => CanonicalJsonObject(value),
                JsonValueKind.Array => CanonicalJsonArray(value),
                JsonValueKind.String => JsonSerializer.Serialize(value.GetString()),
                JsonValueKind.Number => value.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => "null",
                _ => throw new InvalidOperationException($"Unsupported JSON value kind: {value.ValueKind}")
            };
        }

        private static string CanonicalJsonArray(JsonElement value)
        {
            var items = new List<string>(value.GetArrayLength());
            foreach (var item in value.EnumerateArray())
            {
                items.Add(CanonicalJson(item));
            }

            return $"[{string.Join(",", items)}]";
        }

        private static string CanonicalJsonObject(JsonElement value)
        {
            var properties = value.EnumerateObject()
                .OrderBy(property => property.Name, StringComparer.Ordinal)
                .Select(property => JsonSerializer.Serialize(property.Name) + ":" + CanonicalJson(property.Value));

            return "{" + string.Join(",", properties) + "}";
        }
    }
}
