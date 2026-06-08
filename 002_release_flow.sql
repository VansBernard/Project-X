ALTER TYPE device_status_enum ADD VALUE IF NOT EXISTS 'Released';

ALTER TABLE financing_contracts
  ADD COLUMN IF NOT EXISTS release_token VARCHAR(8),
  ADD COLUMN IF NOT EXISTS release_token_issued_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE financing_contracts
  DROP CONSTRAINT IF EXISTS release_token_length;

ALTER TABLE financing_contracts
  ADD CONSTRAINT release_token_length CHECK (char_length(release_token) = 8 OR release_token IS NULL);
