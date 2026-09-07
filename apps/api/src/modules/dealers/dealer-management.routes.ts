import { Router } from "express";
import { authenticate, requirePermission, requireRole } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { rateLimit } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.js";
import { Permissions, Roles } from "../auth/auth.constants.js";
import { dealerManagementController } from "./dealer-management.controller.js";
import {
  createContractSchema,
  completeRegistrationSchema,
  confirmDealerSignupSchema,
  createCustomerSchema,
  createDealerSchema,
  customerIdParamsSchema,
  dealerSignupSchema,
  dealerIdParamsSchema,
  listQuerySchema,
  payoutBanksQuerySchema,
  registerDeviceSchema,
  resolvePayoutAccountSchema,
  suspendDealerSchema,
  updatePayoutDetailsSchema,
  updateDealerProfileSchema,
  updateCustomerSchema
} from "./dealer-management.schemas.js";

export const dealerManagementRouter = Router();

const signupAttemptLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10 });

const dealerOperatorRoles = [Roles.SuperAdmin, Roles.Dealer, Roles.SalesAgent];

dealerManagementRouter.post(
  "/dealers/signup",
  signupAttemptLimit,
  validate(dealerSignupSchema),
  asyncHandler(dealerManagementController.signup)
);

dealerManagementRouter.post(
  "/dealers/signup/confirm",
  signupAttemptLimit,
  validate(confirmDealerSignupSchema),
  asyncHandler(dealerManagementController.confirmSignup)
);

dealerManagementRouter.get(
  "/dealers/payout-banks",
  validate(payoutBanksQuerySchema, "query"),
  asyncHandler(dealerManagementController.payoutBanks)
);

dealerManagementRouter.post(
  "/dealers/payout-account/resolve",
  validate(resolvePayoutAccountSchema),
  asyncHandler(dealerManagementController.resolvePayoutAccount)
);

dealerManagementRouter.use(authenticate);

dealerManagementRouter.get(
  "/dealer/profile",
  requireRole(Roles.SuperAdmin, Roles.Dealer),
  asyncHandler(dealerManagementController.getDealerProfile)
);

dealerManagementRouter.patch(
  "/dealer/profile",
  requireRole(Roles.SuperAdmin, Roles.Dealer),
  validate(updateDealerProfileSchema),
  asyncHandler(dealerManagementController.updateDealerProfile)
);

dealerManagementRouter.patch(
  "/dealer/payout-details",
  requireRole(Roles.SuperAdmin, Roles.Dealer),
  requirePermission(Permissions.PaymentsInitialize),
  validate(updatePayoutDetailsSchema),
  asyncHandler(dealerManagementController.updatePayoutDetails)
);

dealerManagementRouter.get(
  "/admin/dealers",
  requireRole(Roles.SuperAdmin),
  requirePermission(Permissions.DealersStatistics),
  validate(listQuerySchema, "query"),
  asyncHandler(dealerManagementController.listDealers)
);

dealerManagementRouter.post(
  "/admin/dealers",
  requireRole(Roles.SuperAdmin),
  requirePermission(Permissions.DealersCreate),
  validate(createDealerSchema),
  asyncHandler(dealerManagementController.createDealer)
);

dealerManagementRouter.post(
  "/admin/dealers/:dealerId/suspend",
  requireRole(Roles.SuperAdmin),
  requirePermission(Permissions.DealersSuspend),
  validate(dealerIdParamsSchema, "params"),
  validate(suspendDealerSchema),
  asyncHandler(dealerManagementController.suspendDealer)
);

dealerManagementRouter.delete(
  "/admin/dealers/:dealerId",
  requireRole(Roles.SuperAdmin),
  requirePermission(Permissions.DealersDelete),
  validate(dealerIdParamsSchema, "params"),
  asyncHandler(dealerManagementController.deleteDealer)
);

dealerManagementRouter.get(
  "/admin/dealers/:dealerId/statistics",
  requireRole(Roles.SuperAdmin),
  requirePermission(Permissions.DealersStatistics),
  validate(dealerIdParamsSchema, "params"),
  asyncHandler(dealerManagementController.dealerStatistics)
);

dealerManagementRouter.post(
  "/dealer/customers",
  requireRole(...dealerOperatorRoles),
  requirePermission(Permissions.CustomersCreate),
  validate(createCustomerSchema),
  asyncHandler(dealerManagementController.createCustomer)
);

dealerManagementRouter.get(
  "/dealer/customers",
  requireRole(...dealerOperatorRoles),
  requirePermission(Permissions.CustomersRead),
  validate(listQuerySchema, "query"),
  asyncHandler(dealerManagementController.listCustomers)
);

dealerManagementRouter.patch(
  "/dealer/customers/:customerId",
  requireRole(...dealerOperatorRoles),
  requirePermission(Permissions.CustomersManage),
  validate(customerIdParamsSchema, "params"),
  validate(updateCustomerSchema),
  asyncHandler(dealerManagementController.updateCustomer)
);

dealerManagementRouter.post(
  "/dealer/devices",
  requireRole(...dealerOperatorRoles),
  requirePermission(Permissions.DevicesRegister),
  validate(registerDeviceSchema),
  asyncHandler(dealerManagementController.registerDevice)
);

dealerManagementRouter.get(
  "/dealer/devices",
  requireRole(...dealerOperatorRoles),
  requirePermission(Permissions.CustomersRead),
  validate(listQuerySchema, "query"),
  asyncHandler(dealerManagementController.listDevices)
);

dealerManagementRouter.post(
  "/dealer/registrations",
  requireRole(Roles.SuperAdmin, Roles.Dealer),
  requirePermission(Permissions.ContractsCreate),
  validate(completeRegistrationSchema),
  asyncHandler(dealerManagementController.completeRegistration)
);

dealerManagementRouter.post(
  "/dealer/contracts",
  requireRole(Roles.SuperAdmin, Roles.Dealer),
  requirePermission(Permissions.ContractsCreate),
  validate(createContractSchema),
  asyncHandler(dealerManagementController.createContract)
);

dealerManagementRouter.get(
  "/dealer/payments",
  requireRole(...dealerOperatorRoles),
  requirePermission(Permissions.PaymentsRead),
  validate(listQuerySchema, "query"),
  asyncHandler(dealerManagementController.listPayments)
);

dealerManagementRouter.get(
  "/dealer/reports",
  requireRole(Roles.SuperAdmin, Roles.Dealer),
  requirePermission(Permissions.ReportsRead),
  asyncHandler(dealerManagementController.reports)
);
