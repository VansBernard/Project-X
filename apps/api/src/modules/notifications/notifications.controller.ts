import type { Request, Response } from "express";
import { listNotificationsForActor, reportDeviceTamperEvent } from "./notifications.service.js";

export const notificationsController = {
  async list(req: Request, res: Response) {
    const roleName = (req as any).auth?.roleName;
    const dealerId = (req as any).auth?.dealerId;

    const notifications = await listNotificationsForActor({ roleName, dealerId });
    return res.status(200).json({ data: notifications });
  },

  async reportTamper(req: Request, res: Response) {
    const dealerId = (req as any).auth?.dealerId;
    const payload = req.body ?? {};

    if (!dealerId) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Dealer context is required." } });
    }

    const result = await reportDeviceTamperEvent({
      dealerId,
      deviceId: payload.deviceId ?? null,
      contractId: payload.contractId ?? null,
      eventType: payload.eventType ?? "DEVICE_TAMPER_EVENT",
      message: payload.message ?? "A device tamper event was reported.",
      occurredAt: payload.occurredAt,
      severity: payload.severity ?? "critical",
      source: payload.source ?? "desktop-device"
    });

    return res.status(201).json({ data: { id: result.id, createdAt: result.createdAt.toISOString() } });
  }
};
