import type { DashboardStats } from './api';

export interface DashboardSnapshot {
  collected: number;
  pending: number;
  collectionRate: number;
}

export function getDashboardSnapshot(stats: DashboardStats | null | undefined): DashboardSnapshot {
  const collected = stats?.totalRevenue ?? 0;
  const pending = stats?.outstandingBalance ?? 0;
  const total = collected + pending;
  const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0;

  return {
    collected,
    pending,
    collectionRate,
  };
}
