import { processReconciliationCandidates, closeReconciliation } from './license-reconciliation-core.mjs';

const limit = Number(process.env.LICENSE_RECONCILIATION_LIMIT ?? 100);

async function run() {
  try {
    await processReconciliationCandidates(true, limit);
  } catch (error) {
    console.error('Scheduled license reconciliation failed:', error instanceof Error ? error.message : error);
  } finally {
    await closeReconciliation();
  }
}

run();
