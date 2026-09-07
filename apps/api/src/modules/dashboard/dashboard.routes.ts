/**
 * Dashboard Routes
 * Defines dashboard API endpoints
 */

import { Router, type Request, type Response } from "express";
import { DashboardController } from "./dashboard.controller.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { authenticate, requirePermission, requireRole } from "../../middleware/auth.middleware.js";
import { Permissions, Roles } from "../auth/auth.constants.js";

export const dashboardRouter = Router();

// All dashboard routes require authentication
dashboardRouter.use(authenticate);

/**
 * GET /dashboard/stats
 * Get dashboard statistics
 */
dashboardRouter.get(
  "/dashboard/stats",
  asyncHandler((req: Request, res: Response) => DashboardController.getDashboardStats(req, res))
);

dashboardRouter.get(
  "/dashboard/ads",
  asyncHandler((req: Request, res: Response) => DashboardController.getAds(req, res))
);

dashboardRouter.post(
  "/dashboard/ads",
  requireRole(Roles.SuperAdmin),
  requirePermission(Permissions.PlatformManage),
  asyncHandler((req: Request, res: Response) => DashboardController.saveAds(req, res))
);

/**
 * GET /analytics
 * Get analytics data for a date range
 * Query params: startDate, endDate (ISO format: YYYY-MM-DD)
 */
dashboardRouter.get(
  "/analytics",
  asyncHandler((req: Request, res: Response) => DashboardController.getAnalytics(req, res))
);
