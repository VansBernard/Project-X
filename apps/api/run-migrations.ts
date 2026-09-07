import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function executeMigrations() {
  try {
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const dirs = fs.readdirSync(migrationsDir).sort();

    console.log("Found migration directories:", dirs);

    for (const dir of dirs) {
      const sqlPath = path.join(migrationsDir, dir, "migration.sql");
      if (fs.existsSync(sqlPath)) {
        let sql = fs.readFileSync(sqlPath, "utf-8");
        console.log(`\n📝 Executing ${dir}...`);
        
        // Split by semicolons but preserve them
        const statements = sql.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
        
        try {
          for (const statement of statements) {
            await prisma.$executeRawUnsafe(statement);
          }
          console.log(`✅ ${dir} completed (${statements.length} statements)`);
        } catch (error: any) {
          if (error.message.includes("already exists") || error.message.includes("duplicate key")) {
            console.log(`⚠️  ${dir} already applied (skipping)`);
          } else {
            console.error(`❌ ${dir} failed:`, error.message);
            // Don't throw, continue with next migration
          }
        }
      }
    }

    console.log("\n✅ All migrations processed!");
    
    // Verify tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name;
    `;
    console.log("Tables created:", (tables as any).map((t: any) => t.table_name).join(", "));
  } catch (error: any) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

executeMigrations();
