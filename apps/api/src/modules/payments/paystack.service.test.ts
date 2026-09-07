import assert from "node:assert/strict";
import test from "node:test";
import { ContractStatus, PaymentStatus, Prisma } from "@prisma/client";
import { settlePaymentOnce } from "./paystack.service.js";

test("settlePaymentOnce does not reapply a previously settled payment", async () => {
  let paymentWasSettled = true;
  let contractUpdates = 0;
  const tx = {
    payment: {
      updateMany: async () => ({ count: paymentWasSettled ? 0 : 1 })
    },
    contract: {
      update: async () => {
        contractUpdates += 1;
        return {};
      }
    }
  } as unknown as Pick<Prisma.TransactionClient, "payment" | "contract">;

  const payment = {
    id: "payment-1",
    contractId: "contract-1",
    contract: {
      id: "contract-1",
      remainingBalance: new Prisma.Decimal(100),
      amountPaid: new Prisma.Decimal(0),
      status: ContractStatus.active
    },
    amount: new Prisma.Decimal(25),
    providerTransaction: null,
    metadata: {}
  };

  const firstDuplicate = await settlePaymentOnce(tx, payment, { id: 42 });
  assert.equal(firstDuplicate, false);
  assert.equal(contractUpdates, 0);

  paymentWasSettled = false;
  const firstSettlement = await settlePaymentOnce(tx, payment, { id: 42 });
  assert.equal(firstSettlement, true);
  assert.equal(contractUpdates, 1);

  paymentWasSettled = true;
  const retryAfterDeliveryFailure = await settlePaymentOnce(tx, payment, { id: 42 });
  assert.equal(retryAfterDeliveryFailure, false);
  assert.equal(contractUpdates, 1);
  assert.equal(PaymentStatus.successful, "successful");
});
