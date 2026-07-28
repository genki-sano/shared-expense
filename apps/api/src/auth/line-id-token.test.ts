import { describe, expect, it } from "vitest";
import {
  createLineIdTokenAuthenticator,
  verifyLineIdToken,
} from "./line-id-token";

describe("verifyLineIdToken", () => {
  it("verifies the LIFF ID token through the LINE verify endpoint", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

    await expect(
      verifyLineIdToken({
        idToken: "id-token",
        channelId: "channel-1",
        fetcher: async (url, init) => {
          calls.push({ url: String(url), init });
          return Response.json({
            iss: "https://access.line.me",
            sub: "line_woman",
            aud: "channel-1",
            exp: 1780000000,
            iat: 1779999000,
            name: "ひとみ",
          });
        },
      }),
    ).resolves.toEqual({ sub: "line_woman", aud: "channel-1" });

    expect(calls).toEqual([
      {
        url: "https://api.line.me/oauth2/v2.1/verify",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            id_token: "id-token",
            client_id: "channel-1",
          }),
        },
      },
    ]);
  });

  it("rejects a failed LINE verification response", async () => {
    await expect(
      verifyLineIdToken({
        idToken: "bad-token",
        channelId: "channel-1",
        fetcher: async () =>
          Response.json({ error_description: "Invalid IdToken." }, { status: 400 }),
      }),
    ).rejects.toThrow("LINE ID token verification failed: 400");
  });

  it("rejects an audience mismatch", async () => {
    await expect(
      verifyLineIdToken({
        idToken: "id-token",
        channelId: "channel-1",
        fetcher: async () =>
          Response.json({
            sub: "line_woman",
            aud: "other-channel",
          }),
      }),
    ).rejects.toThrow("LINE ID token audience mismatch");
  });
});

describe("createLineIdTokenAuthenticator", () => {
  it("resolves a verified LINE sub to a household user", async () => {
    const authenticate = createLineIdTokenAuthenticator({
      channelId: "channel-1",
      expenseRepository: {
        listHouseholdUsers: async () => [
          {
            id: "woman",
            lineUserId: "line_woman",
            displayName: "ひとみ",
            notifyEnabled: true,
          },
          {
            id: "man",
            lineUserId: "line_man",
            displayName: "げんき",
            notifyEnabled: true,
          },
        ],
      },
      fetcher: async () =>
        Response.json({
          sub: "line_woman",
          aud: "channel-1",
        }),
    });

    await expect(authenticate("id-token")).resolves.toEqual({
      id: "woman",
      lineUserId: "line_woman",
      displayName: "ひとみ",
      notifyEnabled: true,
    });
  });

  it("rejects a verified LINE sub that is not in household users", async () => {
    const authenticate = createLineIdTokenAuthenticator({
      channelId: "channel-1",
      expenseRepository: {
        listHouseholdUsers: async () => [
          {
            id: "woman",
            lineUserId: "line_woman",
            displayName: "ひとみ",
            notifyEnabled: true,
          },
          {
            id: "man",
            lineUserId: "line_man",
            displayName: "げんき",
            notifyEnabled: true,
          },
        ],
      },
      fetcher: async () =>
        Response.json({
          sub: "line_unknown",
          aud: "channel-1",
        }),
    });

    await expect(authenticate("id-token")).rejects.toThrow(
      "Unknown LINE user: line_unknown",
    );
  });
});
