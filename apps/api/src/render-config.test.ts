import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderYaml = readFileSync(new URL("../../../render.yaml", import.meta.url), "utf8");

test("Render API service starts without running database migrations", () => {
  assert.match(renderYaml, /startCommand:\s*cd apps\/api && npm run start/);
  assert.doesNotMatch(renderYaml, /startCommand:.*prisma migrate deploy/);
});
