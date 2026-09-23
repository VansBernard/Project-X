import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderYaml = readFileSync(new URL("../../../render.yaml", import.meta.url), "utf8");

test("Render API service starts without blocking on database migrations", () => {
  assert.match(renderYaml, /startCommand:\s*cd apps\/api && \(npx prisma migrate resolve --applied 202608140001_pending_dealer_signups --schema prisma\/schema\.prisma \|\| true\) && npx prisma migrate deploy --schema prisma\/schema\.prisma && cd \.\.\/\.\. && npm --workspace @project-x\/api run start/);
  assert.doesNotMatch(renderYaml, /startCommand:\s*npm --workspace @project-x\/api run start/);
});
