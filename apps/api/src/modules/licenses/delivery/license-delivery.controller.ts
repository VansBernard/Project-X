import type { Request, Response } from "express";
import { licenseDeliveryService } from "./license-delivery.service.js";

export const licenseDeliveryController = {
  async processDueRetries(_req: Request, res: Response) {
    const results = await licenseDeliveryService.processDueRetries();
    return res.status(200).json({ data: results });
  }
};

