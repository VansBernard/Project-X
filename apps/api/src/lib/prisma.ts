import { PrismaClient } from "@prisma/client";
import { prismaDatabaseUrl } from "./database-url.js";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prismaDatabaseUrl()
    }
  },
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});
