import { describe, expect, it } from "vitest";
import { AuthError, resolveAuthenticatedUser } from "./liff-token";

const validClaims = () => ({
  iss: "https://access.line.me",
  aud: "channel_1",
  exp: Math.floor(Date.now() / 1000) + 60,
  sub: "line_a",
});

describe("resolveAuthenticatedUser", () => {
  it("returns the mapped user for valid token claims", async () => {
    const user = await resolveAuthenticatedUser({
      token: "valid",
      channelId: "channel_1",
      verifyToken: async () => validClaims(),
      findUserByLineUserId: async () => ({
        id: "user_a",
        lineUserId: "line_a",
        displayName: "A",
        notifyEnabled: true,
      }),
    });

    expect(user).toEqual({
      id: "user_a",
      lineUserId: "line_a",
      displayName: "A",
      notifyEnabled: true,
    });
  });

  it("rejects a token with the wrong issuer", async () => {
    await expect(
      resolveAuthenticatedUser({
        token: "valid",
        channelId: "channel_1",
        verifyToken: async () => ({
          ...validClaims(),
          iss: "https://example.com",
        }),
        findUserByLineUserId: async () => null,
      }),
    ).rejects.toMatchObject(new AuthError(401, "invalid_issuer", "Invalid LIFF token issuer"));
  });

  it("rejects a token with the wrong audience", async () => {
    await expect(
      resolveAuthenticatedUser({
        token: "valid",
        channelId: "channel_1",
        verifyToken: async () => ({
          ...validClaims(),
          aud: "other_channel",
        }),
        findUserByLineUserId: async () => null,
      }),
    ).rejects.toMatchObject(new AuthError(401, "invalid_audience", "Invalid LIFF token audience"));
  });

  it("rejects an expired token", async () => {
    await expect(
      resolveAuthenticatedUser({
        token: "expired",
        channelId: "channel_1",
        verifyToken: async () => ({
          ...validClaims(),
          exp: Math.floor(Date.now() / 1000) - 1,
        }),
        findUserByLineUserId: async () => null,
      }),
    ).rejects.toMatchObject(new AuthError(401, "expired_token", "Expired LIFF token"));
  });

  it("rejects an unmapped LINE user", async () => {
    await expect(
      resolveAuthenticatedUser({
        token: "valid",
        channelId: "channel_1",
        verifyToken: async () => validClaims(),
        findUserByLineUserId: async () => null,
      }),
    ).rejects.toMatchObject(new AuthError(403, "user_not_allowed", "LIFF user is not allowed"));
  });

  it("normalizes token verification errors", async () => {
    await expect(
      resolveAuthenticatedUser({
        token: "bad",
        channelId: "channel_1",
        verifyToken: async () => {
          throw new Error("bad token");
        },
        findUserByLineUserId: async () => null,
      }),
    ).rejects.toMatchObject(new AuthError(401, "invalid_token", "Invalid LIFF token"));
  });
});
