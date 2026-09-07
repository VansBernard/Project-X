CREATE TABLE IF NOT EXISTS "device_payment_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dealer_id" UUID NOT NULL,
  "device_id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),

  CONSTRAINT "device_payment_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_payment_links_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "device_payment_links_device_id_contract_id_key" UNIQUE ("device_id", "contract_id"),
  CONSTRAINT "device_payment_links_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "device_payment_links_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "device_payment_links_dealer_id_device_id_idx" ON "device_payment_links"("dealer_id", "device_id");
CREATE INDEX IF NOT EXISTS "device_payment_links_dealer_id_contract_id_idx" ON "device_payment_links"("dealer_id", "contract_id");
CREATE INDEX IF NOT EXISTS "device_payment_links_revoked_at_idx" ON "device_payment_links"("revoked_at");
