import type {
  LineFlexMessage,
  LineMessagingClient,
} from "@shared-expense/integrations";
import type { Expense, User } from "@shared-expense/shared";
import { Hono } from "hono";
import type { ExpenseRepository } from "../core/expenses/repository";
import { expenseMutationFlexMessage } from "../core/notifications/expense-mutation-notifier";
import type {
  ClaimableHouseholdUserRepository,
  HouseholdUserRepository,
} from "../core/users/repository";

export type LineWebhookRoutesDependencies = {
  channelSecret: string;
  expenseRepository: ExpenseRepository;
  detailBaseUrl?: string | undefined;
  lineMessagingClient: LineMessagingClient;
  userRepository: ClaimableHouseholdUserRepository;
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
  postback?: {
    data?: string;
  };
};

const WEBHOOK_CATEGORY = "その他";
const ONBOARDING_ACTION = "claimUser";
const ONBOARDING_TEXT_PRIMARY_COLOR = "#5B4638";
const ONBOARDING_TEXT_SECONDARY_COLOR = "#8A7669";
const ONBOARDING_WOMAN_COLOR = "#F48778";
const ONBOARDING_MAN_COLOR = "#8FB99A";

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
  if (event.replyToken === undefined) {
    return;
  }

  if (event.type === "follow") {
    await replyOnboardingGuide(dependencies, event);
    return;
  }

  if (event.type === "postback") {
    await handleOnboardingPostback(dependencies, event);
    return;
  }

  if (event.type === "message" && event.message?.type === "text") {
    await handleTextMessage(dependencies, event);
  }
}

async function handleTextMessage(
  dependencies: LineWebhookRoutesDependencies,
  event: LineWebhookEvent,
): Promise<void> {
  if (event.replyToken === undefined) {
    return;
  }

  const actor = await findUserByLineUserId(
    dependencies.userRepository,
    event.source?.userId,
  );
  if (actor === null) {
    await replyOnboardingGuide(dependencies, event);
    return;
  }

  const parsedText = parseExpenseMessage(event.message?.text ?? "");
  if (parsedText === null) {
    await replyText(
      dependencies.lineMessagingClient,
      event.replyToken,
      "登録できませんでした。`金額 支払内容` の形式で送信してください。",
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
    await dependencies.lineMessagingClient.replyMessage({
      replyToken: event.replyToken,
      messages: [successFlexMessage(dependencies, { actor, expense })],
    });
  } catch (error) {
    console.error("LINE webhook expense success reply failed", {
      reason: errorMessage(error),
      webhookEventId: event.webhookEventId,
    });
  }

  await notifyPartnerUsers(dependencies, {
    actor,
    expense,
    webhookEventId: event.webhookEventId,
  });
}

async function replyOnboardingGuide(
  dependencies: LineWebhookRoutesDependencies,
  event: LineWebhookEvent,
): Promise<void> {
  if (event.replyToken === undefined) {
    return;
  }

  const actor = await findUserByLineUserId(
    dependencies.userRepository,
    event.source?.userId,
  );
  if (actor !== null) {
    await replyText(
      dependencies.lineMessagingClient,
      event.replyToken,
      `${actor.displayName}さんとして登録済みです。支出は「金額 支払内容」の形式で送信できます。`,
    );
    return;
  }

  const users = await dependencies.userRepository.listHouseholdUsers();
  await dependencies.lineMessagingClient.replyMessage({
    replyToken: event.replyToken,
    messages: [onboardingFlexMessage(users)],
  });
}

async function handleOnboardingPostback(
  dependencies: LineWebhookRoutesDependencies,
  event: LineWebhookEvent,
): Promise<void> {
  if (event.replyToken === undefined) {
    return;
  }

  const lineUserId = event.source?.userId;
  if (lineUserId === undefined || lineUserId.trim() === "") {
    await replyText(
      dependencies.lineMessagingClient,
      event.replyToken,
      "登録できませんでした。1対1のトークからもう一度お試しください。",
    );
    return;
  }

  const postback = parseOnboardingPostback(event.postback?.data);
  if (postback === null) {
    return;
  }

  const users = await dependencies.userRepository.listHouseholdUsers();
  const existingUser = users.find((user) => user.lineUserId === lineUserId);
  if (existingUser !== undefined) {
    await replyText(
      dependencies.lineMessagingClient,
      event.replyToken,
      `${existingUser.displayName}さんとして登録済みです。`,
    );
    return;
  }

  const targetUser = users.find((user) => user.id === postback.userId);
  if (targetUser === undefined) {
    await replyText(
      dependencies.lineMessagingClient,
      event.replyToken,
      "登録先のユーザーが見つかりませんでした。",
    );
    return;
  }

  if (targetUser.lineUserId.trim() !== "") {
    await replyText(
      dependencies.lineMessagingClient,
      event.replyToken,
      `${targetUser.displayName}さんは登録済みです。別のユーザーを選んでください。`,
    );
    return;
  }

  const claimedUser = await dependencies.userRepository.claimHouseholdUser({
    userId: postback.userId,
    lineUserId,
  });
  await replyText(
    dependencies.lineMessagingClient,
    event.replyToken,
    `${claimedUser.displayName}さんとして登録しました。支出は「金額 支払内容」の形式で送信できます。`,
  );
}

function parseOnboardingPostback(
  data: string | undefined,
): { userId: string } | null {
  if (data === undefined || data.trim() === "") {
    return null;
  }

  const params = new URLSearchParams(data);
  if (params.get("action") !== ONBOARDING_ACTION) {
    return null;
  }

  const userId = params.get("userId");
  if (userId !== "woman" && userId !== "man") {
    return null;
  }

  return { userId };
}

function onboardingFlexMessage(users: readonly User[]): LineFlexMessage {
  return {
    type: "flex",
    altText: "初回登録: 使うユーザーを選択してください",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "はじめまして！",
            weight: "bold",
            size: "lg",
            color: ONBOARDING_TEXT_PRIMARY_COLOR,
          },
          {
            type: "text",
            text: "家計簿で使うユーザーを選択してください。",
            wrap: true,
            size: "sm",
            color: ONBOARDING_TEXT_SECONDARY_COLOR,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: onboardingButtons(users),
      },
    },
  };
}

