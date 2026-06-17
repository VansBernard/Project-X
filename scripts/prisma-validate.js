#!/usr/bin/env node

import { spawnSync } from "node:child_process";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/project_x";

const result = spawnSync(
  "npx",
  ["prisma", "validate", "--schema", "prisma/schema.prisma"],
  {
    cwd: "apps/api",
    stdio: "inherit",
    shell: true,
    env: process.env
  }
);

process.exit(result.status ?? 1);

