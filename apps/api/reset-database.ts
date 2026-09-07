import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { prismaDatabaseUrl } from "./src/lib/database-url.js";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prismaDatabaseUrl()
    }
  }
});

function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let dollarTag: string | null = null;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (dollarTag) {
      current += char;
      if (sql.slice(i, i + dollarTag.length) === dollarTag) {
        current += sql.slice(i + 1, i + dollarTag.length);
        i += dollarTag.length - 1;
        dollarTag = null;
      }
      continue;
    }

    if (quote) {
      current += char;
      if (char === quote && next === quote) {
        current += next;
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") {
        current += sql[i];
        i += 1;
      }
      current += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      current += char;
      current += next;
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) {
        current += sql[i];
        i += 1;
      }
      if (i < sql.length) {
        current += "*/";
        i += 1;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }

    if (char === "$") {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    }

    if (char === ";") {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const statement = current.trim();
  if (statement) {
    statements.push(statement);
  }

  return statements;
}

async function resetPublicSchema() {
  await prisma.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await prisma.$executeRawUnsafe("CREATE SCHEMA public");
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public');
  await prisma.$executeRawUnsafe("GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role");
  await prisma.$executeRawUnsafe("GRANT ALL ON SCHEMA public TO postgres, service_role");
}

async function ensurePrismaMigrationsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id varchar(36) PRIMARY KEY,
      checksum varchar(64) NOT NULL,
      finished_at timestamptz,
      migration_name varchar(255) NOT NULL,
      logs text,
      rolled_back_at timestamptz,
      started_at timestamptz NOT NULL DEFAULT now(),
      applied_steps_count integer NOT NULL DEFAULT 0
    )
  `);
}

async function applyMigration(name: string, sql: string) {
  const statements = splitSql(sql);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  const checksum = crypto.createHash("sha256").update(sql).digest("hex");
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO _prisma_migrations (
        id,
        checksum,
        finished_at,
        migration_name,
        logs,
        rolled_back_at,
        started_at,
        applied_steps_count
      )
      VALUES ($1, $2, now(), $3, null, null, now(), $4)
    `,
    crypto.randomUUID(),
    checksum,
    name,
    statements.length
  );
}

async function main() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const migrationNames = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  console.log("Resetting Supabase public schema...");
  await resetPublicSchema();
  await ensurePrismaMigrationsTable();

  for (const migrationName of migrationNames) {
    const sqlPath = path.join(migrationsDir, migrationName, "migration.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log(`Applying ${migrationName}...`);
    await applyMigration(migrationName, sql);
  }

  console.log("Database reset and migrations complete.");
}

main()
  .catch((error) => {
    console.error("Database reset failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
