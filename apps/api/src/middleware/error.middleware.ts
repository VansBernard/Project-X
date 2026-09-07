import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function asyncHandler(
  handler: (req: Request<any, any, any, any>, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof AppError) {
    console.error("[APP_ERROR]", {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message
    });
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  if (isDatabaseConnectionError(error)) {
    console.error("[DATABASE_CONNECTION_ERROR]", error);
    return res.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "The database is temporarily unavailable. Please try again shortly."
      }
    });
  }

  if (isPrismaUniqueConstraintError(error)) {
    console.error("[PRISMA_UNIQUE_CONSTRAINT_ERROR]", error);
    return res.status(409).json({
      error: {
        code: "CONFLICT",
        message: "A record with the same unique value already exists."
      }
    });
  }

  console.error("[UNHANDLED_ERROR]", {
    error: error instanceof Error ? { message: error.message, stack: error.stack, name: error.name } : String(error),
    timestamp: new Date().toISOString()
  });

  if (process.env.NODE_ENV !== "production") {
    console.error("Full error details:", error instanceof Error ? error.stack : error);
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred."
    }
  });
}

function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; name?: unknown };
  return (
    candidate.name === "PrismaClientInitializationError" ||
    candidate.code === "P1000" ||
    candidate.code === "P1001"
  );
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown };
  return candidate.code === "P2002";
}
