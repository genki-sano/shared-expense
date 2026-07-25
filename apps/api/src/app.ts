import {
  FetchGoogleSheetsValuesClient,
  SpreadsheetExpenseRepository,
} from "@shared-expense/integrations";
import type { User } from "@shared-expense/shared";
import { Hono } from "hono";
import { createExpenseRoutes } from "./expenses/routes";
import { InMemoryExpenseRepository, type ExpenseRepository } from "./expenses/repository";

export type AppDependencies = {
  authenticateToken: (token: string) => Promise<User>;
  expenseRepository: ExpenseRepository;
};

export type AppEnv = {
  GOOGLE_SPREADSHEET_ID?: string | undefined;
  GOOGLE_ACCESS_TOKEN?: string | undefined;
};

export type AppEnvDependencies = {
  authenticateToken: (token: string) => Promise<User>;
  fetcher?: typeof fetch;
};

const defaultDependencies: AppDependencies = {
  authenticateToken: async () => {
    throw new Error("Authentication is not configured");
  },
  expenseRepository: new InMemoryExpenseRepository([]),
};

export function createApp(dependencies: AppDependencies = defaultDependencies): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/api/expenses", createExpenseRoutes(dependencies));

  return app;
}

export function createAppFromEnv(
  env: AppEnv,
  dependencies: AppEnvDependencies = defaultDependencies,
): Hono {
  return createApp({
    authenticateToken: dependencies.authenticateToken,
    expenseRepository: expenseRepositoryFromEnv(env, dependencies),
  });
}

function expenseRepositoryFromEnv(
  env: AppEnv,
  dependencies: AppEnvDependencies,
): ExpenseRepository {
  if (env.GOOGLE_SPREADSHEET_ID === undefined || env.GOOGLE_ACCESS_TOKEN === undefined) {
    return new InMemoryExpenseRepository([]);
  }

  return new SpreadsheetExpenseRepository({
    spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
    valuesClient: new FetchGoogleSheetsValuesClient(
      dependencies.fetcher === undefined
        ? { accessToken: env.GOOGLE_ACCESS_TOKEN }
        : {
            accessToken: env.GOOGLE_ACCESS_TOKEN,
            fetcher: dependencies.fetcher,
          },
    ),
    userTypeToUserId,
  });
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
