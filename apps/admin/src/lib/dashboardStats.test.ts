import { describe, expect, it } from 'vitest';
import { getDashboardSnapshot } from './dashboardStats';

describe('getDashboardSnapshot', () => {
  it('calculates collection totals and percentage from dashboard stats', () => {
    const snapshot = getDashboardSnapshot({
      totalRevenue: 1200,
      outstandingBalance: 800,
      activeDevices: 2,
      activeContracts: 1,
      licensesIssued: 3,
      dealerCount: 1,
      recentTransactions: [],
    });

    expect(snapshot.collected).toBe(1200);
    expect(snapshot.pending).toBe(800);
    expect(snapshot.collectionRate).toBe(60);
  });

  it('returns zeros when stats are missing', () => {
    const snapshot = getDashboardSnapshot(null);

    expect(snapshot).toEqual({
      collected: 0,
      pending: 0,
      collectionRate: 0,
    });
  });
});
