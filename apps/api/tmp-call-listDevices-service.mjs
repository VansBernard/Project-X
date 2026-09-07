import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { dealerManagementService } = await import('./src/modules/dealers/dealer-management.service.js');

async function main() {
  const dealerId = '17a8dd3d-1e62-417a-b7c2-f980e3432e6a';
  const res = await dealerManagementService.listDevices(dealerId, { take: 100 });
  console.log(JSON.stringify(res.data.slice(0,5), null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
