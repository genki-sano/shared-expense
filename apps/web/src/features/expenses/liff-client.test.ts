import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLiffIdToken } from "./liff-client";

const liffMock = vi.hoisted(() => ({
  init: vi.fn(async () => undefined),
  isLoggedIn: vi.fn(() => true),
  isInClient: vi.fn(() => false),
  login: vi.fn(),
  logout: vi.fn(),
  getIDToken: vi.fn(() => "id-token"),
  getDecodedIDToken: vi.fn(() => ({ exp: 2_000 })),
}));

vi.mock("@line/liff", () => ({
  default: liffMock,
}));

describe("getLiffIdToken", () => {
  beforeEach(() => {
    liffMock.init.mockResolvedValue(undefined);
    liffMock.isLoggedIn.mockReturnValue(true);
    liffMock.isInClient.mockReturnValue(false);
    liffMock.getIDToken.mockReturnValue("id-token");
    liffMock.getDecodedIDToken.mockReturnValue({ exp: 2_000 });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
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

  it("logs out and redirects to LINE login for an expired ID token in an external browser", async () => {
    liffMock.getDecodedIDToken.mockReturnValue({ exp: 1_000 });
    const sessionStorageMock = createSessionStorageMock();
    vi.stubGlobal("sessionStorage", sessionStorageMock);

    await expect(
      getLiffIdToken({
        liffId: "liff-id",
        redirectUri: "https://shared-expense.pages.dev/?month=2026-08",
        now: new Date(1_000_000),
      }),
    ).resolves.toBeNull();

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      "shared-expense:liff-expired-id-token-refresh",
      "1",
    );
    expect(liffMock.logout).toHaveBeenCalled();
    expect(liffMock.login).toHaveBeenCalledWith({
      redirectUri: "https://shared-expense.pages.dev/?month=2026-08",
    });
  });

  it("stops instead of looping when an expired ID token refresh was already attempted", async () => {
    liffMock.getDecodedIDToken.mockReturnValue({ exp: 1_000 });
    const sessionStorageMock = createSessionStorageMock({
      "shared-expense:liff-expired-id-token-refresh": "1",
    });
    vi.stubGlobal("sessionStorage", sessionStorageMock);

    await expect(
      getLiffIdToken({
        liffId: "liff-id",
        redirectUri: "https://shared-expense.pages.dev/?month=2026-08",
        now: new Date(1_000_000),
      }),
    ).rejects.toThrow("LINE認証を更新できませんでした");

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(
      "shared-expense:liff-expired-id-token-refresh",
    );
    expect(liffMock.logout).not.toHaveBeenCalled();
    expect(liffMock.login).not.toHaveBeenCalled();
  });

  it("does not invoke LINE login inside the LIFF browser for an expired ID token", async () => {
    liffMock.isInClient.mockReturnValue(true);
    liffMock.getDecodedIDToken.mockReturnValue({ exp: 1_000 });

    await expect(
      getLiffIdToken({
        liffId: "liff-id",
        now: new Date(1_000_000),
      }),
    ).rejects.toThrow("LINE認証の有効期限が切れました");

    expect(liffMock.logout).not.toHaveBeenCalled();
    expect(liffMock.login).not.toHaveBeenCalled();
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

function createSessionStorageMock(initialValues: Record<string, string> = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}
