import dotenv from 'dotenv';
import { PrismaClient, ContractStatus, LicenseStatus, PaymentStatus } from '@prisma/client';
import { licenseDeliveryService } from '../src/modules/licenses/delivery/license-delivery.service.js';

dotenv.config();
const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function findContractsWithoutLicenses() {
  return prisma.contract.findMany({
    where: {
      deletedAt: null,
      status: { in: [ContractStatus.active, ContractStatus.completed] },
      payments: {
        some: {
          status: PaymentStatus.successful,
          deletedAt: null
        }
      },
      licenses: {
        none: {
          deletedAt: null,
          status: LicenseStatus.active
        }
      }
    },
    include: {
      device: true,
      customer: true,
      payments: {
        where: {
          status: PaymentStatus.successful,
          deletedAt: null
        },
        orderBy: { paidAt: 'desc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
}

async function run() {
  try {
    console.log('Looking for contracts with successful payments but no active license...');
    const contracts = await findContractsWithoutLicenses();

    if (contracts.length === 0) {
      console.log('No contracts found that currently need reconciliation.');
      return;
    }

    console.log(`Found ${contracts.length} contract(s) without an active license.`);
    console.log(dryRun ? 'Dry-run mode: no licenses will be issued.' : 'Applying reconciliation jobs...');

    for (const contract of contracts) {
      const payment = contract.payments[0];
      if (!payment) {
        console.warn(`Skipping contract ${contract.id}: no successful payment found.`);
        continue;
      }

      if (!contract.device?.id) {
        console.warn(`Skipping contract ${contract.id}: assigned device is missing.`);
        continue;
      }

      console.log(`\nContract: ${contract.contractNumber} (${contract.id})`);
      console.log(`  Dealer: ${contract.dealerId}`);
      console.log(`  Device: ${contract.device.id}`);
      console.log(`  Customer: ${contract.customerId}`);
      console.log(`  Payment: ${payment.id} (${payment.providerReference})`);
      console.log(`  Status: ${contract.status}`);
      console.log(`  Expected license type: ${contract.status === ContractStatus.completed ? 'permanent' : 'temporary'}`);

      if (!dryRun) {
        try {
          const job = await licenseDeliveryService.enqueueAndProcess(payment.id);
          console.log(`  • Reconciliation job completed: ${job.status} (licenseId=${job.licenseId})`);
        } catch (error) {
          console.error(`  • Reconciliation failed for contract ${contract.id}:`, error instanceof Error ? error.message : error);
        }
      }
    }
  } catch (error) {
    console.error('Reconciliation error:', error instanceof Error ? error.message : error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
