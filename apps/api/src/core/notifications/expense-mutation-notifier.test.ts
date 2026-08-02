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

    expect(pushed).toEqual([
      {
        to: "line_man",
        messages: [
          {
            type: "flex",
            altText: "ひとみさんが支出を追加しました: アイス ￥328",
            contents: {
              type: "bubble",
              size: "mega",
              body: {
                type: "box",
                layout: "vertical",
                spacing: "md",
                contents: [
                  {
                    type: "text",
                    text: "支出を追加しました",
                    size: "sm",
                    color: "#176B87",
                    weight: "bold",
                  },
                  {
                    type: "text",
                    text: "アイス",
                    size: "xl",
                    color: "#17211F",
                    weight: "bold",
                    wrap: true,
                  },
                  {
                    type: "text",
                    text: "￥328",
                    size: "xxl",
                    color: "#176B87",
                    weight: "bold",
                  },
                  {
                    type: "separator",
                    margin: "md",
                  },
                  expect.objectContaining({
                    type: "box",
                    layout: "horizontal",
                  }),
                  expect.objectContaining({
                    type: "box",
                    layout: "horizontal",
                  }),
                ],
              },
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
          },
        ],
      },
    ]);
    expect(JSON.stringify(pushed[0]?.messages[0])).not.toContain("通知ID");
    expect(JSON.stringify(pushed[0]?.messages[0])).not.toContain("expense.created");
    expect(JSON.stringify(pushed[0]?.messages[0])).not.toContain("#D7DED9");
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
