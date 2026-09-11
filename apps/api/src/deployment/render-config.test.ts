import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Render deploy resolves failed Prisma migrations before API startup", () => {
  const renderYamlPath = path.resolve(__dirname, "../../../render.yaml");
  const renderYaml = fs.readFileSync(renderYamlPath, "utf8");

  assert.match(renderYaml, /cd apps\/api/i, "Render config should execute from the API workspace where the Prisma schema exists");
  assert.match(renderYaml, /migrate resolve --rolled-back 202608140001_pending_dealer_signups/i, "Render config should resolve the failed pending signup migration before deploy");
  assert.match(renderYaml, /migrate deploy --schema prisma\/schema\.prisma/i, "Render config should re-run Prisma deployment after resolving the failed migration");
});
