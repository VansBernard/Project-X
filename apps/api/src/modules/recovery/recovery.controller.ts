import type { Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import { recoveryService } from "./recovery.service.js";
import type { CreateRecoveryAuthorizationInput } from "./recovery.schemas.js";

export const recoveryController = {
  async createAuthorization(req: Request<object, object, CreateRecoveryAuthorizationInput>, res: Response) {
    if (!req.auth?.dealerId || !req.auth.sub) {
      throw new AppError(401, "UNAUTHENTICATED", "Authenticated dealer context is missing.");
    }

    const result = await recoveryService.createAuthorization(req.auth.dealerId, req.auth.sub, req.body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    return res.status(201).json({ data: result });
  }
};