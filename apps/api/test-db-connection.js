import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
console.log("DATABASE_URL:", databaseUrl ? databaseUrl.slice(0, 50) + "..." : "NOT SET");

async function testConnection() {
  const prisma = new PrismaClient();

  try {
    console.log("Attempting to connect to database...");
    const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
    console.log("✅ Database connection successful!");
    console.log("Query result:", result);
  } catch (error) {
    console.error("❌ Database connection failed!");
    console.error("Error:", error.message);
    if (error.code) console.error("Error code:", error.code);
    if (error.meta) console.error("Error meta:", error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
