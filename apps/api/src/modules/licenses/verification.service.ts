import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { canonicalJson } from "./canonical-json.js";
import type { LicensePayload } from "./license.schemas.js";

function publicKey() {
  const raw = env.LICENSE_PUBLIC_KEY_PEM?.trim();
  if (raw && raw.includes("-----BEGIN")) {
    return crypto.createPublicKey(raw.replace(/\r/g, "\n"));
  }

  const encoded = env.LICENSE_PUBLIC_KEY_PEM_BASE64?.trim();
  if (!encoded) {
    throw new Error("Public key material is missing.");
  }

  const decoded = Buffer.from(encoded, "base64");
  const decodedString = decoded.toString("utf8");
  if (decodedString.includes("-----BEGIN")) {
    return crypto.createPublicKey(decodedString.replace(/\r/g, "\n"));
  }

  return crypto.createPublicKey({
    key: decoded,
    format: "der",
    type: "spki"
  });
}

export const licenseVerificationService = {
  verify(payload: LicensePayload, signature: string) {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(canonicalJson(payload));
    verifier.end();

    const signatureValid = verifier.verify(publicKey(), signature, "base64");
    const now = Date.now();
    const issuedAt = new Date(payload.issuedAt).getTime();
    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt).getTime() : undefined;
    const hasExpiry = expiresAt !== undefined && Number.isFinite(expiresAt);
    const notExpired = hasExpiry ? expiresAt > now : payload.licenseType === "permanent";
    const issued = Number.isFinite(issuedAt) && issuedAt <= now;

    return {
      valid: signatureValid && notExpired && issued,
      signatureValid,
      notExpired,
      issued,
      deviceId: payload.deviceId,
      contractId: payload.contractId,
      expiresAt: payload.expiresAt ?? null,
      licenseType: payload.licenseType
    };
  }
};
