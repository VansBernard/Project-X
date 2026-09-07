import type { Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import { dealerManagementService } from "./dealer-management.service.js";
import type {
  CreateContractInput,
  CompleteRegistrationInput,
  ConfirmDealerSignupInput,
  CreateCustomerInput,
  CreateDealerInput,
  DealerSignupInput,
  ListQueryInput,
  RegisterDeviceInput,
  PayoutBanksQueryInput,
  ResolvePayoutAccountInput,
  SuspendDealerInput,
  UpdateCustomerInput,
  UpdatePayoutDetailsInput,
  UpdateDealerProfileInput
} from "./dealer-management.schemas.js";

function dealerIdFromAuth(req: Request<any, any, any, any>): string {
  if (!req.auth?.dealerId) {
    throw new AppError(401, "UNAUTHENTICATED", "Authenticated dealer context is missing.");
  }

  return req.auth.dealerId;
}

export const dealerManagementController = {
  async signup(req: Request<object, object, DealerSignupInput>, res: Response) {
    const result = await dealerManagementService.signup(req.body);
    return res.status(201).json({ data: result });
  },

  async confirmSignup(req: Request<object, object, ConfirmDealerSignupInput>, res: Response) {
    const result = await dealerManagementService.confirmSignup(req.body.token);
    return res.status(201).json({ data: result });
  },

  async resolvePayoutAccount(req: Request<object, object, ResolvePayoutAccountInput>, res: Response) {
    const result = await dealerManagementService.resolvePayoutAccount(req.body);
    return res.status(200).json({ data: result });
  },

  async payoutBanks(req: Request<object, object, object, PayoutBanksQueryInput>, res: Response) {
    const result = await dealerManagementService.payoutBanks(req.query);
    return res.status(200).json({ data: result });
  },

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

  async updatePayoutDetails(req: Request<object, object, UpdatePayoutDetailsInput>, res: Response) {
    const dealer = await dealerManagementService.updatePayoutDetails(dealerIdFromAuth(req), req.body);
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

  async listDevices(req: Request<object, object, object, ListQueryInput>, res: Response) {
    const result = await dealerManagementService.listDevices(dealerIdFromAuth(req), req.query);
    return res.status(200).json(result);
  },

  async createContract(req: Request<object, object, CreateContractInput>, res: Response) {
    const contract = await dealerManagementService.createContract(dealerIdFromAuth(req), req.body);
    return res.status(201).json({ data: contract });
  },

  async completeRegistration(req: Request<object, object, CompleteRegistrationInput>, res: Response) {
    try {
      console.log("[COMPLETE_REGISTRATION_START]", {
        dealerId: (req as any).auth?.dealerId,
        contractNumber: req.body?.contract?.contractNumber,
        timestamp: new Date().toISOString()
      });

      const result = await dealerManagementService.completeRegistration(dealerIdFromAuth(req), req.body);
      
      console.log("[COMPLETE_REGISTRATION_SUCCESS]", {
        dealerId: (req as any).auth?.dealerId,
        contractNumber: req.body?.contract?.contractNumber,
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({ data: result });
    } catch (error) {
      console.error("[COMPLETE_REGISTRATION_CONTROLLER_ERROR]", {
        dealerId: (req as any).auth?.dealerId,
        contractNumber: req.body?.contract?.contractNumber,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },

  async listPayments(req: Request<object, object, object, ListQueryInput>, res: Response) {
    const result = await dealerManagementService.listPayments(dealerIdFromAuth(req), req.query);
    return res.status(200).json(result);
  },

  async reports(req: Request, res: Response) {
    const result = await dealerManagementService.reports(dealerIdFromAuth(req));
    return res.status(200).json({ data: result });
  },

  async getDealerProfile(req: Request, res: Response) {
    const dealer = await dealerManagementService.getDealerProfile(dealerIdFromAuth(req));
    return res.status(200).json({ data: dealer });
  },

  async updateDealerProfile(req: Request<object, object, UpdateDealerProfileInput>, res: Response) {
    const dealer = await dealerManagementService.updateDealerProfile(dealerIdFromAuth(req), req.body);
    return res.status(200).json({ data: dealer });
  }
};
