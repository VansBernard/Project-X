-- This script adds the missing emergency_contact column to the customers table
-- Run this against your PostgreSQL database if Prisma migrations have not been applied

BEGIN;

-- Add the emergency_contact column if it doesn't exist
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS emergency_contact jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Commit the transaction
COMMIT;

-- Verify the column was added
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'customers' AND column_name = 'emergency_contact';
