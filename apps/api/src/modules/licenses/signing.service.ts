import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";
import { canonicalJson } from "./canonical-json.js";
import type { LicensePayload } from "./license.schemas.js";

function privateKeyPem() {
  return Buffer.from(env.LICENSE_PRIVATE_KEY_PEM_BASE64, "base64").toString("utf8");
}

function privateKey() {
  const key = crypto.createPrivateKey(privateKeyPem());
  const modulusLength = key.asymmetricKeyDetails?.modulusLength;

  if (modulusLength !== 4096) {
    throw new AppError(500, "INVALID_LICENSE_PRIVATE_KEY", "License private key must be RSA 4096.");
  }

  return key;
}

export const licenseSigningService = {
  sign(payload: LicensePayload) {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(canonicalJson(payload));
    signer.end();

    return signer.sign(privateKey(), "base64");
  }
};

