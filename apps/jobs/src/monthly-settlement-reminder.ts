import {
  FetchGoogleSheetsValuesClient,
  FetchLineMessagingClient,
  GoogleServiceAccountAccessTokenProvider,
  SpreadsheetExpenseRepository,
  type GoogleServiceAccountAccessTokenProviderInput,
  type LineFlexBox,
  type LineFlexMessage,
  type LineMessagingClient,
  type ServiceAccountJwtSigner,
} from "@shared-expense/integrations";
import {
  calculateMonthlySettlement,
  type Expense,
  type HouseholdUsers,
  type MonthlySettlementSummary,
  type User,
} from "@shared-expense/shared";

export type JobsEnv = {
  GOOGLE_SPREADSHEET_ID?: string | undefined;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string | undefined;
  GOOGLE_PRIVATE_KEY?: string | undefined;
  LINE_LOGIN_CHANNEL_ID?: string | undefined;
  LINE_LIFF_ID?: string | undefined;
  LINE_MESSAGING_CHANNEL_ACCESS_TOKEN?: string | undefined;
  LINE_NOTIFICATION_DETAIL_BASE_URL?: string | undefined;
};

export type MonthlySettlementReminderDependencies = {
  fetcher?: typeof fetch;
  lineMessagingClient?: LineMessagingClient;
  signServiceAccountJwt?: ServiceAccountJwtSigner;
};

export type MonthlySettlementReminderResult = {
  targetMonth: string;
  notifiedUserIds: string[];
};

type MonthlySettlementReminderRepository = {
  listHouseholdUsers(): Promise<HouseholdUsers>;
  listByMonth(input: { month: string; actor: User }): Promise<Expense[]>;
};

const JAPAN_TIME_ZONE = "Asia/Tokyo";

export async function runMonthlySettlementReminder(input: {
  env: JobsEnv;
  now?: Date;
  dependencies?: MonthlySettlementReminderDependencies;
}): Promise<MonthlySettlementReminderResult> {
  const now = input.now ?? new Date();
  const dependencies = input.dependencies ?? {};
  const targetMonth = previousMonthInJst(now);
  const repository = repositoryFromEnv(input.env, dependencies);
  const users = await repository.listHouseholdUsers();
  const actor = users[0];
  const expenses = await repository.listByMonth({ month: targetMonth, actor });
  const settlement = calculateMonthlySettlement(targetMonth, users, expenses);
  const lineMessagingClient = lineMessagingClientFromEnv(input.env, dependencies);
  const notifiedUserIds: string[] = [];

  for (const user of users) {
    if (!user.notifyEnabled) {
      continue;
    }

    await lineMessagingClient.pushMessage({
      to: user.lineUserId,
      messages: [
        monthlySettlementReminderFlexMessage({
          settlement,
          users,
          detailBaseUrl: detailBaseUrlFromEnv(input.env),
        }),
      ],
    });
    notifiedUserIds.push(user.id);
  }

  return { targetMonth, notifiedUserIds };
}

function detailBaseUrlFromEnv(
  env: Pick<JobsEnv, "LINE_LIFF_ID" | "LINE_NOTIFICATION_DETAIL_BASE_URL">,
): string | undefined {
  const liffId = env.LINE_LIFF_ID?.trim();
  if (liffId !== undefined && liffId !== "") {
    return `https://liff.line.me/${liffId}`;
  }

  const legacyDetailBaseUrl = env.LINE_NOTIFICATION_DETAIL_BASE_URL?.trim();
  return legacyDetailBaseUrl === "" ? undefined : legacyDetailBaseUrl;
}

export function previousMonthInJst(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAPAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error("Failed to resolve current month in JST");
  }

  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  return `${previousYear}-${String(previousMonth).padStart(2, "0")}`;
}

