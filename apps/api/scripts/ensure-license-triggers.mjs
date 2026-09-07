import dotenv from 'dotenv';

dotenv.config();
const { prisma } = await import('../src/lib/prisma.ts');

const assignFunction = `
CREATE OR REPLACE FUNCTION public.assign_license_contract_id() RETURNS TRIGGER AS $$
DECLARE
  contract_id uuid;
BEGIN
  IF NEW.contract_id IS NULL AND NEW.device_id IS NOT NULL THEN
    SELECT id INTO contract_id FROM contracts
    WHERE device_id = NEW.device_id
      AND dealer_id = NEW.dealer_id
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF contract_id IS NOT NULL THEN
      NEW.contract_id := contract_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

const validateFunction = `
CREATE OR REPLACE FUNCTION public.validate_license_contract_consistency() RETURNS TRIGGER AS $$
DECLARE
  ct record;
BEGIN
  IF NEW.contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT dealer_id, customer_id, device_id INTO ct FROM contracts WHERE id = NEW.contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid contract_id % for license', NEW.contract_id;
  END IF;

  IF ct.dealer_id IS NOT NULL AND ct.dealer_id <> NEW.dealer_id THEN
    RAISE EXCEPTION 'Contract % dealer mismatch', NEW.contract_id;
  END IF;
  IF ct.customer_id IS NOT NULL AND ct.customer_id <> NEW.customer_id THEN
    RAISE EXCEPTION 'Contract % customer mismatch', NEW.contract_id;
  END IF;
  IF ct.device_id IS NOT NULL AND ct.device_id <> NEW.device_id THEN
    RAISE EXCEPTION 'Contract % device mismatch', NEW.contract_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

const assignTrigger = `
CREATE TRIGGER trg_assign_license_contract_id
BEFORE INSERT ON licenses
FOR EACH ROW
EXECUTE FUNCTION public.assign_license_contract_id();
`;

const validateTrigger = `
CREATE TRIGGER trg_validate_license_contract_consistency
BEFORE INSERT OR UPDATE ON licenses
FOR EACH ROW
EXECUTE FUNCTION public.validate_license_contract_consistency();
`;

async function run() {
  try {
    await prisma.$executeRawUnsafe(assignFunction);
    await prisma.$executeRawUnsafe(validateFunction);
    await prisma.$executeRawUnsafe(assignTrigger);
    await prisma.$executeRawUnsafe(validateTrigger);
    console.log('✅ License contract triggers installed.');
  } catch (error) {
    console.error('Failed to install license triggers:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
