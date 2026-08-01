import type {
  LineFlexMessage,
  LineMessage,
  ReplyLineMessageInput,
} from "@shared-expense/integrations";
import type { HouseholdUsers, User } from "@shared-expense/shared";
import { describe, expect, it } from "vitest";
import { InMemoryHouseholdUserRepository } from "../core/users/repository";
import { InMemoryExpenseRepository } from "../expenses/repository";
import {
  createLineWebhookRoutes,
  parseExpenseMessage,
  verifyLineWebhookSignature,
} from "./routes";

const users: HouseholdUsers = [
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
];

describe("parseExpenseMessage", () => {
  it("parses memo and price split by half-width or full-width spaces", () => {
    expect(parseExpenseMessage("コンビニ 1200")).toEqual({
      memo: "コンビニ",
      price: 1200,
    });
    expect(parseExpenseMessage("昼食　１，２００")).toEqual({
      memo: "昼食",
      price: 1200,
    });
  });

  it("rejects unsupported messages", () => {
    expect(parseExpenseMessage("1200")).toBeNull();
    expect(parseExpenseMessage("昼食 abc")).toBeNull();
  });
});

describe("verifyLineWebhookSignature", () => {
  it("verifies the raw body using the LINE channel secret", async () => {
    const bodyText = '{"destination":"bot","events":[]}';
    const signature = await sign(bodyText, "channel-secret");

    await expect(
      verifyLineWebhookSignature({
        bodyText,
        channelSecret: "channel-secret",
        signature,
      }),
    ).resolves.toBe(true);
    await expect(
      verifyLineWebhookSignature({
        bodyText,
        channelSecret: "wrong-secret",
        signature,
      }),
    ).resolves.toBe(false);
  });
});

describe("createLineWebhookRoutes", () => {
  it("creates today's expense from a LINE text message, replies to the sender, and pushes to the partner", async () => {
    const repository = new InMemoryExpenseRepository([]);
    const pushed: Array<{ to: string; messages: LineMessage[] }> = [];
    const replied: ReplyLineMessageInput[] = [];
    const app = createLineWebhookRoutes({
      channelSecret: "channel-secret",
      detailBaseUrl: "https://liff.line.me/1234567890-shared-expense",
      expenseRepository: repository,
      lineMessagingClient: {
        pushMessage: async (input) => {
          pushed.push(input);
        },
        replyMessage: async (input) => {
          replied.push(input);
        },
      },
      userRepository: new InMemoryHouseholdUserRepository(users),
      now: () => new Date("2026-08-01T03:00:00.000Z"),
    });
    const bodyText = JSON.stringify({
      destination: "bot",
      events: [
        {
          type: "message",
          webhookEventId: "webhook-event-1",
          replyToken: "reply-token-1",
          source: { type: "user", userId: "line_woman" },
          message: { type: "text", id: "message-1", text: "コンビニ 1200" },
        },
      ],
    });

    const response = await app.request("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-line-signature": await sign(bodyText, "channel-secret"),
      },
      body: bodyText,
    });

    expect(response.status).toBe(200);
    await expect(
      repository.listByMonth({ month: "2026-08", actor: users[0] }),
    ).resolves.toMatchObject([
      {
        userId: "woman",
        date: "2026-08-01",
        price: 1200,
        category: "その他",
        memo: "コンビニ",
      },
    ]);
    expect(pushed.map((message) => message.to)).toEqual(["line_man"]);
    expect((pushed[0]?.messages[0] as LineFlexMessage | undefined)?.type).toBe("flex");
    expect(JSON.stringify(pushed)).toContain("支出を追加しました");
    expect(JSON.stringify(pushed)).toContain("コンビニ");
    expect(JSON.stringify(pushed)).toContain("￥1,200");
    expect(JSON.stringify(pushed)).toContain(
      "https://liff.line.me/1234567890-shared-expense?month=2026-08",
    );
    expect(replied).toEqual([
      {
        replyToken: "reply-token-1",
        messages: [
          expect.objectContaining({
            type: "flex",
            altText: "ひとみさんが支出を追加しました: コンビニ ￥1,200",
          }),
        ],
      },
    ]);
  });

  it("replies when registration fails because the text format is invalid", async () => {
    const replied: ReplyLineMessageInput[] = [];
    const app = createLineWebhookRoutes({
      channelSecret: "channel-secret",
      expenseRepository: new InMemoryExpenseRepository([]),
      lineMessagingClient: {
        pushMessage: async () => {},
        replyMessage: async (input) => {
          replied.push(input);
        },
      },
      userRepository: new InMemoryHouseholdUserRepository(users),
    });
    const bodyText = JSON.stringify({
      events: [
        {
          type: "message",
          replyToken: "reply-token-1",
          source: { type: "user", userId: "line_woman" },
          message: { type: "text", text: "コンビニ" },
        },
      ],
    });

    const response = await app.request("/", {
      method: "POST",
      headers: {
        "x-line-signature": await sign(bodyText, "channel-secret"),
      },
      body: bodyText,
    });

    expect(response.status).toBe(200);
    expect(replied).toEqual([
      {
        replyToken: "reply-token-1",
        messages: [
          {
            type: "text",
            text: "登録できませんでした。`支払内容 金額` の形式で送信してください。",
          },
        ],
      },
    ]);
  });

  it("rejects requests with invalid signatures", async () => {
    const app = createLineWebhookRoutes({
      channelSecret: "channel-secret",
      expenseRepository: new InMemoryExpenseRepository([]),
      lineMessagingClient: {
        pushMessage: async () => {},
        replyMessage: async () => {},
      },
      userRepository: new InMemoryHouseholdUserRepository(users),
    });

    const response = await app.request("/", {
      method: "POST",
      headers: { "x-line-signature": "bad-signature" },
      body: JSON.stringify({ events: [] }),
    });

    expect(response.status).toBe(401);
  });
});

async function sign(bodyText: string, channelSecret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(bodyText),
  );
  return bytesToBase64(new Uint8Array(digest));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
