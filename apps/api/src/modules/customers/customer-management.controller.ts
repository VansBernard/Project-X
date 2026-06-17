import type { Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import { customerManagementService } from "./customer-management.service.js";
import type {
  CreateCustomerProfileInput,
  CustomerSearchQuery,
  UpdateCustomerProfileInput
} from "./customer-management.schemas.js";

function dealerIdFromAuth(req: Request<any, any, any, any>): string {
  if (!req.auth?.dealerId) {
    throw new AppError(401, "UNAUTHENTICATED", "Authenticated dealer context is missing.");
  }

  return req.auth.dealerId;
}

export const customerManagementController = {
  async createProfile(req: Request<object, object, CreateCustomerProfileInput>, res: Response) {
    const customer = await customerManagementService.createProfile(dealerIdFromAuth(req), req.body);
    return res.status(201).json({ data: customer });
  },

  async profile(req: Request<{ customerId: string }>, res: Response) {
    const customer = await customerManagementService.profile(dealerIdFromAuth(req), req.params.customerId);
    return res.status(200).json({ data: customer });
  },

  async updateProfile(req: Request<{ customerId: string }, object, UpdateCustomerProfileInput>, res: Response) {
    const customer = await customerManagementService.updateProfile(
      dealerIdFromAuth(req),
      req.params.customerId,
      req.body
    );
    return res.status(200).json({ data: customer });
  },

  async search(req: Request<object, object, object, CustomerSearchQuery>, res: Response) {
    const result = await customerManagementService.search(dealerIdFromAuth(req), req.query);
    return res.status(200).json(result);
  },

  async contractHistory(req: Request<{ customerId: string }>, res: Response) {
    const contracts = await customerManagementService.contractHistory(
      dealerIdFromAuth(req),
      req.params.customerId
    );
    return res.status(200).json({ data: contracts });
  },

  async paymentHistory(req: Request<{ customerId: string }>, res: Response) {
    const payments = await customerManagementService.paymentHistory(
      dealerIdFromAuth(req),
      req.params.customerId
    );
    return res.status(200).json({ data: payments });
  },

  async assignedDevices(req: Request<{ customerId: string }>, res: Response) {
    const devices = await customerManagementService.assignedDevices(
      dealerIdFromAuth(req),
      req.params.customerId
    );
    return res.status(200).json({ data: devices });
  }
};
