import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const publicPaths = [
    "/dealers/signup",
    "/dealers/signup/confirm",
    "/dealers/payout-banks",
    "/dealers/payout-account/resolve",
    "/health",
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/auth/password/forgot",
    "/auth/password/reset",
    "/auth/email/verify",
    "/auth/email/verification/resend"
  ];
  
  // Check if the request path matches a public path
  // Handle both "/path" and "/api/v1/path" formats
  const pathToCheck = req.path.startsWith("/api/v1") 
    ? req.path.substring(7) 
    : req.path;
  
  if (publicPaths.includes(pathToCheck)) {
    return next();
  }

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required."
      }
    });
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "The access token is invalid or expired."
      }
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required."
        }
      });
    }

    if (!req.auth.roleName || !roles.includes(req.auth.roleName)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this resource."
        }
      });
    }

    return next();
  };
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required."
        }
      });
    }

    const allowed = permissions.every((permission) => req.auth?.permissions.includes(permission));
    if (!allowed) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this resource."
        }
      });
    }

    return next();
  };
}

