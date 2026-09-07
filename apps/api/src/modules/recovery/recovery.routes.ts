import { Router } from "express";
import { authenticate, requirePermission, requireRole } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { validate } from "../../middleware/validate.js";
import { Permissions, Roles } from "../auth/auth.constants.js";
import { recoveryController } from "./recovery.controller.js";
import { createRecoveryAuthorizationSchema } from "./recovery.schemas.js";

export const recoveryRouter = Router();

recoveryRouter.use(authenticate);
recoveryRouter.post(
  "/devices/recovery/authorize",
  requireRole(Roles.SuperAdmin, Roles.Dealer),
  requirePermission(Permissions.DevicesRecover),
  validate(createRecoveryAuthorizationSchema),
  asyncHandler(recoveryController.createAuthorization)
);