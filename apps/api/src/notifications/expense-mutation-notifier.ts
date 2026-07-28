import type {
  LineFlexBox,
  LineFlexMessage,
  LineMessagingClient,
} from "@shared-expense/integrations";
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
          expenseMutationFlexMessage(notification),
        ],
      });
    },
  };
}

export const noopExpenseMutationNotifier: ExpenseMutationNotifier = {
  notify: async () => {},
};

function expenseMutationFlexMessage(
  input: ExpenseMutationNotificationInput,
): LineFlexMessage {
  const verb = eventVerb(input.eventType);
  const title = expenseTitle(input.expense);
  const amount = formatYen(input.expense.price);

  return {
    type: "flex",
    altText: `${input.actor.displayName}さんが支出を${verb}しました: ${title} ${amount}`,
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
            text: `支出を${verb}しました`,
            size: "sm",
            color: eventColor(input.eventType),
            weight: "bold",
          },
          {
            type: "text",
            text: title,
            size: "xl",
            color: "#17211F",
            weight: "bold",
            wrap: true,
          },
          {
            type: "text",
            text: amount,
            size: "xxl",
            color: "#176B87",
            weight: "bold",
          },
          {
            type: "separator",
            margin: "md",
            color: "#D7DED9",
          },
          labelValueBox("日付", formatDate(input.expense.date)),
          labelValueBox("支払者", input.actor.displayName),
          labelValueBox("通知ID", buildExpenseEventId(
            input.eventType,
            input.expense.id,
            input.expense.version,
          )),
        ],
      },
      styles: {
        body: {
          backgroundColor: "#F6F7F4",
        },
      },
    },
  };
}

function labelValueBox(label: string, value: string): LineFlexBox {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      {
        type: "text",
        text: label,
        size: "xs",
        color: "#63716B",
        flex: 2,
      },
      {
        type: "text",
        text: value,
        size: "xs",
        color: "#17211F",
        weight: "bold",
        wrap: true,
        flex: 5,
      },
    ],
  };
}

function eventColor(eventType: ExpenseEventType): string {
  if (eventType === "expense.created") {
    return "#176B87";
  }

  if (eventType === "expense.updated") {
    return "#8A5A00";
  }

  return "#9A3412";
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
