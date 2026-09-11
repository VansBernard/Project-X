import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Render deploy runs Prisma migrations before API startup", () => {
  const renderYamlPath = path.resolve(__dirname, "../../../render.yaml");
  const renderYaml = fs.readFileSync(renderYamlPath, "utf8");

  assert.match(renderYaml, /prisma:migrate:deploy/i, "Render config should run prisma migrate deploy before start");
});
