#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateRsaKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      "rsa",
      {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: "spki",
          format: "pem"
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem"
        }
      },
      (error, publicKey, privateKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({ publicKey, privateKey });
      }
    );
  });
}

function ensureKeysDirectory() {
  const keysDir = path.join(__dirname, "..", "rsa-keys");
  fs.mkdirSync(keysDir, { recursive: true });
  return keysDir;
}

async function main() {
  console.log("RSA 4096 key generator\n");
  console.log("Generating RSA 4096 key pair for license signing. This can take a moment.\n");

  const { publicKey, privateKey } = await generateRsaKeyPair();
  const keysDir = ensureKeysDirectory();
  const timestamp = new Date().toISOString().slice(0, 10);
  const publicKeyFile = path.join(keysDir, `rsa-public-key-${timestamp}.pem`);
  const privateKeyFile = path.join(keysDir, `rsa-private-key-${timestamp}.pem`);
  const privateKeyBase64 = Buffer.from(privateKey).toString("base64");

  fs.writeFileSync(publicKeyFile, publicKey);
  fs.writeFileSync(privateKeyFile, privateKey);

  console.log("RSA 4096 key pair generated successfully.\n");
  console.log("Saved to:");
  console.log(`- ${publicKeyFile}`);
  console.log(`- ${privateKeyFile}\n`);

  console.log("Copy into apps/api/.env:");
  console.log("---begin-copy---");
  console.log(`LICENSE_PRIVATE_KEY_PEM_BASE64=${privateKeyBase64}`);
  console.log(`LICENSE_PUBLIC_KEY_PEM=${publicKey.split("\n").join("\\n")}`);
  console.log("LICENSE_KEY_ID=default");
  console.log("---end-copy---\n");

  console.log("Keep the private key secret. The rsa-keys/ folder is ignored by Git.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Failed to generate RSA keys.");
  process.exit(1);
});