function onboardingButtons(users: readonly User[]) {
  return users
    .filter(isOnboardingUser)
    .map((user) =>
      onboardingButton(
        user.displayName,
        user.id,
        user.id === "woman" ? ONBOARDING_WOMAN_COLOR : ONBOARDING_MAN_COLOR,
      ),
    );
}

function isOnboardingUser(user: User): user is User & { id: "woman" | "man" } {
  return user.id === "woman" || user.id === "man";
}

function onboardingButton(
  label: string,
  userId: "woman" | "man",
  color: string,
) {
  return {
    type: "button" as const,
    style: "primary" as const,
    color,
    action: {
      type: "postback" as const,
      label,
      data: `action=${ONBOARDING_ACTION}&userId=${userId}`,
      displayText: label,
    },
  };
}

export function parseExpenseMessage(
  text: string,
): { memo: string; price: number } | null {
  const match = text.trim().match(/^([0-9０-９,，]+)[\u0020\u3000]+(.+?)$/u);
  if (match === null) {
    return null;
  }

  const priceText = normalizeDigits(match[1] ?? "").replaceAll(",", "");
  const memo = match[2]?.trim();
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

async function notifyPartnerUsers(
  dependencies: LineWebhookRoutesDependencies,
  input: { actor: User; expense: Expense; webhookEventId?: string | undefined },
): Promise<void> {
  const users = await dependencies.userRepository.listHouseholdUsers();
  const results = await Promise.allSettled(
    users
      .filter((user) => user.id !== input.actor.id && user.notifyEnabled)
      .map((user) =>
        dependencies.lineMessagingClient.pushMessage({
          to: user.lineUserId,
          messages: [successFlexMessage(dependencies, input)],
        }),
      ),
  );

  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      continue;
    }

    const recipient = users.filter(
      (user) => user.id !== input.actor.id && user.notifyEnabled,
    )[index];
    console.error("LINE webhook expense partner notification failed", {
      reason: errorMessage(result.reason),
      recipientUserId: recipient?.id,
      webhookEventId: input.webhookEventId,
    });
  }
}

function successFlexMessage(
  dependencies: Pick<LineWebhookRoutesDependencies, "detailBaseUrl">,
  input: { actor: User; expense: Expense },
) {
  return expenseMutationFlexMessage(
    {
      eventType: "expense.created",
      actor: input.actor,
      expense: input.expense,
    },
    dependencies.detailBaseUrl,
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

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
