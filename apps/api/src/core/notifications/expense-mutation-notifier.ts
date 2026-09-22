import type {
  LineFlexBox,
  LineFlexMessage,
  LineMessagingClient,
} from "@shared-expense/integrations";
import {
  findPartnerUser,
  type Expense,
  type ExpenseEventType,
  type User,
} from "@shared-expense/shared";
import type { HouseholdUserRepository } from "../users/repository";

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
  detailBaseUrl?: string;
};

type NotificationTheme = {
  accentColor: string;
  backgroundColor: string;
};

const MAN_DARK_COLOR = "#648A70";
const MAN_LIGHT_COLOR = "#DCEBDD";
const WOMAN_DARK_COLOR = "#D9685D";
const WOMAN_LIGHT_COLOR = "#FBE0DB";
const ACCENT_COLOR = "#E9B64E";
const BACKGROUND_COLOR = "#FFF9F2";
const TEXT_PRIMARY_COLOR = "#5B4638";
const TEXT_SECONDARY_COLOR = "#8A7669";

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
          expenseMutationFlexMessage(notification, input.detailBaseUrl),
        ],
      });
    },
  };
}

export const noopExpenseMutationNotifier: ExpenseMutationNotifier = {
  notify: async () => {},
};

export function expenseMutationFlexMessage(
  input: ExpenseMutationNotificationInput,
  detailBaseUrl: string | undefined,
): LineFlexMessage {
  const verb = eventVerb(input.eventType);
  const title = expenseTitle(input.expense);
  const amount = formatYen(input.expense.price);
  const detailUrl = detailUrlForExpense(detailBaseUrl, input.expense);
  const theme = eventTheme(input.eventType);

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
            color: theme.accentColor,
            weight: "bold",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: title,
                size: "lg",
                color: TEXT_PRIMARY_COLOR,
                weight: "bold",
                wrap: true,
              },
              {
                type: "text",
                text: amount,
                size: "xxl",
                color: theme.accentColor,
                weight: "bold",
              },
            ],
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "xl",
            contents: [
              labelValueBox("日付", formatDate(input.expense.date)),
              labelValueBox("支払者", input.actor.displayName),
            ],
          },
        ],
      },
      ...(detailUrl === null
        ? {}
        : {
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  height: "sm",
                  color: theme.accentColor,
                  action: {
                    type: "uri",
                    label: "詳細を確認",
                    uri: detailUrl,
                  },
                },
              ],
            },
          }),
      styles: {
        body: {
          backgroundColor: theme.backgroundColor,
        },
        footer: {
          backgroundColor: theme.backgroundColor,
        },
      },
    },
  };
}

function detailUrlForExpense(
  baseUrl: string | undefined,
  expense: Expense,
): string | null {
  if (baseUrl === undefined || baseUrl.trim() === "") {
    return null;
  }

  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/expense`;
  url.searchParams.set("expenseId", expense.id);
  return url.toString();
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
        size: "sm",
        color: TEXT_SECONDARY_COLOR,
        flex: 2,
      },
      {
        type: "text",
        text: value,
        size: "sm",
        color: TEXT_PRIMARY_COLOR,
        wrap: true,
        flex: 5,
      },
    ],
  };
}

function eventTheme(eventType: ExpenseEventType): NotificationTheme {
  if (eventType === "expense.created") {
    return {
      accentColor: MAN_DARK_COLOR,
      backgroundColor: MAN_LIGHT_COLOR,
    };
  }

  if (eventType === "expense.updated") {
    return {
      accentColor: ACCENT_COLOR,
      backgroundColor: BACKGROUND_COLOR,
    };
  }

  return {
    accentColor: WOMAN_DARK_COLOR,
    backgroundColor: WOMAN_LIGHT_COLOR,
  };
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
