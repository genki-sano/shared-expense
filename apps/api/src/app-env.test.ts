import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppFromEnv } from "./app";

const user = {
  id: "woman",
  lineUserId: "line_woman",
  displayName: "Woman",
  notifyEnabled: true,
};

describe("createAppFromEnv", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the Spreadsheet repository when service account env is configured", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const app = createAppFromEnv(
      {
        GOOGLE_SPREADSHEET_ID: "spreadsheet_1",
        GOOGLE_SERVICE_ACCOUNT_EMAIL: "sheets-reader@example.iam.gserviceaccount.com",
        GOOGLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
      },
      {
        authenticateToken: async () => user,
        signServiceAccountJwt: async (input) => {
          expect(input.privateKey).toBe(
            "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
          );
          return "signed-jwt";
        },
        fetcher: async (url, init) => {
          calls.push({ url: String(url), init });
          if (String(url) === "https://oauth2.googleapis.com/token") {
            return Response.json({
              access_token: "access-token",
              token_type: "Bearer",
              expires_in: 3600,
            });
          }

          if (
            String(url) ===
            "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/users!A2%3AF"
          ) {
            return Response.json({
              values: [
                ["1", "ひとみ", "line_woman", "line_woman", "2021/03/03", "2021/03/03"],
                ["2", "げんき", "line_man", "line_man", "2021/03/03", "2021/03/03"],
              ],
            });
          }

          return Response.json({
            values: [
              [
                "2148",
                "1",
                "食費",
                "328",
                "2026/07/22",
                "アイス",
                "1",
                "1",
                "2026/07/22 22:35:03",
                "2026/07/22 22:35:03",
                "45856",
              ],
              [
                "2145",
                "2",
                "食費",
                "643",
                "2026/07/20",
                "納豆",
                "2",
                "2",
                "2026/07/20 10:59:03",
                "2026/07/20 10:59:03",
                "45854",
              ],
            ],
          });
        },
      },
    );

    const response = await app.request("/api/expenses?date=2026-07", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expenses: [
        {
          id: "2148",
          userId: "woman",
          userName: "ひとみ",
          date: "2026-07-22",
          price: 328,
          category: "食費",
          memo: "アイス",
          version: 1,
        },
        {
          id: "2145",
          userId: "man",
          userName: "げんき",
          date: "2026-07-20",
          price: 643,
          category: "食費",
          memo: "納豆",
          version: 1,
        },
      ],
    });
    expect(calls).toEqual([
      {
        url: "https://oauth2.googleapis.com/token",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: "signed-jwt",
          }),
        },
      },
      {
        url: "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/users!A2%3AF",
        init: {
          headers: {
            Authorization: "Bearer access-token",
          },
        },
      },
      {
        url: "https://oauth2.googleapis.com/token",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: "signed-jwt",
          }),
        },
      },
      {
        url: "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/payments!A2%3AL",
        init: {
          headers: {
            Authorization: "Bearer access-token",
          },
        },
      },
    ]);
  });

  it("falls back to an empty in-memory repository when Spreadsheet env is missing", async () => {
    const app = createAppFromEnv(
      {},
      {
        authenticateToken: async () => user,
        fetcher: async () => {
          throw new Error("fetch should not be called");
        },
      },
    );

    const response = await app.request("/api/expenses?date=2026-07", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ expenses: [] });
  });

  it("uses LINE Login env authentication when no authenticateToken dependency is injected", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        sub: "line_woman",
        aud: "unexpected-channel",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const app = createAppFromEnv({
      LINE_LOGIN_CHANNEL_ID: "line-channel-1",
    });

    const response = await app.request("/api/expenses?date=2026-07", {
      headers: { Authorization: "Bearer line-id-token" },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      details: { code: "AUTH_INVALID" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.line.me/oauth2/v2.1/verify",
      expect.objectContaining({
        method: "POST",
        body: new URLSearchParams({
          id_token: "line-id-token",
          client_id: "line-channel-1",
        }),
      }),
    );
  });

  it("verifies LINE ID tokens and resolves the LINE user from Spreadsheet users", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const app = createAppFromEnv(
      {
        GOOGLE_SPREADSHEET_ID: "spreadsheet_1",
        GOOGLE_SERVICE_ACCOUNT_EMAIL: "sheets-reader@example.iam.gserviceaccount.com",
        GOOGLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
        LINE_LOGIN_CHANNEL_ID: "line-channel-1",
      },
      {
        signServiceAccountJwt: async () => "signed-jwt",
        fetcher: async (url, init) => {
          calls.push({ url: String(url), init });
          if (String(url) === "https://api.line.me/oauth2/v2.1/verify") {
            return Response.json({
              sub: "line_woman",
              aud: "line-channel-1",
            });
          }

          if (String(url) === "https://oauth2.googleapis.com/token") {
            return Response.json({
              access_token: "access-token",
              token_type: "Bearer",
              expires_in: 3600,
            });
          }

          if (
            String(url) ===
            "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/users!A2%3AF"
          ) {
            return Response.json({
              values: [
                ["1", "ひとみ", "line_woman", "line_woman", "2021/03/03", "2021/03/03"],
                ["2", "げんき", "line_man", "line_man", "2021/03/03", "2021/03/03"],
              ],
            });
          }

          return Response.json({
            values: [
              [
                "2148",
                "1",
                "食費",
                "328",
                "2026/07/22",
                "アイス",
                "1",
                "1",
                "2026/07/22 22:35:03",
                "2026/07/22 22:35:03",
                "45856",
              ],
            ],
          });
        },
      },
    );

    const response = await app.request("/api/expenses?date=2026-07", {
      headers: { Authorization: "Bearer line-id-token" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expenses: [
        {
          id: "2148",
          userId: "woman",
          userName: "ひとみ",
          date: "2026-07-22",
          price: 328,
          category: "食費",
          memo: "アイス",
          version: 1,
        },
      ],
    });
    expect(calls[0]).toEqual({
      url: "https://api.line.me/oauth2/v2.1/verify",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          id_token: "line-id-token",
          client_id: "line-channel-1",
        }),
      },
    });
  });

  it("wires LINE Messaging API notifications when the channel access token is configured", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const app = createAppFromEnv(
      {
        GOOGLE_SPREADSHEET_ID: "spreadsheet_1",
        GOOGLE_SERVICE_ACCOUNT_EMAIL: "sheets-reader@example.iam.gserviceaccount.com",
        GOOGLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
        LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: "line-message-token",
        LINE_NOTIFICATION_DETAIL_BASE_URL:
          "https://liff.line.me/1234567890-shared-expense",
      },
      {
        authenticateToken: async () => user,
        signServiceAccountJwt: async () => "signed-jwt",
        fetcher: async (url, init) => {
          calls.push({ url: String(url), init });
          if (String(url) === "https://oauth2.googleapis.com/token") {
            return Response.json({
              access_token: "access-token",
              token_type: "Bearer",
              expires_in: 3600,
            });
          }

          if (
            String(url) ===
            "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/users!A2%3AF"
          ) {
            return Response.json({
              values: [
                ["1", "ひとみ", "line_woman", "line_woman", "2021/03/03", "2021/03/03"],
                ["2", "げんき", "line_man", "line_man", "2021/03/03", "2021/03/03"],
              ],
            });
          }

          if (
            String(url) ===
            "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/payments!A2%3AL"
          ) {
            return Response.json({ values: [] });
          }

          if (
            String(url) ===
            "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/payments!A2%3AK:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"
          ) {
            return Response.json({});
          }

          if (String(url) === "https://api.line.me/v2/bot/message/push") {
            return Response.json({});
          }

          throw new Error(`Unexpected fetch: ${String(url)}`);
        },
      },
    );

    const response = await app.request("/api/expenses", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
        "Idempotency-Key": "env-notify-create-1",
      },
      body: JSON.stringify({
        date: "2026-07-26",
        price: 1200,
        category: "食費",
        memo: "昼食",
      }),
    });

    expect(response.status).toBe(201);
    expect(calls.at(-1)).toMatchObject({
      url: "https://api.line.me/v2/bot/message/push",
      init: {
        method: "POST",
        headers: {
          Authorization: "Bearer line-message-token",
          "Content-Type": "application/json",
        },
      },
    });
    expect(String(calls.at(-1)?.init?.body)).toContain('"to":"line_man"');
    expect(String(calls.at(-1)?.init?.body)).toContain("Womanさんが支出を追加しました");
    expect(String(calls.at(-1)?.init?.body)).toContain("詳細を確認");
    expect(String(calls.at(-1)?.init?.body)).toContain(
      "https://liff.line.me/1234567890-shared-expense?month=2026-07",
    );
    expect(String(calls.at(-1)?.init?.body)).toContain("expenseId=");
    expect(String(calls.at(-1)?.init?.body)).not.toContain("通知ID");
  });
});
