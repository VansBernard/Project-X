import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const [row] = await prisma.$queryRaw`SELECT is_nullable FROM information_schema.columns WHERE table_name='licenses' AND column_name='contract_id'`;
  console.log(JSON.stringify(row, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
