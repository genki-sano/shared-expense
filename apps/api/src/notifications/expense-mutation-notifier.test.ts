import type { LineMessagingClient } from "@shared-expense/integrations";
import type { Expense, User } from "@shared-expense/shared";
import { describe, expect, it } from "vitest";
import { InMemoryHouseholdUserRepository } from "../core/users/repository";
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
      lineMessagingClient: {
        pushMessage: async (input) => {
          pushed.push(input);
        },
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
            type: "text",
            text: [
              "ひとみさんが支出を追加しました",
              "2026/07/22 アイス",
              "￥328",
              "通知ID: expense.created:2148:v1",
            ].join("\n"),
          },
        ],
      },
    ]);
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
