import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { validate } from "../../middleware/validate.js";
import { authController } from "./auth.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), asyncHandler(authController.login));
authRouter.post("/refresh", validate(refreshSchema), asyncHandler(authController.refresh));
authRouter.post("/logout", validate(logoutSchema), asyncHandler(authController.logout));
authRouter.post("/password/forgot", validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
authRouter.post("/password/reset", validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
authRouter.post("/email/verify", validate(verifyEmailSchema), asyncHandler(authController.verifyEmail));
authRouter.get("/me", authenticate, asyncHandler(authController.me));

