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
    displayName: "花子",
    notifyEnabled: true,
  },
  {
    id: "man",
    lineUserId: "line_man",
    displayName: "太郎",
    notifyEnabled: true,
  },
];

describe("parseExpenseMessage", () => {
  it("parses price and memo split by half-width or full-width spaces", () => {
    expect(parseExpenseMessage("1200 コンビニ")).toEqual({
      memo: "コンビニ",
      price: 1200,
    });
    expect(parseExpenseMessage("１，２００　昼食")).toEqual({
      memo: "昼食",
      price: 1200,
    });
  });

  it("rejects unsupported messages", () => {
    expect(parseExpenseMessage("1200")).toBeNull();
    expect(parseExpenseMessage("コンビニ 1200")).toBeNull();
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
  it("replies with onboarding choices when the user follows the LINE account", async () => {
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
      userRepository: new InMemoryHouseholdUserRepository([
        { ...users[0], displayName: "Alice", lineUserId: "" },
        { ...users[1], displayName: "Bob", lineUserId: "" },
      ]),
    });
    const bodyText = JSON.stringify({
      events: [
        {
          type: "follow",
          replyToken: "reply-token-1",
          source: { type: "user", userId: "line_new" },
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
          expect.objectContaining({
            type: "flex",
            altText: "初回登録: 使うユーザーを選択してください",
          }),
        ],
      },
    ]);
    expect(JSON.stringify(replied)).toContain("Alice");
    expect(JSON.stringify(replied)).toContain("Bob");
    expect(JSON.stringify(replied)).toContain("#5B4638");
    expect(JSON.stringify(replied)).toContain("#8A7669");
    expect(JSON.stringify(replied)).toContain("#F48778");
    expect(JSON.stringify(replied)).toContain("#8FB99A");
    expect(JSON.stringify(replied)).toContain("action=claimUser&userId=woman");
    expect(JSON.stringify(replied)).toContain("action=claimUser&userId=man");
  });

  it("claims a household user slot from a LINE postback", async () => {
    const replied: ReplyLineMessageInput[] = [];
    const userRepository = new InMemoryHouseholdUserRepository([
      { ...users[0], lineUserId: "" },
      { ...users[1], lineUserId: "" },
    ]);
    const app = createLineWebhookRoutes({
      channelSecret: "channel-secret",
      expenseRepository: new InMemoryExpenseRepository([]),
      lineMessagingClient: {
        pushMessage: async () => {},
        replyMessage: async (input) => {
          replied.push(input);
        },
      },
      userRepository,
    });
    const bodyText = JSON.stringify({
      events: [
        {
          type: "postback",
          replyToken: "reply-token-1",
          source: { type: "user", userId: "line_new" },
          postback: { data: "action=claimUser&userId=woman" },
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
    await expect(userRepository.listHouseholdUsers()).resolves.toEqual([
      { ...users[0], lineUserId: "line_new" },
      { ...users[1], lineUserId: "" },
    ]);
    expect(replied).toEqual([
      {
        replyToken: "reply-token-1",
        messages: [
          {
            type: "text",
            text: "花子さんとして登録しました。支出は「金額 支払内容」の形式で送信できます。",
          },
        ],
      },
    ]);
  });

  it("replies with onboarding choices when an unregistered user sends text", async () => {
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
      userRepository: new InMemoryHouseholdUserRepository([
        { ...users[0], lineUserId: "" },
        { ...users[1], lineUserId: "" },
      ]),
    });
    const bodyText = JSON.stringify({
      events: [
        {
          type: "message",
          replyToken: "reply-token-1",
          source: { type: "user", userId: "line_new" },
          message: { type: "text", text: "1200 コンビニ" },
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
    expect(replied[0]?.messages[0]).toMatchObject({
      type: "flex",
      altText: "初回登録: 使うユーザーを選択してください",
    });
  });

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
          message: { type: "text", id: "message-1", text: "1200 コンビニ" },
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
      "https://liff.line.me/1234567890-shared-expense/expense?expenseId=exp_1",
    );
    expect(replied).toEqual([
      {
        replyToken: "reply-token-1",
        messages: [
          expect.objectContaining({
            type: "flex",
            altText: "花子さんが支出を追加しました: コンビニ ￥1,200",
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
            text: "登録できませんでした。`金額 支払内容` の形式で送信してください。例: `1200 コンビニ`",
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
