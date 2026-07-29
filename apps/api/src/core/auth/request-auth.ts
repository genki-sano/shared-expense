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
      logAuthenticationFailure(error.code, error);
      if (error.code === "user_not_registered") {
        return { ok: false, status: 403, body: userNotRegisteredErrorResponse };
      }

      if (error.code === "unavailable") {
        return { ok: false, status: 503, body: authUnavailableErrorResponse };
      }
    }

    logAuthenticationFailure("invalid", error);
    return { ok: false, status: 401, body: authInvalidErrorResponse };
  }
}

function logAuthenticationFailure(code: string, error: unknown): void {
  console.error("Authentication failed", {
    code,
    reason: errorMessage(error),
    cause: errorCauseMessage(error),
  });
}

function errorCauseMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("cause" in error)) {
    return undefined;
  }

  return errorMessage(error.cause);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return String(error);
}

function bearerToken(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }

  const match = /^Bearer (?<token>.+)$/.exec(authorizationHeader);
  return match?.groups?.token ?? null;
}
