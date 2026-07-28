import {
  FetchGoogleSheetsValuesClient,
  GoogleServiceAccountAccessTokenProvider,
  SpreadsheetExpenseRepository,
  type GoogleServiceAccountAccessTokenProviderInput,
  type ServiceAccountJwtSigner,
} from "@shared-expense/integrations";
import type { User } from "@shared-expense/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createLineIdTokenAuthenticator } from "./auth/line-id-token";
import { createExpenseRoutes } from "./expenses/routes";
import { InMemoryExpenseRepository, type ExpenseRepository } from "./expenses/repository";
import { createSettlementRoutes } from "./settlements/routes";
import {
  InMemoryHouseholdUserRepository,
  type HouseholdUserRepository,
} from "./users/repository";

export type AppDependencies = {
  authenticateToken: (token: string) => Promise<User>;
  expenseRepository: ExpenseRepository;
  userRepository: HouseholdUserRepository;
};

export type AppEnv = {
  GOOGLE_SPREADSHEET_ID?: string | undefined;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string | undefined;
  GOOGLE_PRIVATE_KEY?: string | undefined;
  LINE_LOGIN_CHANNEL_ID?: string | undefined;
};

export type AppEnvDependencies = {
  authenticateToken?: ((token: string) => Promise<User>) | undefined;
  fetcher?: typeof fetch;
  signServiceAccountJwt?: ServiceAccountJwtSigner;
};

const defaultDependencies: AppDependencies = {
  authenticateToken: async () => {
    throw new Error("Authentication is not configured");
  },
  expenseRepository: new InMemoryExpenseRepository([]),
  userRepository: new InMemoryHouseholdUserRepository(),
};

export function createApp(dependencies: AppDependencies = defaultDependencies): Hono {
  const app = new Hono();

  app.use(
    "/api/*",
    cors({
      origin: (origin) => {
        if (origin === "http://localhost:3000" || origin === "http://localhost:3001") {
          return origin;
        }

        return null;
      },
      allowHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/api/expenses", createExpenseRoutes(dependencies));
  app.route("/api/settlements", createSettlementRoutes(dependencies));

  return app;
}

export function createAppFromEnv(
  env: AppEnv,
  dependencies: AppEnvDependencies = defaultDependencies,
): Hono {
  const repositories = repositoriesFromEnv(env, dependencies);
  return createApp({
    authenticateToken:
      dependencies.authenticateToken ??
      authenticateTokenFromEnv(env, dependencies, repositories.userRepository),
    expenseRepository: repositories.expenseRepository,
    userRepository: repositories.userRepository,
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
  userRepository: HouseholdUserRepository;
} {
  if (
    env.GOOGLE_SPREADSHEET_ID === undefined ||
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL === undefined ||
    env.GOOGLE_PRIVATE_KEY === undefined
  ) {
    return {
      expenseRepository: new InMemoryExpenseRepository([]),
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
