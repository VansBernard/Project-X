import { Router } from "express";
import { authenticate, requirePermission, requireRole } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { validate } from "../../middleware/validate.js";
import { Permissions, Roles } from "../auth/auth.constants.js";
import { customerManagementController } from "./customer-management.controller.js";
import {
  createCustomerProfileSchema,
  customerParamsSchema,
  customerSearchQuerySchema,
  updateCustomerProfileSchema
} from "./customer-management.schemas.js";

export const customerManagementRouter = Router();

const customerOperatorRoles = [Roles.SuperAdmin, Roles.Dealer, Roles.SalesAgent];

customerManagementRouter.use(authenticate);

customerManagementRouter.post(
  "/customers",
  requireRole(...customerOperatorRoles),
  requirePermission(Permissions.CustomersCreate),
  validate(createCustomerProfileSchema),
  asyncHandler(customerManagementController.createProfile)
);

customerManagementRouter.get(
  "/customers",
  requireRole(...customerOperatorRoles),
  requirePermission(Permissions.CustomersRead),
  validate(customerSearchQuerySchema, "query"),
  asyncHandler(customerManagementController.search)
);

customerManagementRouter.get(
  "/customers/:customerId",
  requireRole(...customerOperatorRoles),
  requirePermission(Permissions.CustomersRead),
  validate(customerParamsSchema, "params"),
  asyncHandler(customerManagementController.profile)
);

customerManagementRouter.patch(
  "/customers/:customerId",
  requireRole(...customerOperatorRoles),
  requirePermission(Permissions.CustomersManage),
  validate(customerParamsSchema, "params"),
  validate(updateCustomerProfileSchema),
  asyncHandler(customerManagementController.updateProfile)
);

customerManagementRouter.get(
  "/customers/:customerId/contracts",
  requireRole(...customerOperatorRoles),
  requirePermission(Permissions.CustomersHistoryRead),
  validate(customerParamsSchema, "params"),
  asyncHandler(customerManagementController.contractHistory)
);

customerManagementRouter.get(
  "/customers/:customerId/payments",
  requireRole(...customerOperatorRoles),
  requirePermission(Permissions.PaymentsRead),
  validate(customerParamsSchema, "params"),
  asyncHandler(customerManagementController.paymentHistory)
);

customerManagementRouter.get(
  "/customers/:customerId/devices",
  requireRole(...customerOperatorRoles),
  requirePermission(Permissions.CustomersHistoryRead),
  validate(customerParamsSchema, "params"),
  asyncHandler(customerManagementController.assignedDevices)
);
