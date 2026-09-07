import "./src/config/env.js";
import { env } from "./src/config/env.js";
import { prisma } from "./src/lib/prisma.js";
import { paystackClient } from "./src/modules/payments/paystack.client.js";

const providerCodes: Record<string, string> = {
  MTN: "MTN",
  AIRTELTIGO: "ATL",
  AIRTEL: "ATL",
  TIGO: "ATL",
  TELECEL: "VOD",
  VODAFONE: "VOD",
  VOD: "VOD",
  MPESA: "MPESA"
};

async function main() {
  const dealers = await prisma.dealer.findMany({
    where: {
      payoutMethod: "mobile_money",
      paystackSubaccountCode: null,
      deletedAt: null
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      metadata: true
    }
  });

  for (const dealer of dealers) {
    const metadata = dealer.metadata as Record<string, unknown>;
    const provider = typeof metadata.mobileMoneyProvider === "string"
      ? providerCodes[metadata.mobileMoneyProvider.trim().toUpperCase().replace(/[\s-]+/g, "")]
      : undefined;
    const mobileNumber = typeof metadata.mobileMoneyNumber === "string"
      ? metadata.mobileMoneyNumber.trim()
      : undefined;

    if (!provider || !mobileNumber) {
      console.warn(`Skipped ${dealer.name}: mobile-money provider or number is missing.`);
      continue;
    }

    const subaccount = await paystackClient.createSubaccount({
      businessName: dealer.name,
      settlementBank: provider,
      accountNumber: mobileNumber,
      percentageCharge: env.PLATFORM_COMMISSION_PERCENT,
      primaryContactEmail: dealer.email ?? undefined,
      primaryContactName: dealer.name,
      primaryContactPhone: dealer.phone ?? undefined
    });

    await prisma.dealer.update({
      where: { id: dealer.id },
      data: {
        paystackSubaccountCode: subaccount.data.subaccount_code,
        paystackSubaccountId: String(subaccount.data.id),
        paystackSubaccountStatus: subaccount.data.status,
        paystackSubaccountUpdatedAt: new Date(),
        paystackTransferRecipientCode: null,
        paystackTransferRecipientStatus: null,
        paystackTransferRecipientUpdatedAt: null
      }
    });

    console.log(`Created subaccount ${subaccount.data.subaccount_code} for ${dealer.name}.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
