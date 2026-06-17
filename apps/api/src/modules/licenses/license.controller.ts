import type { Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import { licenseService } from "./license.service.js";
import type { IssueLicenseInput, VerifyLicenseInput } from "./license.schemas.js";

function dealerIdFromAuth(req: Request<any, any, any, any>): string {
  if (!req.auth?.dealerId) {
    throw new AppError(401, "UNAUTHENTICATED", "Authenticated dealer context is missing.");
  }

  return req.auth.dealerId;
}

export const licenseController = {
  async issue(req: Request<object, object, IssueLicenseInput>, res: Response) {
    const license = await licenseService.issue(dealerIdFromAuth(req), req.body);
    return res.status(201).json({ data: license });
  },

  async verify(req: Request<object, object, VerifyLicenseInput>, res: Response) {
    const result = await licenseService.verify(req.body);
    return res.status(200).json({ data: result });
  },

  async detail(req: Request<{ licenseId: string }>, res: Response) {
    const license = await licenseService.detail(dealerIdFromAuth(req), req.params.licenseId);
    return res.status(200).json({ data: license });
  },

  async activeForDevice(req: Request<{ deviceId: string }>, res: Response) {
    const result = await licenseService.activeForDevice(dealerIdFromAuth(req), req.params.deviceId);
    return res.status(200).json({ data: result });
  }
};
