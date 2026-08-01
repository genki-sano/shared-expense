import type { LineMessagingClient } from "@shared-expense/integrations";
import type { Expense, User } from "@shared-expense/shared";
import { Hono } from "hono";
import type { HouseholdUserRepository } from "../core/users/repository";
import type { ExpenseRepository } from "../expenses/repository";

export type LineWebhookRoutesDependencies = {
  channelSecret: string;
  expenseRepository: ExpenseRepository;
  lineMessagingClient: LineMessagingClient;
  userRepository: HouseholdUserRepository;
  now?: () => Date;
};

type LineWebhookRequest = {
  events?: unknown;
};

type LineWebhookEvent = {
  type: string;
  webhookEventId?: string;
  replyToken?: string;
  source?: {
    userId?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
};

const WEBHOOK_CATEGORY = "その他";

export function createLineWebhookRoutes(
  dependencies: LineWebhookRoutesDependencies,
): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const bodyText = await c.req.text();
    const signature = c.req.header("x-line-signature");
    const signatureOk = await verifyLineWebhookSignature({
      bodyText,
      channelSecret: dependencies.channelSecret,
      signature,
    });
    if (!signatureOk) {
      return c.json({ message: "Invalid signature" }, 401);
    }

    const body = parseWebhookBody(bodyText);
    if (body === null || !Array.isArray(body.events)) {
      return c.json({ message: "Invalid request" }, 400);
    }

    for (const event of body.events) {
      if (!isLineWebhookEvent(event)) {
        continue;
      }

      await handleLineWebhookEvent(dependencies, event);
    }

    return c.json({ ok: true });
  });

  return app;
}

async function handleLineWebhookEvent(
  dependencies: LineWebhookRoutesDependencies,
  event: LineWebhookEvent,
): Promise<void> {
  if (
    event.type !== "message" ||
    event.message?.type !== "text" ||
    event.replyToken === undefined
  ) {
    return;
  }

  const parsedText = parseExpenseMessage(event.message.text ?? "");
  if (parsedText === null) {
    await replyText(
      dependencies.lineMessagingClient,
      event.replyToken,
      "登録できませんでした。`支払内容 金額` の形式で送信してください。",
    );
    return;
  }

  const actor = await findUserByLineUserId(
    dependencies.userRepository,
    event.source?.userId,
  );
  if (actor === null) {
    await replyText(
      dependencies.lineMessagingClient,
      event.replyToken,
      "登録できませんでした。このLINEユーザーは家計簿に登録されていません。",
    );
    return;
  }

  let expense: Expense;
  try {
    expense = await dependencies.expenseRepository.create({
      actor,
      date: todayInJst(dependencies.now?.() ?? new Date()),
      price: parsedText.price,
      category: WEBHOOK_CATEGORY,
      memo: parsedText.memo,
    });
  } catch (error) {
    console.error("LINE webhook expense create failed", {
      reason: errorMessage(error),
      webhookEventId: event.webhookEventId,
    });
    await replyText(
      dependencies.lineMessagingClient,
      event.replyToken,
      "登録できませんでした。時間をおいて再度お試しください。",
    );
    return;
  }

  try {
    await notifyAllUsers(dependencies, {
      actor,
      expense,
    });
  } catch (error) {
    console.error("LINE webhook expense notification failed", {
      reason: errorMessage(error),
      webhookEventId: event.webhookEventId,
    });
  }
}

export function parseExpenseMessage(
  text: string,
): { memo: string; price: number } | null {
  const match = text.trim().match(/^(.+?)[\u0020\u3000]+([0-9０-９,，]+)$/u);
  if (match === null) {
    return null;
  }

  const memo = match[1]?.trim();
  const priceText = normalizeDigits(match[2] ?? "").replaceAll(",", "");
  const price = Number(priceText);
  if (
    memo === undefined ||
    memo === "" ||
    !Number.isSafeInteger(price) ||
    price < 0
  ) {
    return null;
  }

  return { memo, price };
}

export async function verifyLineWebhookSignature(input: {
  bodyText: string;
  channelSecret: string;
  signature: string | undefined;
}): Promise<boolean> {
  if (input.signature === undefined || input.signature.trim() === "") {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(input.channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(input.bodyText),
  );
  const expected = bytesToBase64(new Uint8Array(digest));
  return timingSafeEqual(expected, input.signature);
}

async function notifyAllUsers(
  dependencies: LineWebhookRoutesDependencies,
  input: { actor: User; expense: Expense },
): Promise<void> {
  const users = await dependencies.userRepository.listHouseholdUsers();
  await Promise.all(
    users
      .filter((user) => user.notifyEnabled)
      .map((user) =>
        dependencies.lineMessagingClient.pushMessage({
          to: user.lineUserId,
          messages: [
            {
              type: "text",
              text: `${input.actor.displayName}さんが支出を登録しました\n${input.expense.memo ?? input.expense.category} ${formatYen(input.expense.price)}`,
            },
          ],
        }),
      ),
  );
}

async function replyText(
  client: LineMessagingClient,
  replyToken: string,
  text: string,
): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}

async function findUserByLineUserId(
  userRepository: HouseholdUserRepository,
  lineUserId: string | undefined,
): Promise<User | null> {
  if (lineUserId === undefined || lineUserId.trim() === "") {
    return null;
  }

  const users = await userRepository.listHouseholdUsers();
  return users.find((user) => user.lineUserId === lineUserId) ?? null;
}

function todayInJst(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error("Failed to resolve current date in JST");
  }

  return `${year}-${month}-${day}`;
}

function normalizeDigits(value: string): string {
  return value.replace(/[０-９，]/gu, (char) => {
    if (char === "，") {
      return ",";
    }

    return String(char.charCodeAt(0) - "０".charCodeAt(0));
  });
}

function parseWebhookBody(bodyText: string): LineWebhookRequest | null {
  try {
    const body = JSON.parse(bodyText) as unknown;
    return typeof body === "object" && body !== null ? body : null;
  } catch {
    return null;
  }
}

function isLineWebhookEvent(value: unknown): value is LineWebhookEvent {
  return typeof value === "object" && value !== null && "type" in value;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

function formatYen(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
