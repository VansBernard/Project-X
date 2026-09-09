import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderYaml = readFileSync(new URL("../../../render.yaml", import.meta.url), "utf8");

test("Render API service starts without blocking on database migrations", () => {
  assert.match(renderYaml, /startCommand: npm --workspace @project-x\/api run start/);
  assert.doesNotMatch(renderYaml, /prisma:migrate:deploy/);
});
