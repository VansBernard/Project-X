import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const dealers = await prisma.dealer.findMany();
    console.log("✅ Dealers found:", dealers.length);
    if (dealers.length > 0) {
      console.log("   First dealer:", dealers[0]);
    }
    
    const users = await prisma.user.findMany();
    console.log("✅ Users found:", users.length);
    if (users.length > 0) {
      console.log("   First user:", users[0]);
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
