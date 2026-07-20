import type { User } from "@shared-expense/shared";

export type LiffTokenClaims = {
  iss: string;
  aud: string;
  exp: number;
  sub: string;
};

export type ResolveAuthenticatedUserInput = {
  token: string;
  channelId: string;
  verifyToken: (token: string) => Promise<LiffTokenClaims>;
  findUserByLineUserId: (lineUserId: string) => Promise<User | null>;
};

export class AuthError extends Error {
  readonly status: 401 | 403;
  readonly code: string;

  constructor(status: 401 | 403, code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export async function resolveAuthenticatedUser(input: ResolveAuthenticatedUserInput): Promise<User> {
  let claims: LiffTokenClaims;
  try {
    claims = await input.verifyToken(input.token);
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError(401, "invalid_token", "Invalid LIFF token");
  }

  const now = Math.floor(Date.now() / 1000);

  if (claims.iss !== "https://access.line.me") {
    throw new AuthError(401, "invalid_issuer", "Invalid LIFF token issuer");
  }

  if (claims.aud !== input.channelId) {
    throw new AuthError(401, "invalid_audience", "Invalid LIFF token audience");
  }

  if (claims.exp <= now) {
    throw new AuthError(401, "expired_token", "Expired LIFF token");
  }

  const user = await input.findUserByLineUserId(claims.sub);
  if (user === null) {
    throw new AuthError(403, "user_not_allowed", "LIFF user is not allowed");
  }

  return user;
}
