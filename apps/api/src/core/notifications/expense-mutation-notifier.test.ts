import type { LineMessagingClient } from "@shared-expense/integrations";
import type { Expense, User } from "@shared-expense/shared";
import { describe, expect, it } from "vitest";
import { InMemoryHouseholdUserRepository } from "../users/repository";
import { createExpenseMutationNotifier } from "./expense-mutation-notifier";

const actor: User = {
  id: "woman",
  lineUserId: "line_woman",
  displayName: "ひとみ",
  notifyEnabled: true,
};

const partner: User = {
  id: "man",
  lineUserId: "line_man",
  displayName: "げんき",
  notifyEnabled: true,
};

const expense: Expense = {
  id: "2148",
  userId: "woman",
  date: "2026-07-22",
  price: 328,
  category: "食費",
  memo: "アイス",
  version: 1,
};

describe("createExpenseMutationNotifier", () => {
  it("pushes an expense mutation message to the partner", async () => {
    const pushed: Parameters<LineMessagingClient["pushMessage"]>[0][] = [];
    const notifier = createExpenseMutationNotifier({
      userRepository: new InMemoryHouseholdUserRepository([actor, partner]),
      detailBaseUrl: "https://liff.line.me/1234567890-shared-expense",
      lineMessagingClient: {
        pushMessage: async (input) => {
          pushed.push(input);
        },
        replyMessage: async () => {},
      },
    });

    await notifier.notify({
      eventType: "expense.created",
      actor,
      expense,
    });

    expect(pushed).toHaveLength(1);
    expect(pushed[0]?.to).toBe("line_man");
    const message = pushed[0]?.messages[0];
    if (message?.type !== "flex") {
      throw new Error("Expected a Flex Message");
    }

    expect(message).toMatchObject({
      type: "flex",
      altText: "ひとみさんが支出を追加しました: アイス ￥328",
      contents: {
        type: "bubble",
        size: "mega",
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "sm",
              color: "#176B87",
              action: {
                type: "uri",
                label: "詳細を確認",
                uri: "https://liff.line.me/1234567890-shared-expense/expense?expenseId=2148",
              },
            },
          ],
        },
        styles: {
          body: {
            backgroundColor: "#F6F7F4",
          },
          footer: {
            backgroundColor: "#F6F7F4",
          },
        },
      },
    });

    const messageJson = JSON.stringify(message);
    expect(messageJson).toContain("支出を追加しました");
    expect(messageJson).toContain("アイス");
    expect(messageJson).toContain("￥328");
    expect(messageJson).toContain("2026/07/22");
    expect(messageJson).toContain("ひとみ");
    expect(messageJson).not.toContain("通知ID");
    expect(messageJson).not.toContain("expense.created");
    expect(messageJson).not.toContain("#D7DED9");
  });

  it("uses distinct colors for create, update, and delete notifications", async () => {
    const pushed: Parameters<LineMessagingClient["pushMessage"]>[0][] = [];
    const notifier = createExpenseMutationNotifier({
      userRepository: new InMemoryHouseholdUserRepository([actor, partner]),
      detailBaseUrl: "https://liff.line.me/1234567890-shared-expense",
      lineMessagingClient: {
        pushMessage: async (input) => {
          pushed.push(input);
        },
        replyMessage: async () => {},
      },
    });

    await notifier.notify({ eventType: "expense.created", actor, expense });
    await notifier.notify({ eventType: "expense.updated", actor, expense });
    await notifier.notify({ eventType: "expense.deleted", actor, expense });

    const messages = pushed.map((input) => JSON.stringify(input.messages[0]));
    expect(messages[0]).toContain("#176B87");
    expect(messages[0]).toContain("#F6F7F4");
    expect(messages[1]).toContain("#A05A00");
    expect(messages[1]).toContain("#FFF7E6");
    expect(messages[2]).toContain("#B42318");
    expect(messages[2]).toContain("#FFF1F0");
  });

  it("skips when the partner disabled notifications", async () => {
    const pushed: Parameters<LineMessagingClient["pushMessage"]>[0][] = [];
    const notifier = createExpenseMutationNotifier({
      userRepository: new InMemoryHouseholdUserRepository([
        actor,
        { ...partner, notifyEnabled: false },
      ]),
      lineMessagingClient: {
        pushMessage: async (input) => {
          pushed.push(input);
        },
        replyMessage: async () => {},
      },
    });

    await notifier.notify({
      eventType: "expense.deleted",
      actor,
      expense,
    });

    expect(pushed).toEqual([]);
  });
});
