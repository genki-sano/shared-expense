import { afterEach, describe, expect, it, vi } from "vitest";
import { getLiffIdToken } from "./liff-client";

const liffMock = vi.hoisted(() => ({
  init: vi.fn(async () => undefined),
  isLoggedIn: vi.fn(() => true),
  login: vi.fn(),
  getIDToken: vi.fn(() => "id-token"),
  getDecodedIDToken: vi.fn(() => ({ exp: 2_000 })),
}));

vi.mock("@line/liff", () => ({
  default: liffMock,
}));

describe("getLiffIdToken", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current LIFF ID token when it is still valid", async () => {
    await expect(
      getLiffIdToken({
        liffId: "liff-id",
        now: new Date(1_000_000),
      }),
    ).resolves.toBe("id-token");

    expect(liffMock.init).toHaveBeenCalledWith({ liffId: "liff-id" });
    expect(liffMock.login).not.toHaveBeenCalled();
  });

  it("redirects to LINE login instead of returning an expired ID token", async () => {
    liffMock.getDecodedIDToken.mockReturnValue({ exp: 1_000 });

    await expect(
      getLiffIdToken({
        liffId: "liff-id",
        redirectUri: "https://shared-expense.pages.dev/?month=2026-08",
        now: new Date(1_000_000),
      }),
    ).resolves.toBeNull();

    expect(liffMock.login).toHaveBeenCalledWith({
      redirectUri: "https://shared-expense.pages.dev/?month=2026-08",
    });
  });

  it("redirects to LINE login when the user is not logged in", async () => {
    liffMock.isLoggedIn.mockReturnValue(false);

    await expect(
      getLiffIdToken({
        liffId: "liff-id",
        redirectUri: "https://shared-expense.pages.dev/",
      }),
    ).resolves.toBeNull();

    expect(liffMock.login).toHaveBeenCalledWith({
      redirectUri: "https://shared-expense.pages.dev/",
    });
    expect(liffMock.getIDToken).not.toHaveBeenCalled();
  });
});
