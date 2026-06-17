import { Router } from "express";
import { authenticate, requirePermission, requireRole } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { validate } from "../../middleware/validate.js";
import { Permissions, Roles } from "../auth/auth.constants.js";
import { contractManagementController } from "./contract-management.controller.js";
import {
  contractParamsSchema,
  createContractSchema,
  listContractsQuerySchema,
  updateContractStatusSchema
} from "./contract-management.schemas.js";

export const contractManagementRouter = Router();

const contractReadRoles = [Roles.SuperAdmin, Roles.Dealer, Roles.SalesAgent];
const contractManageRoles = [Roles.SuperAdmin, Roles.Dealer];

contractManagementRouter.use(authenticate);

contractManagementRouter.post(
  "/contracts",
  requireRole(...contractManageRoles),
  requirePermission(Permissions.ContractsManage),
  validate(createContractSchema),
  asyncHandler(contractManagementController.create)
);

contractManagementRouter.get(
  "/contracts",
  requireRole(...contractReadRoles),
  requirePermission(Permissions.ContractsRead),
  validate(listContractsQuerySchema, "query"),
  asyncHandler(contractManagementController.list)
);

contractManagementRouter.get(
  "/contracts/:contractId",
  requireRole(...contractReadRoles),
  requirePermission(Permissions.ContractsRead),
  validate(contractParamsSchema, "params"),
  asyncHandler(contractManagementController.detail)
);

contractManagementRouter.patch(
  "/contracts/:contractId/status",
  requireRole(...contractManageRoles),
  requirePermission(Permissions.ContractsStatus),
  validate(contractParamsSchema, "params"),
  validate(updateContractStatusSchema),
  asyncHandler(contractManagementController.updateStatus)
);

contractManagementRouter.get(
  "/contracts/:contractId/schedule",
  requireRole(...contractReadRoles),
  requirePermission(Permissions.ContractsRead),
  validate(contractParamsSchema, "params"),
  asyncHandler(contractManagementController.schedule)
);

