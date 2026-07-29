import {
  FetchGoogleSheetsValuesClient,
  FetchLineMessagingClient,
  GoogleServiceAccountAccessTokenProvider,
  SpreadsheetExpenseRepository,
  type GoogleServiceAccountAccessTokenProviderInput,
  type ServiceAccountJwtSigner,
} from "@shared-expense/integrations";
import type { User } from "@shared-expense/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { AuthenticationError } from "./core/auth/authentication-error";
import { createLineIdTokenAuthenticator } from "./core/auth/line-id-token";
import { createExpenseRoutes } from "./expenses/routes";
import { InMemoryExpenseRepository, type ExpenseRepository } from "./expenses/repository";
import {
  createExpenseMutationNotifier,
  noopExpenseMutationNotifier,
  type ExpenseMutationNotifier,
} from "./core/notifications/expense-mutation-notifier";
import type { MonthlySettlementExpenseReader } from "./settlements/repository";
import { createSettlementRoutes } from "./settlements/routes";
import {
  InMemoryHouseholdUserRepository,
  type HouseholdUserRepository,
} from "./core/users/repository";

export type AppDependencies = {
  authenticateToken: (token: string) => Promise<User>;
  allowedOrigins?: string[];
  expenseRepository: ExpenseRepository;
  expenseMutationNotifier?: ExpenseMutationNotifier;
  monthlyExpenseReader: MonthlySettlementExpenseReader;
  userRepository: HouseholdUserRepository;
};

export type AppEnv = {
  API_ALLOWED_ORIGINS?: string | undefined;
  GOOGLE_SPREADSHEET_ID?: string | undefined;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string | undefined;
  GOOGLE_PRIVATE_KEY?: string | undefined;
  LINE_LOGIN_CHANNEL_ID?: string | undefined;
  LINE_MESSAGING_CHANNEL_ACCESS_TOKEN?: string | undefined;
  LINE_NOTIFICATION_DETAIL_BASE_URL?: string | undefined;
};

export type AppEnvDependencies = {
  authenticateToken?: ((token: string) => Promise<User>) | undefined;
  fetcher?: typeof fetch;
  signServiceAccountJwt?: ServiceAccountJwtSigner;
};

const defaultExpenseRepository = new InMemoryExpenseRepository([]);

const defaultDependencies: AppDependencies = {
  authenticateToken: async () => {
    throw new AuthenticationError("unavailable", "Authentication is not configured");
  },
  expenseRepository: defaultExpenseRepository,
  expenseMutationNotifier: noopExpenseMutationNotifier,
  monthlyExpenseReader: defaultExpenseRepository,
  userRepository: new InMemoryHouseholdUserRepository(),
};

export function createApp(dependencies: AppDependencies = defaultDependencies): Hono {
  const app = new Hono();
  const allowedOrigins = dependencies.allowedOrigins ?? [
    "http://localhost:3000",
    "http://localhost:3001",
  ];

  app.use(
    "/api/*",
    cors({
      origin: (origin) => {
        if (allowedOrigins.includes(origin)) {
          return origin;
        }

        return null;
      },
      allowHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));
  app.route(
    "/api/expenses",
    createExpenseRoutes({
      authenticateToken: dependencies.authenticateToken,
      expenseRepository: dependencies.expenseRepository,
      ...(dependencies.expenseMutationNotifier === undefined
        ? {}
        : { expenseMutationNotifier: dependencies.expenseMutationNotifier }),
    }),
  );
  app.route(
    "/api/settlements",
    createSettlementRoutes({
      authenticateToken: dependencies.authenticateToken,
      monthlyExpenseReader: dependencies.monthlyExpenseReader,
      userRepository: dependencies.userRepository,
    }),
  );

  return app;
}

export function createAppFromEnv(
  env: AppEnv,
  dependencies: AppEnvDependencies = defaultDependencies,
): Hono {
  const repositories = repositoriesFromEnv(env, dependencies);
  const allowedOrigins = allowedOriginsFromEnv(env);
  return createApp({
    ...(allowedOrigins === undefined ? {} : { allowedOrigins }),
    authenticateToken:
      dependencies.authenticateToken ??
      authenticateTokenFromEnv(env, dependencies, repositories.userRepository),
    expenseRepository: repositories.expenseRepository,
    expenseMutationNotifier: expenseMutationNotifierFromEnv(
      env,
      dependencies,
      repositories.userRepository,
    ),
    monthlyExpenseReader: repositories.monthlyExpenseReader,
    userRepository: repositories.userRepository,
  });
}

function allowedOriginsFromEnv(env: AppEnv): string[] | undefined {
  if (env.API_ALLOWED_ORIGINS === undefined || env.API_ALLOWED_ORIGINS.trim() === "") {
    return undefined;
  }

  return env.API_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");
}

function expenseMutationNotifierFromEnv(
  env: AppEnv,
  dependencies: AppEnvDependencies,
  userRepository: HouseholdUserRepository,
): ExpenseMutationNotifier {
  if (
    env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN === undefined ||
    env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN.trim() === ""
  ) {
    return noopExpenseMutationNotifier;
  }

  return createExpenseMutationNotifier({
    userRepository,
    lineMessagingClient: new FetchLineMessagingClient({
      channelAccessToken: env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
      ...(dependencies.fetcher === undefined ? {} : { fetcher: dependencies.fetcher }),
    }),
    ...(env.LINE_NOTIFICATION_DETAIL_BASE_URL === undefined ||
    env.LINE_NOTIFICATION_DETAIL_BASE_URL.trim() === ""
      ? {}
      : { detailBaseUrl: env.LINE_NOTIFICATION_DETAIL_BASE_URL }),
  });
}

function authenticateTokenFromEnv(
  env: AppEnv,
  dependencies: AppEnvDependencies,
  userRepository: HouseholdUserRepository,
): (token: string) => Promise<User> {
  if (env.LINE_LOGIN_CHANNEL_ID === undefined || env.LINE_LOGIN_CHANNEL_ID.trim() === "") {
    return defaultDependencies.authenticateToken;
  }

  return createLineIdTokenAuthenticator({
    channelId: env.LINE_LOGIN_CHANNEL_ID,
    userRepository,
    ...(dependencies.fetcher === undefined ? {} : { fetcher: dependencies.fetcher }),
  });
}

function repositoriesFromEnv(
  env: AppEnv,
  dependencies: AppEnvDependencies,
): {
  expenseRepository: ExpenseRepository;
  monthlyExpenseReader: MonthlySettlementExpenseReader;
  userRepository: HouseholdUserRepository;
} {
  if (
    env.GOOGLE_SPREADSHEET_ID === undefined ||
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL === undefined ||
    env.GOOGLE_PRIVATE_KEY === undefined
  ) {
    const inMemoryExpenseRepository = new InMemoryExpenseRepository([]);
    return {
      expenseRepository: inMemoryExpenseRepository,
      monthlyExpenseReader: inMemoryExpenseRepository,
      userRepository: new InMemoryHouseholdUserRepository(),
    };
  }
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

  const spreadsheetRepository = new SpreadsheetExpenseRepository({
    spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
    valuesClient: new FetchGoogleSheetsValuesClient({
      accessTokenProvider: new GoogleServiceAccountAccessTokenProvider(tokenProviderInput),
      ...(dependencies.fetcher === undefined ? {} : { fetcher: dependencies.fetcher }),
    }),
    userTypeToUserId,
    userIdToUserType,
  });

  return {
    expenseRepository: spreadsheetRepository,
    monthlyExpenseReader: spreadsheetRepository,
    userRepository: spreadsheetRepository,
  };
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
