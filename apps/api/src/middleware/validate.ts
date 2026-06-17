import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type ValidationTarget = "body" | "query" | "params";

export function validate(schema: ZodTypeAny, target: ValidationTarget = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid fields.",
          fields: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        }
      });
    }

    (req as Record<ValidationTarget, unknown>)[target] = result.data;
    return next();
  };
}

