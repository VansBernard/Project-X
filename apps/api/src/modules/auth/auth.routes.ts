import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { rateLimit } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.js";
import { authController } from "./auth.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  verifyEmailSchema
} from "./auth.schemas.js";

export const authRouter = Router();

const authAttemptLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });
const passwordAttemptLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10 });

authRouter.post("/login", authAttemptLimit, validate(loginSchema), asyncHandler(authController.login));
authRouter.post("/refresh", authAttemptLimit, validate(refreshSchema), asyncHandler(authController.refresh));
authRouter.post("/logout", authAttemptLimit, validate(logoutSchema), asyncHandler(authController.logout));
authRouter.post("/password/forgot", passwordAttemptLimit, validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
authRouter.post("/password/reset", passwordAttemptLimit, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
authRouter.post("/email/verify", validate(verifyEmailSchema), asyncHandler(authController.verifyEmail));
authRouter.post("/email/verification/resend", passwordAttemptLimit, validate(resendVerificationSchema), asyncHandler(authController.resendVerification));
authRouter.get("/me", authenticate, asyncHandler(authController.me));
