import type { Request, Response } from "express";
import { authService } from "./auth.service.js";
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  ResetPasswordInput,
  ResendVerificationInput,
  VerifyEmailInput
} from "./auth.schemas.js";

function requestMetadata(req: Request<any, any, any, any>) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent")
  };
}

export const authController = {
  async login(req: Request<object, object, LoginInput>, res: Response) {
    const result = await authService.login(req.body, requestMetadata(req));
    return res.status(200).json({ data: result });
  },

  async refresh(req: Request<object, object, RefreshInput>, res: Response) {
    const result = await authService.refresh(req.body, requestMetadata(req));
    return res.status(200).json({ data: result });
  },

  async logout(req: Request<object, object, LogoutInput>, res: Response) {
    await authService.logout(req.body);
    return res.status(204).send();
  },

  async forgotPassword(req: Request<object, object, ForgotPasswordInput>, res: Response) {
    const result = await authService.requestPasswordReset(req.body);

    return res.status(202).json({
      data: {
        message: "If an account exists, password reset instructions will be sent.",
        resetToken: process.env.NODE_ENV === "production" ? undefined : result.issued ? result.token : undefined,
        expiresInMinutes: result.issued ? result.expiresInMinutes : undefined
      }
    });
  },

  async resetPassword(req: Request<object, object, ResetPasswordInput>, res: Response) {
    await authService.resetPassword(req.body);
    return res.status(204).send();
  },

  async verifyEmail(req: Request<object, object, VerifyEmailInput>, res: Response) {
    await authService.verifyEmail(req.body);
    return res.status(204).send();
  },

  async resendVerification(req: Request<object, object, ResendVerificationInput>, res: Response) {
    const result = await authService.resendEmailVerification(req.body);
    return res.status(202).json({ data: result });
  },

  async me(req: Request, res: Response) {
    return res.status(200).json({
      data: {
        userId: req.auth?.sub,
        dealerId: req.auth?.dealerId,
        roleId: req.auth?.roleId,
        roleName: req.auth?.roleName,
        permissions: req.auth?.permissions ?? [],
        sessionId: req.auth?.sessionId
      }
    });
  }
};
