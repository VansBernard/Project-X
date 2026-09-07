import { AuthTokenType, DealerStatus, Prisma, UserStatus } from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";
import { generateOpaqueToken, hashPassword, hashToken, verifyPassword } from "../../lib/crypto.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import { emailService } from "../licenses/delivery/email.service.js";
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  ResetPasswordInput,
  ResendVerificationInput,
  VerifyEmailInput
} from "./auth.schemas.js";

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

export type UserWithRole = Awaited<ReturnType<typeof findUserForAuth>>;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function isDatabaseUnavailableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;
  const maybeName = (error as { name?: unknown }).name;
  const maybeMessage = String((error as { message?: string }).message ?? error);
  const message = maybeMessage.toLowerCase();
  const normalizedCode = typeof maybeCode === "string" ? maybeCode.toUpperCase() : maybeCode;

  return (
    normalizedCode === "P1000" ||
    normalizedCode === "P1001" ||
    normalizedCode === "P1017" ||
    maybeName === "PrismaClientInitializationError" ||
    /can't reach database server|econnrefused|enotfound|eai_again|connect econnrefused|timeout|connection terminated|database is temporarily unavailable|prisma/i.test(message)
  );
}

async function findUserForAuth(dealerSlug: string, email: string) {
  return prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
      dealer: {
        slug: dealerSlug,
        status: DealerStatus.active,
        deletedAt: null
      }
    },
    include: {
      dealer: true,
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });
}

function permissionsFor(user: NonNullable<UserWithRole>): string[] {
  return user.role?.permissions
    .map((entry) => entry.permission.key)
    .filter(Boolean) ?? [];
}

type AuthDatabase = Pick<typeof prisma, "session"> | Prisma.TransactionClient;

async function issueTokenPair(
  user: NonNullable<UserWithRole>,
  metadata: RequestMetadata,
  database: AuthDatabase = prisma
) {
  const refreshToken = generateOpaqueToken(48);
  const session = await database.session.create({
    data: {
      dealerId: user.dealerId,
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      expiresAt: addDays(new Date(), env.JWT_REFRESH_TTL_DAYS)
    }
  });

  const accessToken = signAccessToken({
    sub: user.id,
    dealerId: user.dealerId,
    roleId: user.roleId,
    roleName: user.role?.name ?? null,
    permissions: permissionsFor(user),
    sessionId: session.id
  });

  const signedRefreshToken = signRefreshToken({
    sub: user.id,
    dealerId: user.dealerId,
    sessionId: session.id
  });

  await database.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashToken(signedRefreshToken) }
  });

  return {
    accessToken,
    refreshToken: signedRefreshToken,
    expiresInSeconds: env.JWT_ACCESS_TTL_MINUTES * 60,
    sessionId: session.id
  };
}

/**
 * Issue tokens for a user (used during signup confirmation)
 * @param user The user to issue tokens for (must have role loaded)
 * @param metadata Request metadata (IP, userAgent)
 * @returns Access token, refresh token, and expiration info
 */
export async function issueTokensForUser(user: NonNullable<UserWithRole>, metadata: RequestMetadata = {}) {
  return issueTokenPair(user, metadata);
}

