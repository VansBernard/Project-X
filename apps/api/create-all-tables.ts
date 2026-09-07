import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createAllTables() {
  try {
    console.log("Creating all required tables...\n");

    // 1. Create roles table
    console.log("📝 Creating roles table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
        name text NOT NULL,
        description text,
        is_system boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        UNIQUE(dealer_id, name)
      );
    `);
    console.log("✅ Roles table created!");

    // 2. Create permissions table
    console.log("📝 Creating permissions table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
        key text NOT NULL,
        name text NOT NULL,
        description text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        UNIQUE(dealer_id, key)
      );
    `);
    console.log("✅ Permissions table created!");

    // 3. Create users table
    console.log("📝 Creating users table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
        role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
        email text NOT NULL,
        password_hash text,
        status text NOT NULL DEFAULT 'active',
        first_name text,
        last_name text,
        phone text,
        last_login_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        UNIQUE(dealer_id, email)
      );
    `);
    console.log("✅ Users table created!");

    // Create indexes
    console.log("📝 Creating indexes...");
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_roles_dealer_id ON public.roles(dealer_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_permissions_dealer_id ON public.permissions(dealer_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_users_dealer_id ON public.users(dealer_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);`);
    console.log("✅ Indexes created!");

    console.log("\n✅ All tables created successfully!");
    
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      console.log("⚠️  Tables already exist (skipping)");
    } else {
      console.error("❌ Error:", error.message);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAllTables();
