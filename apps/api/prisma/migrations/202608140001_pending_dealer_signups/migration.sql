CREATE TABLE "pending_dealer_signups" (
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

CREATE UNIQUE INDEX "pending_dealer_signups_token_hash_key" ON "pending_dealer_signups"("token_hash");
CREATE UNIQUE INDEX "pending_dealer_signups_email_key" ON "pending_dealer_signups"("email");
CREATE UNIQUE INDEX "pending_dealer_signups_slug_key" ON "pending_dealer_signups"("slug");
CREATE INDEX "pending_dealer_signups_expires_at_idx" ON "pending_dealer_signups"("expires_at");
