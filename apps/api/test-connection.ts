import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Testing database connection...");
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log("✅ Connection successful! Server time:", result);
  } catch (error) {
    console.error("❌ Connection failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
