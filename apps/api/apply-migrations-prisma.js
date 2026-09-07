import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function applyMigrationsWithPrisma() {
  try {
    console.log('Starting migration application...');
    
    const migrationsDir = path.join(__dirname, 'prisma', 'migrations');
    const dirs = fs.readdirSync(migrationsDir).sort();

    for (const dir of dirs) {
      const migrationFile = path.join(migrationsDir, dir, 'migration.sql');
      if (fs.existsSync(migrationFile)) {
        const sql = fs.readFileSync(migrationFile, 'utf-8');
        console.log(`\n📝 Applying migration: ${dir}`);
        try {
          // Split by semicolon and execute each statement separately
          const statements = sql.split(';').filter(s => s.trim());
          for (const stmt of statements) {
            if (stmt.trim()) {
              await prisma.$executeRawUnsafe(stmt.trim() + ';');
            }
          }
          console.log(`✓ ${dir} applied successfully`);
        } catch (error) {
          console.error(`✗ Error applying ${dir}:`, error instanceof Error ? error.message : error);
        }
      }
    }

    console.log('\n✓ All migrations completed!');
    
    // Verify tables were created
    const dealers = await prisma.$queryRaw`SELECT COUNT(*) as count FROM dealers`;
    console.log('✓ Dealers table exists');
    
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigrationsWithPrisma();
