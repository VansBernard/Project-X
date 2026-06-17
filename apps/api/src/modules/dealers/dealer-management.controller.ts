import type { Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import { dealerManagementService } from "./dealer-management.service.js";
import type {
  CreateContractInput,
  CreateCustomerInput,
  CreateDealerInput,
  ListQueryInput,
  RegisterDeviceInput,
  SuspendDealerInput,
  UpdateCustomerInput
} from "./dealer-management.schemas.js";

function dealerIdFromAuth(req: Request<any, any, any, any>): string {
  if (!req.auth?.dealerId) {
    throw new AppError(401, "UNAUTHENTICATED", "Authenticated dealer context is missing.");
  }

  return req.auth.dealerId;
}

export const dealerManagementController = {
  async createDealer(req: Request<object, object, CreateDealerInput>, res: Response) {
    const dealer = await dealerManagementService.createDealer(req.body);
    return res.status(201).json({ data: dealer });
  },

  async suspendDealer(req: Request<{ dealerId: string }, object, SuspendDealerInput>, res: Response) {
    const dealer = await dealerManagementService.suspendDealer(req.params.dealerId, req.body);
    return res.status(200).json({ data: dealer });
  },

  async deleteDealer(req: Request<{ dealerId: string }>, res: Response) {
    const dealer = await dealerManagementService.deleteDealer(req.params.dealerId);
    return res.status(200).json({ data: dealer });
  },

  async listDealers(req: Request<object, object, object, ListQueryInput>, res: Response) {
    const result = await dealerManagementService.listDealers(req.query);
    return res.status(200).json(result);
  },

  async dealerStatistics(req: Request<{ dealerId: string }>, res: Response) {
    const result = await dealerManagementService.dealerStatistics(req.params.dealerId);
    return res.status(200).json({ data: result });
  },

  async createCustomer(req: Request<object, object, CreateCustomerInput>, res: Response) {
    const customer = await dealerManagementService.createCustomer(dealerIdFromAuth(req), req.body);
    return res.status(201).json({ data: customer });
  },

  async listCustomers(req: Request<object, object, object, ListQueryInput>, res: Response) {
    const result = await dealerManagementService.listCustomers(dealerIdFromAuth(req), req.query);
    return res.status(200).json(result);
  },

  async updateCustomer(req: Request<{ customerId: string }, object, UpdateCustomerInput>, res: Response) {
    const customer = await dealerManagementService.updateCustomer(
      dealerIdFromAuth(req),
      req.params.customerId,
      req.body
    );
    return res.status(200).json({ data: customer });
  },

  async registerDevice(req: Request<object, object, RegisterDeviceInput>, res: Response) {
    const device = await dealerManagementService.registerDevice(dealerIdFromAuth(req), req.body);
    return res.status(201).json({ data: device });
  },

  async createContract(req: Request<object, object, CreateContractInput>, res: Response) {
    const contract = await dealerManagementService.createContract(dealerIdFromAuth(req), req.body);
    return res.status(201).json({ data: contract });
  },

  async listPayments(req: Request<object, object, object, ListQueryInput>, res: Response) {
    const result = await dealerManagementService.listPayments(dealerIdFromAuth(req), req.query);
    return res.status(200).json(result);
  },

  async reports(req: Request, res: Response) {
    const result = await dealerManagementService.reports(dealerIdFromAuth(req));
    return res.status(200).json({ data: result });
  }
};
