import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "./src/lib/prisma.js";

(async () => {
  try {
    const migrationPath = join(
      process.cwd(),
      "prisma/migrations/202608140001_pending_dealer_signups/migration.sql"
    );
    const sql = readFileSync(migrationPath, "utf-8");
    
    console.log("Executing migration SQL...");
    console.log(sql);
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      console.log("\n📝 Executing:", statement.trim().substring(0, 50) + "...");
      await prisma.$executeRawUnsafe(statement);
    }
    
    console.log("\n✅ Migration applied successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
