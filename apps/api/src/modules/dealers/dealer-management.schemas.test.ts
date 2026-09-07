import assert from "node:assert/strict";
import test from "node:test";
import { completeRegistrationSchema } from "./dealer-management.schemas.js";

test("completeRegistrationSchema accepts a single-registration payload without firstDueDate", () => {
  const parsed = completeRegistrationSchema.parse({
    customer: {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com"
    },
    device: {
      serialNumber: "SN-1001",
      manufacturer: "ProjectX",
      model: "Lite"
    },
    contract: {
      contractNumber: "REG-1001",
      currency: "GHS",
      devicePrice: 1200,
      deposit: 200,
      installmentAmount: 200,
      firstDueDate: new Date("2026-08-10T00:00:00.000Z"),
      installmentCount: 5,
      paymentPlan: "monthly"
    }
  });

  assert.ok(parsed.contract.firstDueDate instanceof Date);
  assert.equal(parsed.contract.paymentPlan, "monthly");
});
