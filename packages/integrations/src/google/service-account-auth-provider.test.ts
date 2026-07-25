import { describe, expect, it } from "vitest";
import {
  GOOGLE_SHEETS_READONLY_SCOPE,
  GOOGLE_TOKEN_URL,
  GoogleServiceAccountAccessTokenProvider,
} from "./service-account-auth-provider";

describe("GoogleServiceAccountAccessTokenProvider", () => {
  it("exchanges a signed service account JWT for an access token", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const signedPayloads: unknown[] = [];
    const provider = new GoogleServiceAccountAccessTokenProvider({
      clientEmail: "sheets-reader@example.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
      now: () => new Date("2026-07-25T08:30:00.000Z"),
      signJwt: async (input) => {
        expect(input.privateKey).toBe(
          "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
        );
        signedPayloads.push(input.payload);
        return "signed-jwt";
      },
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json({
          access_token: "access-token",
          token_type: "Bearer",
          expires_in: 3600,
        });
      },
    });

    await expect(provider.getAccessToken()).resolves.toBe("access-token");

    expect(signedPayloads).toEqual([
      {
        iss: "sheets-reader@example.iam.gserviceaccount.com",
        scope: GOOGLE_SHEETS_READONLY_SCOPE,
        aud: GOOGLE_TOKEN_URL,
        iat: 1784968200,
        exp: 1784971800,
      },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(GOOGLE_TOKEN_URL);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    expect(String(calls[0]?.init?.body)).toBe(
      "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signed-jwt",
    );
  });

  it("throws when Google does not return an access token", async () => {
    const provider = new GoogleServiceAccountAccessTokenProvider({
      clientEmail: "sheets-reader@example.iam.gserviceaccount.com",
      privateKey: "private-key",
      signJwt: async () => "signed-jwt",
      fetcher: async () => Response.json({ error: "invalid_grant" }, { status: 400 }),
    });

    await expect(provider.getAccessToken()).rejects.toThrow(
      "Failed to exchange Google service account token: 400",
    );
  });
});
