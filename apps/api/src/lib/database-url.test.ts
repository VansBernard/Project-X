import test from "node:test";
import assert from "node:assert/strict";
import { prismaDatabaseUrl } from "./database-url.js";

test("adds Supabase pooler and SSL params", () => {
  process.env.DATABASE_URL = "postgresql://postgres:secret@aws-1-eu-west-2.pooler.supabase.com:5432/postgres";

  const url = prismaDatabaseUrl();

  assert.ok(url);
  assert.match(url, /pgbouncer=true/);
  assert.match(url, /sslmode=require/);
});

test("overrides Supabase sslmode to require", () => {
  process.env.DATABASE_URL = "postgresql://postgres:secret@db.klsqjkgxvwvxasmbqbjq.supabase.co:5432/postgres?sslmode=disable";

  const url = prismaDatabaseUrl();

  assert.ok(url);
  assert.match(url, /sslmode=require/);
});
