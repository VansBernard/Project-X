import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createDealersTable() {
  try {
    console.log("Creating dealers table...");
    
    // Create the table using raw SQL
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.dealers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        legal_name text,
        slug text NOT NULL UNIQUE,
        email text,
        phone text,
        country varchar(2),
        timezone text NOT NULL DEFAULT 'UTC',
        status text NOT NULL DEFAULT 'active',
        suspended_at timestamptz,
        suspended_reason text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
    
    console.log("✅ Dealers table created!");
    
    // Create indexes
    console.log("Creating indexes...");
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_dealers_status ON public.dealers(status);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_dealers_slug ON public.dealers(slug);`);
    
    console.log("✅ Indexes created!");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createDealersTable();
