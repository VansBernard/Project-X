import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderYaml = readFileSync(new URL("../../../render.yaml", import.meta.url), "utf8");

test("Render API service seeds the database during startup", () => {
  assert.match(renderYaml, /npm --workspace @project-x\/api run seed/);
});
