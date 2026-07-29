export type AuthenticationErrorCode =
  | "invalid"
  | "user_not_registered"
  | "unavailable";

export class AuthenticationError extends Error {
  readonly code: AuthenticationErrorCode;

  constructor(code: AuthenticationErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuthenticationError";
    this.code = code;
  }
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}
