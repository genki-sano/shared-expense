import { describe, expect, it } from "vitest";
import {
  LineIdTokenVerificationError,
  LINE_ID_TOKEN_VERIFY_URL,
  verifyLineIdToken,
} from "./id-token-verifier";

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
        url: LINE_ID_TOKEN_VERIFY_URL,
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
    await expect(
      verifyLineIdToken({
        idToken: "bad-token",
        channelId: "channel-1",
        fetcher: async () =>
          Response.json({ error_description: "Invalid IdToken." }, { status: 400 }),
      }),
    ).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      verifyLineIdToken({
        idToken: "bad-token",
        channelId: "channel-1",
        fetcher: async () =>
          Response.json({ error_description: "Invalid IdToken." }, { status: 400 }),
      }),
    ).rejects.toBeInstanceOf(LineIdTokenVerificationError);
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

  it("rejects an invalid verification payload", async () => {
    await expect(
      verifyLineIdToken({
        idToken: "id-token",
        channelId: "channel-1",
        fetcher: async () => Response.json({ aud: "channel-1" }),
      }),
    ).rejects.toThrow("LINE ID token verification returned an invalid payload");
  });
});
