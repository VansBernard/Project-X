#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateSecretKey() {
  return crypto.randomBytes(32).toString("base64");
}

function ensureKeysDirectory() {
  const keysDir = path.join(__dirname, "..", "jwt-keys");
  fs.mkdirSync(keysDir, { recursive: true });
  return keysDir;
}

function main() {
  console.log("JWT secret key generator\n");

  const accessSecret = generateSecretKey();
  const refreshSecret = generateSecretKey();
  const keysDir = ensureKeysDirectory();
  const timestamp = new Date().toISOString().slice(0, 10);
  const accessSecretFile = path.join(keysDir, `jwt-access-secret-${timestamp}.txt`);
  const refreshSecretFile = path.join(keysDir, `jwt-refresh-secret-${timestamp}.txt`);

  fs.writeFileSync(accessSecretFile, accessSecret);
  fs.writeFileSync(refreshSecretFile, refreshSecret);

  console.log("Keys generated successfully.\n");
  console.log("Saved to:");
  console.log(`- ${accessSecretFile}`);
  console.log(`- ${refreshSecretFile}\n`);

  console.log("Copy into apps/api/.env:");
  console.log("---begin-copy---");
  console.log(`JWT_ACCESS_SECRET=${accessSecret}`);
  console.log(`JWT_REFRESH_SECRET=${refreshSecret}`);
  console.log("---end-copy---\n");

  console.log("Keep these secrets private. The jwt-keys/ folder is ignored by Git.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Failed to generate JWT keys.");
  process.exit(1);
}

