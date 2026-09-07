import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log("🌱 Seeding database with test data...\n");

    // 1. Create dealer using raw SQL
    console.log("📦 Creating test dealer...");
    const dealerId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.dealers (id, name, slug, email, phone, country, status, timezone, metadata)
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      ON CONFLICT (slug) DO NOTHING
    `, dealerId, 'Test Dealer', 'test-dealer', 'dealer@test.com', '+234 123 456 7890', 'NG', 'active', 'UTC', JSON.stringify({ source: 'seed_script' }));
    console.log(`✅ Dealer created: ${dealerId}`);
    console.log(`   Name: Test Dealer`);
    console.log(`   Slug: test-dealer\n`);

    // 2. Create admin role using raw SQL
    console.log("👥 Creating admin role...");
    const roleId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.roles (id, dealer_id, name, description, is_system)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5)
      ON CONFLICT (dealer_id, name) DO NOTHING
    `, roleId, dealerId, 'Admin', 'Administrator role with full access', true);
    console.log(`✅ Role created: ${roleId}`);
    console.log(`   Name: Admin\n`);

    // 3. Create admin user using raw SQL with bcrypt
    console.log("👤 Creating admin user...");
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash('password123', 10);
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.users (id, dealer_id, role_id, email, password_hash, status, first_name, last_name)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)
      ON CONFLICT (dealer_id, email) DO NOTHING
    `, userId, dealerId, roleId, 'admin@test.com', passwordHash, 'active', 'Admin', 'User');
    console.log(`✅ User created: ${userId}`);
    console.log(`   Email: admin@test.com`);
    console.log(`   Password: password123 (hashed)\n`);

    console.log("✅ Seed completed successfully!");
    console.log("\n📋 Test Credentials:");
    console.log("   Email: admin@test.com");
    console.log("   Password: password123");

  } catch (error: any) {
    if (error.message.includes("duplicate key")) {
      console.log("⚠️  Data already seeded (skipping)");
    } else {
      console.error("❌ Error seeding database:", error.message);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
