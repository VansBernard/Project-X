import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { notificationsController } from "./notifications.controller.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);
notificationsRouter.get("/notifications", asyncHandler(notificationsController.list));
notificationsRouter.post("/system/tamper-events", asyncHandler(notificationsController.reportTamper));
