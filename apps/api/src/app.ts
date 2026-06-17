import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { contractManagementRouter } from "./modules/contracts/contract-management.routes.js";
import { customerManagementRouter } from "./modules/customers/customer-management.routes.js";
import { dealerManagementRouter } from "./modules/dealers/dealer-management.routes.js";
import { licenseRouter } from "./modules/licenses/license.routes.js";
import { paystackRouter, paystackWebhookRouter } from "./modules/payments/paystack.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true
    })
  );
  app.use(cookieParser());

  app.use("/api/v1", paystackWebhookRouter);

  app.use(express.json({ limit: "1mb" }));

  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ data: { status: "ok" } });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1", contractManagementRouter);
  app.use("/api/v1", customerManagementRouter);
  app.use("/api/v1", dealerManagementRouter);
  app.use("/api/v1", licenseRouter);
  app.use("/api/v1", paystackRouter);
  app.use(errorMiddleware);

  return app;
}
