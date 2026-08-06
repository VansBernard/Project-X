-- A license must remain associated with its originating contract.
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_contract_id_fkey";

ALTER TABLE "licenses" ALTER COLUMN "contract_id" SET NOT NULL;

ALTER TABLE "licenses"
  ADD CONSTRAINT "licenses_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
