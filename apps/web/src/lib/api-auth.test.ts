import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateMutation, resolveApiToken } from "./api-auth";
import { getLiffIdToken } from "./liff-client";

vi.mock("./liff-client", () => ({ getLiffIdToken: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("API authentication boundary", () => {
  it("ignores the development token in production and uses LIFF", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEV_ID_TOKEN", "never-use-in-production");
    vi.stubEnv("NEXT_PUBLIC_LIFF_ID", "liff-id");
    vi.stubGlobal("window", {
      location: { href: "https://example.com/expenses" },
    });
    vi.mocked(getLiffIdToken).mockResolvedValue("verified-token");
    await expect(resolveApiToken("https://api.example.com")).resolves.toBe(
      "verified-token",
    );
    expect(getLiffIdToken).toHaveBeenCalledWith({
      liffId: "liff-id",
      redirectUri: "https://example.com/expenses",
    });
  });

  it("checks the current token at mutation time", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LIFF_ID", "liff-id");
    vi.stubGlobal("window", {
      location: { href: "https://example.com/expenses" },
    });
    vi.mocked(getLiffIdToken).mockResolvedValue("refreshed-token");
    const input = {
      apiBaseUrl: "https://api.example.com",
      idToken: "old-token",
      idempotencyKey: "keep-this-key",
    };
    await expect(authenticateMutation(input)).resolves.toEqual({
      ...input,
      idToken: "refreshed-token",
    });
  });

  it("stops a mutation while LINE login is redirecting", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LIFF_ID", "liff-id");
    vi.stubGlobal("window", {
      location: { href: "https://example.com/expenses" },
    });
    vi.mocked(getLiffIdToken).mockResolvedValue(null);
    await expect(
      authenticateMutation({
        apiBaseUrl: "https://api.example.com",
        idToken: "old-token",
      }),
    ).rejects.toThrow("ログイン後に再度お試しください");
  });
});
