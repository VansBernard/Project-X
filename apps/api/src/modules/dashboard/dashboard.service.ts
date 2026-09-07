/**
 * Dashboard Service
 * Handles dashboard statistics and analytics calculations
 */

import { prisma } from "../../lib/prisma.js";
import {
  DashboardStatsResponse,
  AnalyticsDataResponse,
  Transaction,
  AnalyticsQuery,
} from "./dashboard.types.js";
import { buildDashboardAdsValue, normalizeDashboardAdsConfig } from "./dashboard.ads.js";

const DASHBOARD_ADS_SETTING_KEY = "dashboard_ads";

export class DashboardService {
  /**
   * Get dashboard statistics for a dealer
   */
  static async getDashboardStats(dealerId?: string): Promise<DashboardStatsResponse> {
    const dealerScope = dealerId ? { dealerId } : {};
    const [
      payments,
      contracts,
      licenses,
      devices,
      recentPayments,
      dealerCount,
    ] = await Promise.all([
      // Get all successful payments for total revenue
      prisma.payment.findMany({
        where: {
          ...dealerScope,
          status: "successful",
          deletedAt: null,
        },
        select: { amount: true },
      }),
      // Get active contracts
      prisma.contract.findMany({
        where: {
          ...dealerScope,
          status: "active",
          deletedAt: null,
        },
        select: { remainingBalance: true },
      }),
      // Get issued licenses count
      prisma.license.findMany({
        where: {
          ...dealerScope,
          status: { in: ["active", "pending"] },
          deletedAt: null,
        },
        select: { id: true },
      }),
      // Get active devices
      prisma.device.findMany({
        where: {
          ...dealerScope,
          status: { in: ["active", "assigned"] },
          deletedAt: null,
        },
        select: { id: true },
      }),
      // Get recent transactions
      prisma.payment.findMany({
        where: {
          ...dealerScope,
          deletedAt: null,
        },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          customer: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.dealer.count({
        where: dealerId ? { id: dealerId } : undefined,
      }),
    ]);

    // Calculate totals
    const totalRevenue = payments.reduce(
      (sum: number, p: any) => sum + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount),
      0
    );

    const outstandingBalance = contracts.reduce(
      (sum: number, c: any) => sum + (typeof c.remainingBalance === "string" ? parseFloat(c.remainingBalance) : c.remainingBalance),
      0
    );

    // Map recent payments to transactions
    const recentTransactions: Transaction[] = recentPayments.map((p: any) => ({
      id: p.id,
      type: "payment",
      amount: typeof p.amount === "string" ? parseFloat(p.amount) : p.amount,
      description: `Payment from ${p.customer?.firstName || ""} ${p.customer?.lastName || ""}`.trim(),
      date: p.createdAt.toISOString(),
      status: (p.status === "successful" ? "success" : p.status) as "success" | "pending" | "failed",
    }));

    const adsConfig = await this.getAdsConfig();

    return {
      dealerCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      activeDevices: devices.length,
      activeContracts: contracts.length,
      licensesIssued: licenses.length,
      adsEnabled: adsConfig.adsEnabled,
      ads: adsConfig.ads,
      recentTransactions,
    };
  }

  static async getAdsConfig() {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: DASHBOARD_ADS_SETTING_KEY },
      select: { value: true },
    });

    return normalizeDashboardAdsConfig(setting?.value ?? {});
  }

  static async saveAds(input: { adsEnabled: boolean; ads: Array<{ id: string; imageUrl: string; caption: string }> }) {
    const value = buildDashboardAdsValue({ adsEnabled: input.adsEnabled, ads: input.ads });

    await prisma.platformSetting.upsert({
      where: { key: DASHBOARD_ADS_SETTING_KEY },
      create: { key: DASHBOARD_ADS_SETTING_KEY, value: value as object },
      update: { value: value as object },
    });

    return {
      adsEnabled: input.adsEnabled,
      ads: input.ads,
    };
  }

  /**
   * Get analytics data for a date range
   */
  static async getAnalyticsData(
    dealerId: string,
    query: AnalyticsQuery
  ): Promise<AnalyticsDataResponse[]> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Get all payments in the date range
    const payments = await prisma.payment.findMany({
      where: {
        dealerId,
        status: "successful",
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      select: { amount: true, paidAt: true },
    });

    // Get all active contracts created in the date range
    const contracts = await prisma.contract.findMany({
      where: {
        dealerId,
        status: "active",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      select: { createdAt: true },
    });

    // Get all licenses issued in the date range
    const licenses = await prisma.license.findMany({
      where: {
        dealerId,
        status: "active",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      select: { createdAt: true },
    });

    // Get all active devices on each day
    const devices = await prisma.device.findMany({
      where: {
        dealerId,
        status: { in: ["active", "assigned"] },
        deletedAt: null,
      },
      select: { id: true },
    });

    // Group data by date
    const dataByDate = new Map<string, AnalyticsDataResponse>();

    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dataByDate.set(dateStr, {
        date: dateStr,
        revenue: 0,
        newDeals: 0,
        licensesIssued: 0,
        devicesActive: devices.length,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate payments by date
    payments.forEach((payment: any) => {
      const dateStr = payment.paidAt?.toISOString().split("T")[0];
      if (dateStr && dataByDate.has(dateStr)) {
        const data = dataByDate.get(dateStr)!;
        data.revenue += typeof payment.amount === "string" ? parseFloat(payment.amount) : payment.amount;
      }
    });

    // Aggregate contracts by date
    contracts.forEach((contract: any) => {
      const dateStr = contract.createdAt.toISOString().split("T")[0];
      if (dateStr && dataByDate.has(dateStr)) {
        const data = dataByDate.get(dateStr)!;
        data.newDeals++;
      }
    });

    // Aggregate licenses by date
    licenses.forEach((license: any) => {
      const dateStr = license.createdAt.toISOString().split("T")[0];
      if (dateStr && dataByDate.has(dateStr)) {
        const data = dataByDate.get(dateStr)!;
        data.licensesIssued++;
      }
    });

    // Convert to array and sort by date
    return Array.from(dataByDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }
}