export function monthlySettlementReminderFlexMessage(input: {
  settlement: MonthlySettlementSummary;
  users: HouseholdUsers;
  detailBaseUrl?: string | undefined;
}): LineFlexMessage {
  const payer = userById(input.users, input.settlement.settlement.fromUserId);
  const receiver = userById(input.users, input.settlement.settlement.toUserId);
  const amount = input.settlement.settlement.amount;
  const detailUrl = detailUrlForMonth(input.detailBaseUrl, input.settlement.month);

  return {
    type: "flex",
    altText: `先月の精算をしてね！ ${input.settlement.month} ${formatYen(amount)}`,
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
            text: "先月分の精算",
            size: "sm",
            color: "#176B87",
            weight: "bold",
          },
          {
            type: "text",
            text: input.settlement.month,
            size: "xl",
            color: "#17211F",
            weight: "bold",
          },
          {
            type: "text",
            text: amount === 0 ? "精算はありません" : `${formatYen(amount)} を精算`,
            size: "xxl",
            color: "#176B87",
            weight: "bold",
            wrap: true,
          },
          {
            type: "separator",
            margin: "md",
          },
          labelValueBox("FROM", payer?.displayName ?? "-"),
          labelValueBox("TO", receiver?.displayName ?? "-"),
          ...input.settlement.userTotals.map((userTotal) =>
            labelValueBox(userTotal.displayName, formatYen(userTotal.total)),
          ),
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
                  color: "#176B87",
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
          backgroundColor: "#F6F7F4",
        },
        footer: {
          backgroundColor: "#F6F7F4",
        },
      },
    },
  };
}

function repositoryFromEnv(
  env: JobsEnv,
  dependencies: MonthlySettlementReminderDependencies,
): MonthlySettlementReminderRepository {
  assertConfigured(env.GOOGLE_SPREADSHEET_ID, "GOOGLE_SPREADSHEET_ID");
  assertConfigured(env.GOOGLE_SERVICE_ACCOUNT_EMAIL, "GOOGLE_SERVICE_ACCOUNT_EMAIL");
  assertConfigured(env.GOOGLE_PRIVATE_KEY, "GOOGLE_PRIVATE_KEY");

  const tokenProviderInput: GoogleServiceAccountAccessTokenProviderInput = {
    clientEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GOOGLE_PRIVATE_KEY,
  };
  if (dependencies.fetcher !== undefined) {
    tokenProviderInput.fetcher = dependencies.fetcher;
  }
  if (dependencies.signServiceAccountJwt !== undefined) {
    tokenProviderInput.signJwt = dependencies.signServiceAccountJwt;
  }

  return new SpreadsheetExpenseRepository({
    spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
    valuesClient: new FetchGoogleSheetsValuesClient({
      accessTokenProvider: new GoogleServiceAccountAccessTokenProvider(tokenProviderInput),
      ...(dependencies.fetcher === undefined ? {} : { fetcher: dependencies.fetcher }),
    }),
    userTypeToUserId,
    userIdToUserType,
  });
}

function lineMessagingClientFromEnv(
  env: JobsEnv,
  dependencies: MonthlySettlementReminderDependencies,
): LineMessagingClient {
  if (dependencies.lineMessagingClient !== undefined) {
    return dependencies.lineMessagingClient;
  }

  assertConfigured(
    env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
    "LINE_MESSAGING_CHANNEL_ACCESS_TOKEN",
  );
  return new FetchLineMessagingClient({
    channelAccessToken: env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
    ...(dependencies.fetcher === undefined ? {} : { fetcher: dependencies.fetcher }),
  });
}

function assertConfigured(value: string | undefined, name: string): asserts value is string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is not configured`);
  }
}

function userTypeToUserId(userType: string): string | null {
  if (userType === "1") {
    return "woman";
  }

  if (userType === "2") {
    return "man";
  }

  return null;
}

function userIdToUserType(userId: string): string | null {
  if (userId === "woman") {
    return "1";
  }

  if (userId === "man") {
    return "2";
  }

  return null;
}

function userById(users: HouseholdUsers, userId: string | null): User | null {
  if (userId === null) {
    return null;
  }

  return users.find((user) => user.id === userId) ?? null;
}

function detailUrlForMonth(baseUrl: string | undefined, month: string): string | null {
  if (baseUrl === undefined || baseUrl.trim() === "") {
    return null;
  }

  const url = new URL(baseUrl);
  url.searchParams.set("month", month);
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

function formatYen(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}
