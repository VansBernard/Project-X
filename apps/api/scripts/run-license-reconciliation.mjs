import { processReconciliationCandidates, closeReconciliation } from './license-reconciliation-core.mjs';

const dryRun = !process.argv.includes('--apply');

async function run() {
  try {
    await processReconciliationCandidates(dryRun);
  } catch (error) {
    console.error('Reconciliation run failed:', error instanceof Error ? error.message : error);
  } finally {
    await closeReconciliation();
  }
}

run();
