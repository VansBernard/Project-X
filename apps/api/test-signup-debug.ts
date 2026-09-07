import { dealerManagementService } from "./src/modules/dealers/dealer-management.service.js";

const signupInput = {
  dealer: {
    name: "Heats",
    slug: "heats",
    email: "Kingsleywest32@gmail.com",
    phone: "0206731369",
    country: "GH",
    timezone: "Africa/Accra",
    metadata: {
      payoutMethod: "mobile_money",
      mobileMoneyProvider: "Telecel Cash",
      mobileMoneyNumber: "0206731369",
      currency: "GHS"
    }
  },
  owner: {
    email: "Kingsleywest32@gmail.com",
    password: "1234567890",
    firstName: "Bernard",
    lastName: "Nyarko Daniels",
    phone: "0206731369"
  }
};

(async () => {
  try {
    console.log("Attempting signup with data:", JSON.stringify(signupInput, null, 2));
    const result = await dealerManagementService.signup(signupInput);
    console.log("✅ Signup successful:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Signup failed:");
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
      console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
})().finally(() => {
  const { prisma } = require("./src/lib/prisma.js");
  prisma.$disconnect();
});
