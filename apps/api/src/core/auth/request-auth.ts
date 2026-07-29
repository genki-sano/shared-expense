import type { User } from "@shared-expense/shared";
import {
  authInvalidErrorResponse,
  authRequiredErrorResponse,
  authUnavailableErrorResponse,
  userNotRegisteredErrorResponse,
  type ApiErrorResponse,
} from "../http/error-response";
import { isAuthenticationError } from "./authentication-error";

export type AuthenticatedRequest =
  | { ok: true; actor: User }
  | {
      ok: false;
      status: 401 | 403 | 503;
      body: ApiErrorResponse;
    };

export async function authenticateRequest(
  authorizationHeader: string | undefined,
  authenticateToken: (token: string) => Promise<User>,
): Promise<AuthenticatedRequest> {
  const token = bearerToken(authorizationHeader);
  if (token === null) {
    return { ok: false, status: 401, body: authRequiredErrorResponse };
  }

  try {
    return { ok: true, actor: await authenticateToken(token) };
  } catch (error) {
    if (isAuthenticationError(error)) {
      if (error.code === "user_not_registered") {
        return { ok: false, status: 403, body: userNotRegisteredErrorResponse };
      }

      if (error.code === "unavailable") {
        return { ok: false, status: 503, body: authUnavailableErrorResponse };
      }
    }

    return { ok: false, status: 401, body: authInvalidErrorResponse };
  }
}

function bearerToken(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }

  const match = /^Bearer (?<token>.+)$/.exec(authorizationHeader);
  return match?.groups?.token ?? null;
}
