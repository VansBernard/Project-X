import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { canonicalJson } from "./canonical-json.js";
import type { LicensePayload } from "./license.schemas.js";

function publicKey() {
  return crypto.createPublicKey(env.LICENSE_PUBLIC_KEY_PEM.replace(/\\n/g, "\n"));
}

export const licenseVerificationService = {
  verify(payload: LicensePayload, signature: string) {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(canonicalJson(payload));
    verifier.end();

    const signatureValid = verifier.verify(publicKey(), signature, "base64");
    const now = Date.now();
    const notExpired = new Date(payload.expiresAt).getTime() > now;
    const issued = new Date(payload.issuedAt).getTime() <= now;

    return {
      valid: signatureValid && notExpired && issued,
      signatureValid,
      notExpired,
      issued,
      deviceId: payload.deviceId,
      contractId: payload.contractId,
      expiresAt: payload.expiresAt
    };
  }
};

