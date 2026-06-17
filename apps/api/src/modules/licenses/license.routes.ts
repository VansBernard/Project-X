import { Router } from "express";
import { authenticate, requirePermission, requireRole } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { validate } from "../../middleware/validate.js";
import { Permissions, Roles } from "../auth/auth.constants.js";
import { licenseDeliveryController } from "./delivery/license-delivery.controller.js";
import { licenseController } from "./license.controller.js";
import {
  deviceLicenseParamsSchema,
  issueLicenseSchema,
  licenseParamsSchema,
  verifyLicenseSchema
} from "./license.schemas.js";

export const licenseRouter = Router();

const licenseOperatorRoles = [Roles.SuperAdmin, Roles.Dealer];

licenseRouter.use(authenticate);

licenseRouter.post(
  "/licenses",
  requireRole(...licenseOperatorRoles),
  requirePermission(Permissions.LicensesIssue),
  validate(issueLicenseSchema),
  asyncHandler(licenseController.issue)
);

licenseRouter.post(
  "/licenses/verify",
  requireRole(...licenseOperatorRoles),
  requirePermission(Permissions.LicensesVerify),
  validate(verifyLicenseSchema),
  asyncHandler(licenseController.verify)
);

licenseRouter.get(
  "/licenses/:licenseId",
  requireRole(...licenseOperatorRoles),
  requirePermission(Permissions.LicensesRead),
  validate(licenseParamsSchema, "params"),
  asyncHandler(licenseController.detail)
);

licenseRouter.get(
  "/devices/:deviceId/license",
  requireRole(...licenseOperatorRoles),
  requirePermission(Permissions.LicensesRead),
  validate(deviceLicenseParamsSchema, "params"),
  asyncHandler(licenseController.activeForDevice)
);

licenseRouter.post(
  "/licenses/delivery/retries/process",
  requireRole(...licenseOperatorRoles),
  requirePermission(Permissions.LicensesDeliveryRetry),
  asyncHandler(licenseDeliveryController.processDueRetries)
);
