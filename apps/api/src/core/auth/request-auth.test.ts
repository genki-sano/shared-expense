import type { User } from "@shared-expense/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "./authentication-error";
import { authenticateRequest } from "./request-auth";

const user: User = {
  id: "woman",
  lineUserId: "line_woman",
  displayName: "ひとみ",
  notifyEnabled: true,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("authenticateRequest", () => {
  it("does not log missing authorization headers", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await authenticateRequest(undefined, async () => user);

    expect(result).toMatchObject({
      ok: false,
      status: 401,
      body: {
        details: { code: "AUTH_REQUIRED" },
      },
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("logs unavailable authentication causes without token values", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await authenticateRequest("Bearer secret-id-token", async () => {
      throw new AuthenticationError(
        "unavailable",
        "Household users are unavailable",
        { cause: new Error("Failed to read users sheet: 403") },
      );
    });

    expect(result).toMatchObject({
      ok: false,
      status: 503,
      body: {
        details: { code: "AUTH_UNAVAILABLE" },
      },
    });
    expect(consoleError).toHaveBeenCalledWith("Authentication failed", {
      code: "unavailable",
      reason: "Household users are unavailable",
      cause: "Failed to read users sheet: 403",
    });
  });

  it("logs unknown authentication failures as invalid", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await authenticateRequest("Bearer secret-id-token", async () => {
      throw new Error("invalid token");
    });

    expect(result).toMatchObject({
      ok: false,
      status: 401,
      body: {
        details: { code: "AUTH_INVALID" },
      },
    });
    expect(consoleError).toHaveBeenCalledWith("Authentication failed", {
      code: "invalid",
      reason: "invalid token",
      cause: undefined,
    });
  });
});
