import type { Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import { contractManagementService } from "./contract-management.service.js";
import type {
  CancelPlanDecisionInput,
  CancelPlanRequestInput,
  CreateContractInput,
  ListContractsQuery,
  UpdateContractStatusInput
} from "./contract-management.schemas.js";

function dealerIdFromAuth(req: Request<any, any, any, any>): string {
  if (!req.auth?.dealerId) {
    throw new AppError(401, "UNAUTHENTICATED", "Authenticated dealer context is missing.");
  }

  return req.auth.dealerId;
}

export const contractManagementController = {
  async create(req: Request<object, object, CreateContractInput>, res: Response) {
    const contract = await contractManagementService.create(dealerIdFromAuth(req), req.body);
    return res.status(201).json({ data: contract });
  },

  async list(req: Request<object, object, object, ListContractsQuery>, res: Response) {
    const result = await contractManagementService.list(dealerIdFromAuth(req), req.query);
    return res.status(200).json(result);
  },

  async detail(req: Request<{ contractId: string }>, res: Response) {
    const contract = await contractManagementService.detail(dealerIdFromAuth(req), req.params.contractId);
    return res.status(200).json({ data: contract });
  },

  async updateStatus(req: Request<{ contractId: string }, object, UpdateContractStatusInput>, res: Response) {
    const contract = await contractManagementService.updateStatus(
      dealerIdFromAuth(req),
      req.params.contractId,
      req.body
    );
    return res.status(200).json({ data: contract });
  },

  async requestCancellation(req: Request<object, object, CancelPlanRequestInput>, res: Response) {
    const contract = await contractManagementService.requestCancellation(dealerIdFromAuth(req), req.body);
    return res.status(202).json({ data: contract });
  },

  async cancellationRequest(req: Request<{ contractId: string }>, res: Response) {
    const request = await contractManagementService.cancellationRequest(dealerIdFromAuth(req), req.params.contractId);
    return res.status(200).json({ data: request });
  },

  async decideCancellation(req: Request<{ contractId: string }, object, CancelPlanDecisionInput>, res: Response) {
    const contract = await contractManagementService.decideCancellation(
      dealerIdFromAuth(req),
      req.params.contractId,
      req.body
    );
    return res.status(200).json({ data: contract });
  },

  async schedule(req: Request<{ contractId: string }>, res: Response) {
    const installments = await contractManagementService.schedule(dealerIdFromAuth(req), req.params.contractId);
    return res.status(200).json({ data: installments });
  }
};
