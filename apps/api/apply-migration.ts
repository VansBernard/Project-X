import { prisma } from "./src/lib/prisma.js";

const sql = `
CREATE TABLE IF NOT EXISTS "pending_dealer_signups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "confirmed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pending_dealer_signups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pending_dealer_signups_token_hash_key" ON "pending_dealer_signups"("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "pending_dealer_signups_email_key" ON "pending_dealer_signups"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "pending_dealer_signups_slug_key" ON "pending_dealer_signups"("slug");
CREATE INDEX IF NOT EXISTS "pending_dealer_signups_expires_at_idx" ON "pending_dealer_signups"("expires_at");

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (
  '202608140001_pending_dealer_signups',
  '81a7d33c45f0b8d21c8c9e5a6b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b',
  NOW(),
  '202608140001_pending_dealer_signups',
  '',
  NULL,
  NOW(),
  1
)
ON CONFLICT DO NOTHING;
`;

(async () => {
  try {
    console.log("Applying migration...");
    await prisma.$executeRawUnsafe(sql);
    console.log("✅ Migration applied successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
