import type { LineMessagingClient } from "@shared-expense/integrations";
import {
  buildExpenseEventId,
  findPartnerUser,
  type Expense,
  type ExpenseEventType,
  type User,
} from "@shared-expense/shared";
import type { HouseholdUserRepository } from "../core/users/repository";

export type ExpenseMutationNotificationInput = {
  eventType: ExpenseEventType;
  actor: User;
  expense: Expense;
};

export type ExpenseMutationNotifier = {
  notify(input: ExpenseMutationNotificationInput): Promise<void>;
};

export type ExpenseMutationNotifierInput = {
  userRepository: HouseholdUserRepository;
  lineMessagingClient: LineMessagingClient;
};

export function createExpenseMutationNotifier(
  input: ExpenseMutationNotifierInput,
): ExpenseMutationNotifier {
  return {
    async notify(notification): Promise<void> {
      const users = await input.userRepository.listHouseholdUsers();
      const recipient = findPartnerUser(users, notification.actor.id);
      if (recipient === null || !recipient.notifyEnabled) {
        return;
      }

      await input.lineMessagingClient.pushMessage({
        to: recipient.lineUserId,
        messages: [
          {
            type: "text",
            text: expenseMutationMessage(notification),
          },
        ],
      });
    },
  };
}

export const noopExpenseMutationNotifier: ExpenseMutationNotifier = {
  notify: async () => {},
};

function expenseMutationMessage(input: ExpenseMutationNotificationInput): string {
  return [
    `${input.actor.displayName}さんが支出を${eventVerb(input.eventType)}しました`,
    `${formatDate(input.expense.date)} ${expenseTitle(input.expense)}`,
    formatYen(input.expense.price),
    `通知ID: ${buildExpenseEventId(
      input.eventType,
      input.expense.id,
      input.expense.version,
    )}`,
  ].join("\n");
}

function eventVerb(eventType: ExpenseEventType): string {
  if (eventType === "expense.created") {
    return "追加";
  }

  if (eventType === "expense.updated") {
    return "更新";
  }

  return "削除";
}

function expenseTitle(expense: Expense): string {
  const memo = expense.memo?.trim();
  return memo === undefined || memo === "" ? expense.category : memo;
}

function formatDate(date: string): string {
  return date.replaceAll("-", "/");
}

function formatYen(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}
