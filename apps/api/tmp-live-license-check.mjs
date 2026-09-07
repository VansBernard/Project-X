import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { PrismaClient, ContractStatus } from "@prisma/client";
import { licenseService } from "./src/modules/licenses/license.service.js";
const prisma = new PrismaClient();
async function main() {
  const contract = await prisma.contract.findFirst({
    where: { deletedAt: null, status: ContractStatus.active, deviceId: { not: null } },
    include: { customer: true, device: true }
  });
  if (!contract) {
    console.log("NO_ACTIVE_CONTRACT");
    await prisma.$disconnect();
    return;
  }
  console.log("FOUND_CONTRACT", { id: contract.id, dealerId: contract.dealerId, deviceId: contract.deviceId, customerId: contract.customerId });
  const license = await licenseService.issue(contract.dealerId, {
    deviceId: contract.deviceId,
    contractId: contract.id,
    licenseType: "temporary",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    metadata: { verificationTest: true }
  });
  console.log("LICENSE_CREATED", { id: license.id, contractId: license.contractId, deviceId: license.deviceId, licenseKey: license.licenseKey, status: license.status, expiresAt: license.expiresAt });
  const reloaded = await prisma.license.findUnique({ where: { id: license.id } });
  console.log("RELOADED_LICENSE", reloaded ? { id: reloaded.id, contractId: reloaded.contractId, deviceId: reloaded.deviceId, status: reloaded.status } : null);
  await prisma.$disconnect();
}
main().catch(e => {
  console.error("ERROR", e);
  process.exit(1);
});
