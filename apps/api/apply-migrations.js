import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

async function applyMigrations() {
  const client = new Client({ 
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const migrationsDir = path.join(__dirname, 'prisma', 'migrations');
    const dirs = fs.readdirSync(migrationsDir).sort();

    for (const dir of dirs) {
      const migrationFile = path.join(migrationsDir, dir, 'migration.sql');
      if (fs.existsSync(migrationFile)) {
        const sql = fs.readFileSync(migrationFile, 'utf-8');
        console.log(`\nApplying migration: ${dir}`);
        try {
          await client.query(sql);
          console.log(`✓ ${dir} applied successfully`);
        } catch (error) {
          console.error(`✗ Error applying ${dir}:`, error.message);
        }
      }
    }

    console.log('\n✓ All migrations completed!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigrations().catch(console.error);
