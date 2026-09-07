/**
 * Dashboard Controller
 * Handles dashboard HTTP requests
 */

import { Request, Response } from "express";
import { DashboardService } from "./dashboard.service.js";
import { AppError } from "../../middleware/error.middleware.js";

export class DashboardController {
  /**
   * GET /api/v1/dashboard/stats
  * Get dashboard statistics for the current dealer, or all dealers for Super Admins
   */
  static async getDashboardStats(req: Request, res: Response) {
    const dealerId = (req as any).auth?.dealerId;

    if (!dealerId) {
      throw new AppError(401, "UNAUTHORIZED", "Dealer ID not found in request");
    }

    const stats = await DashboardService.getDashboardStats(
      (req as any).auth?.roleName === "Super Admin" ? undefined : dealerId
    );
    
    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * GET /api/v1/dashboard/analytics
   * Get analytics data for a date range
   */
  static async getAds(req: Request, res: Response) {
    const dealerId = (req as any).auth?.dealerId;

    if (!dealerId) {
      throw new AppError(401, "UNAUTHORIZED", "Dealer ID not found in request");
    }

    const adsConfig = await DashboardService.getAdsConfig();

    res.json({
      success: true,
      data: {
        adsEnabled: adsConfig.adsEnabled,
        ads: adsConfig.ads,
      },
    });
  }

  static async saveAds(req: Request, res: Response) {
    const dealerId = (req as any).auth?.dealerId;

    if (!dealerId) {
      throw new AppError(401, "UNAUTHORIZED", "Dealer ID not found in request");
    }

    const payload = req.body;
    const adsEnabled = Boolean(payload?.adsEnabled);
    const ads = Array.isArray(payload?.ads)
      ? payload.ads.filter((item: any) => item && typeof item === 'object' && typeof item.imageUrl === 'string' && typeof item.caption === 'string')
      : [];

    const result = await DashboardService.saveAds({ adsEnabled, ads });

    res.json({
      success: true,
      data: result,
    });
  }

  static async getAnalytics(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const dealerId = (req as any).auth?.dealerId;

    if (!dealerId) {
      throw new AppError(401, "UNAUTHORIZED", "Dealer ID not found in request");
    }

    if (!startDate || !endDate) {
      throw new AppError(400, "BAD_REQUEST", "startDate and endDate query parameters are required");
    }

    // Validate date format
    const start = new Date(String(startDate));
    const end = new Date(String(endDate));

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError(400, "BAD_REQUEST", "Invalid date format. Use ISO format (YYYY-MM-DD)");
    }

    if (start > end) {
      throw new AppError(400, "BAD_REQUEST", "startDate must be before or equal to endDate");
    }

    const analyticsData = await DashboardService.getAnalyticsData(dealerId, {
      startDate: String(startDate),
      endDate: String(endDate),
    });

    res.json({
      success: true,
      data: analyticsData,
    });
  }
}
