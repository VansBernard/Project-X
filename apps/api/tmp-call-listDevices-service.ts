import 'dotenv/config';
import { dealerManagementService } from './src/modules/dealers/dealer-management.service.js';

async function main() {
  const dealerId = '17a8dd3d-1e62-417a-b7c2-f980e3432e6a';
  const response = await dealerManagementService.listDevices(dealerId, { take: 100 });
  console.log(JSON.stringify(response.data.slice(0, 5), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});