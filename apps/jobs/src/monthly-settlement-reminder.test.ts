import { describe, expect, it } from "vitest";
import type { LineMessage, PushLineMessageInput } from "@shared-expense/integrations";
import {
  monthlySettlementReminderFlexMessage,
  previousMonthInJst,
  runMonthlySettlementReminder,
} from "./monthly-settlement-reminder";

describe("previousMonthInJst", () => {
  it("returns the previous month based on Asia/Tokyo time", () => {
    expect(previousMonthInJst(new Date("2026-07-05T10:00:00.000Z"))).toBe(
      "2026-06",
    );
    expect(previousMonthInJst(new Date("2026-01-05T10:00:00.000Z"))).toBe(
      "2025-12",
    );
  });
});

describe("monthlySettlementReminderFlexMessage", () => {
  it("builds a settlement summary Flex Message with a detail footer", () => {
    const message = monthlySettlementReminderFlexMessage({
      detailBaseUrl: "https://liff.example.com/",
      users: [
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
      settlement: {
        month: "2026-06",
        householdTotal: 15001,
        difference: 5001,
        userTotals: [
          { userId: "woman", displayName: "ひとみ", total: 10001 },
          { userId: "man", displayName: "げんき", total: 5000 },
        ],
        settlement: {
          fromUserId: "man",
          toUserId: "woman",
          amount: 2501,
        },
      },
    });

    expect(message.altText).toBe("先月の精算をしてね！ 2026-06 ￥2,501");
    expect(JSON.stringify(message)).toContain("FROM");
    expect(JSON.stringify(message)).toContain("げんき");
    expect(JSON.stringify(message)).toContain("TO");
    expect(JSON.stringify(message)).toContain("ひとみ");
    expect(JSON.stringify(message)).toContain("￥10,001");
    expect(JSON.stringify(message)).toContain("https://liff.example.com/?month=2026-06");
    expect(message.contents.styles).toEqual({
      body: { backgroundColor: "#F6F7F4" },
      footer: { backgroundColor: "#F6F7F4" },
    });
  });
});

describe("runMonthlySettlementReminder", () => {
  it("reads Spreadsheet data and sends the monthly settlement Flex Message to enabled users", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const pushedMessages: PushLineMessageInput[] = [];

    const result = await runMonthlySettlementReminder({
      now: new Date("2026-07-05T10:00:00.000Z"),
      env: {
        GOOGLE_SPREADSHEET_ID: "spreadsheet_1",
        GOOGLE_SERVICE_ACCOUNT_EMAIL: "jobs@example.iam.gserviceaccount.com",
        GOOGLE_PRIVATE_KEY:
          "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
        LINE_LIFF_ID: "1234567890-shared-expense",
      },
      dependencies: {
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

          return Response.json({
            values: [
              [
                "2148",
                "1",
                "食費",
                "10001",
                "2026/06/22",
                "スーパー",
                "1",
                "1",
                "2026/06/22 22:35:03",
                "2026/06/22 22:35:03",
                "45826",
              ],
              [
                "2145",
                "2",
                "食費",
                "5000",
                "2026/06/20",
                "カフェ",
                "2",
                "2",
                "2026/06/20 10:59:03",
                "2026/06/20 10:59:03",
                "45824",
              ],
            ],
          });
        },
        lineMessagingClient: {
          pushMessage: async (input) => {
            pushedMessages.push(input);
          },
          replyMessage: async () => {},
        },
      },
    });

    expect(result).toEqual({
      targetMonth: "2026-06",
      notifiedUserIds: ["woman", "man"],
    });
    expect(calls.map((call) => call.url)).toEqual([
      "https://oauth2.googleapis.com/token",
      "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/users!A2%3AF",
      "https://oauth2.googleapis.com/token",
      "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/users!A2%3AF",
      "https://oauth2.googleapis.com/token",
      "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/payments!A2%3AL",
    ]);
    expect(pushedMessages).toHaveLength(2);
    expect(pushedMessages.map((message) => message.to)).toEqual([
      "line_woman",
      "line_man",
    ]);
    expect(
      (pushedMessages[0]?.messages[0] as LineMessage | undefined)?.type,
    ).toBe("flex");
    expect(JSON.stringify(pushedMessages[0])).toContain("￥2,501");
    expect(JSON.stringify(pushedMessages[0])).toContain(
      "https://liff.line.me/1234567890-shared-expense?month=2026-06",
    );
    expect(JSON.stringify(pushedMessages[0])).not.toContain(
      "https://shared-expense.pages.dev",
    );
  });
});
