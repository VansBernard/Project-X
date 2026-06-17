import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AccessTokenPayload = {
  sub: string;
  dealerId: string;
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  sessionId: string;
  tokenUse: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  dealerId: string;
  sessionId: string;
  tokenUse: "refresh";
};

export function signAccessToken(payload: Omit<AccessTokenPayload, "tokenUse">): string {
  return jwt.sign(
    { ...payload, tokenUse: "access" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: `${env.JWT_ACCESS_TTL_MINUTES}m` }
  );
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "tokenUse">): string {
  return jwt.sign(
    { ...payload, tokenUse: "refresh" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d` }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (decoded.tokenUse !== "access") {
    throw new Error("Invalid token use");
  }
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (decoded.tokenUse !== "refresh") {
    throw new Error("Invalid token use");
  }
  return decoded;
}