export const authService = {
  async login(input: LoginInput, metadata: RequestMetadata) {
    try {
      const user = await findUserForAuth(input.dealerSlug, input.email);
      if (!user || user.status === UserStatus.disabled || user.deletedAt) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
      }

      const passwordMatches = await verifyPassword(input.password, user.passwordHash);
      if (!passwordMatches) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
      }

      if (user.status === UserStatus.suspended) {
        throw new AppError(403, "USER_SUSPENDED", "This account is suspended.");
      }

      if (!user.emailVerifiedAt) {
        throw new AppError(403, "EMAIL_NOT_VERIFIED", "Confirm your email address before signing in.");
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          status: user.status === UserStatus.invited ? UserStatus.active : user.status
        }
      });

      // Fetch fresh user object with updated status and role/permissions
      const updatedUser = await findUserForAuth(input.dealerSlug, input.email);
      if (!updatedUser) {
        throw new AppError(500, "USER_NOT_FOUND", "Failed to fetch updated user data.");
      }

      return issueTokenPair(updatedUser, metadata);
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "The authentication database is currently unavailable.");
      }

      throw error;
    }
  },

  async refresh(input: RefreshInput, metadata: RequestMetadata) {
    let payload;
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "The refresh token is invalid or expired.");
    }

    const tokenHash = hashToken(input.refreshToken);

    try {
      return await prisma.$transaction(async (transaction) => {
        const session = await transaction.session.findFirst({
          where: {
            id: payload.sessionId,
            userId: payload.sub,
            dealerId: payload.dealerId,
            refreshTokenHash: tokenHash,
            revokedAt: null,
            deletedAt: null,
            expiresAt: { gt: new Date() }
          },
          include: {
            user: {
              include: {
                dealer: true,
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true
                      }
                    }
                  }
                }
              }
            }
          }
        });

        if (
          !session ||
          session.user.status !== UserStatus.active ||
          session.user.deletedAt ||
          session.user.dealer.status !== DealerStatus.active ||
          session.user.dealer.deletedAt
        ) {
          throw new AppError(401, "INVALID_REFRESH_TOKEN", "The refresh token is invalid or expired.");
        }

        const revoked = await transaction.session.updateMany({
          where: {
            id: session.id,
            refreshTokenHash: tokenHash,
            revokedAt: null
          },
          data: { revokedAt: new Date() }
        });

        if (revoked.count !== 1) {
          throw new AppError(401, "INVALID_REFRESH_TOKEN", "The refresh token is invalid or expired.");
        }

        const next = await issueTokenPair(session.user, metadata, transaction);
        await transaction.session.update({
          where: { id: session.id },
          data: { replacedBySessionId: next.sessionId }
        });

        return next;
      });
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "The authentication database is currently unavailable.");
      }

      throw error;
    }

  },

  async logout(input: LogoutInput) {
    let payload;
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      return;
    }

    await prisma.session.updateMany({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        dealerId: payload.dealerId,
        refreshTokenHash: hashToken(input.refreshToken),
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  },

  async requestPasswordReset(input: ForgotPasswordInput) {
    const user = await findUserForAuth(input.dealerSlug, input.email);
    if (!user) {
      return { issued: false };
    }

    const token = generateOpaqueToken();
    await prisma.authToken.create({
      data: {
        dealerId: user.dealerId,
        userId: user.id,
        type: AuthTokenType.password_reset,
        tokenHash: hashToken(token),
        expiresAt: addMinutes(new Date(), env.PASSWORD_RESET_TTL_MINUTES)
      }
    });

    return {
      issued: true,
      token,
      expiresInMinutes: env.PASSWORD_RESET_TTL_MINUTES
    };
  },

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = hashToken(input.token);
    const authToken = await prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: AuthTokenType.password_reset,
        usedAt: null,
        deletedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!authToken) {
      throw new AppError(400, "INVALID_RESET_TOKEN", "The password reset token is invalid or expired.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: authToken.userId },
        data: {
          passwordHash: await hashPassword(input.password),
          passwordChangedAt: new Date(),
          status: UserStatus.active
        }
      }),
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() }
      }),
      prisma.session.updateMany({
        where: {
          userId: authToken.userId,
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      })
    ]);
  },

  async createEmailVerificationToken(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null }
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User was not found.");
    }

    const token = generateOpaqueToken();
    await prisma.authToken.create({
      data: {
        dealerId: user.dealerId,
        userId: user.id,
        type: AuthTokenType.email_verification,
        tokenHash: hashToken(token),
        expiresAt: addMinutes(new Date(), env.AUTH_TOKEN_TTL_MINUTES)
      }
    });

    return {
      token,
      expiresInMinutes: env.AUTH_TOKEN_TTL_MINUTES
    };
  },

  async verifyEmail(input: VerifyEmailInput) {
    const authToken = await prisma.authToken.findFirst({
      where: {
        tokenHash: hashToken(input.token),
        type: AuthTokenType.email_verification,
        usedAt: null,
        deletedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!authToken) {
      throw new AppError(400, "INVALID_VERIFICATION_TOKEN", "The email verification token is invalid or expired.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: authToken.userId },
        data: {
          emailVerifiedAt: new Date(),
          status: UserStatus.active
        }
      }),
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() }
      })
    ]);
  },

  async resendEmailVerification(input: ResendVerificationInput) {
    const user = await findUserForAuth(input.dealerSlug, input.email);
    if (!user || user.deletedAt || user.emailVerifiedAt) return { sent: true };

    const token = await this.createEmailVerificationToken(user.id);
    const verificationUrl = `${env.WEB_ORIGIN[0]}/verify-email?token=${encodeURIComponent(token.token)}`;
    await emailService.sendDealerRegistrationEmail({
      to: user.email,
      dealerName: user.dealer.name,
      dealerSlug: user.dealer.slug,
      verificationUrl
    });
    return { sent: true };
  }
};
