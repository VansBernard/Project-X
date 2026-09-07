import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";
import { canonicalJson } from "../licenses/canonical-json.js";

function privateKey() {
  const configured = env.RECOVERY_PRIVATE_KEY_PEM_BASE64?.trim();
  if (!configured) {
    throw new AppError(500, "RECOVERY_SIGNING_KEY_NOT_CONFIGURED", "Recovery signing key is not configured.");
  }

  const pem = configured.includes("-----BEGIN")
    ? configured.replace(/\\r/g, "")
    : Buffer.from(configured, "base64").toString("utf8").replace(/\\r/g, "");
  const key = crypto.createPrivateKey(pem);

  if (key.asymmetricKeyDetails?.modulusLength !== 4096) {
    throw new AppError(500, "INVALID_RECOVERY_PRIVATE_KEY", "Recovery private key must be RSA 4096.");
  }

  return key;
}

export const recoverySigningService = {
  sign(payload: Record<string, unknown>) {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(canonicalJson(payload));
    signer.end();
    return signer.sign(privateKey(), "base64");
  }
};