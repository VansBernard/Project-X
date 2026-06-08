import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '..');

function makeIdempotent(script) {
  let adjusted = script;

  adjusted = adjusted.replace(/\bCREATE\s+TABLE\s+/gi, 'CREATE TABLE IF NOT EXISTS ');
  adjusted = adjusted.replace(/\bCREATE\s+INDEX\s+/gi, 'CREATE INDEX IF NOT EXISTS ');

  return adjusted;
}

async function removeExistingTypeBlocks(client, script) {
  let adjusted = script;
  const typeRegex = /CREATE\s+TYPE\s+([a-zA-Z0-9_]+)\s+AS\s+ENUM\s*\([\s\S]*?\);/gi;
  let match;

  while ((match = typeRegex.exec(script)) !== null) {
    const typeName = match[1];
    const exists = await client.query('SELECT 1 FROM pg_type WHERE typname = $1', [typeName]);
    if (exists.rowCount > 0) {
      console.log(`Skipping existing type: ${typeName}`);
      adjusted = adjusted.replace(match[0], `-- skipped existing type ${typeName}`);
    }
  }

  return adjusted;
}

async function removeExistingTriggerBlocks(client, script) {
  let adjusted = script;
  const triggerRegex = /CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)[\s\S]*?;/gi;
  let match;

  while ((match = triggerRegex.exec(script)) !== null) {
    const triggerName = match[1];
    const exists = await client.query('SELECT 1 FROM pg_trigger WHERE tgname = $1', [triggerName]);
    if (exists.rowCount > 0) {
      console.log(`Skipping existing trigger: ${triggerName}`);
      adjusted = adjusted.replace(match[0], `-- skipped existing trigger ${triggerName}`);
    }
  }

  return adjusted;
}

async function prepareMigration(client, script) {
  let adjusted = await removeExistingTypeBlocks(client, script);
  adjusted = await removeExistingTriggerBlocks(client, adjusted);
  return makeIdempotent(adjusted);
}

async function runMigration() {
  try {
    const migrationFiles = (await fs.readdir(migrationsDir))
      .filter((file) => /^\d+.*\.sql$/i.test(file))
      .sort();

    const client = await pool.connect();

    try {
      for (const file of migrationFiles) {
        const migrationPath = path.join(migrationsDir, file);
        const script = await fs.readFile(migrationPath, 'utf8');
        const adjusted = await prepareMigration(client, script);

        console.log(`Running migration from ${migrationPath}`);
        await client.query(adjusted);
      }

      console.log('Migrations executed successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
