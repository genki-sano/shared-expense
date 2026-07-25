import { Hono } from "hono";
import { createExpenseRoutes } from "./expenses/routes";
import { InMemoryExpenseRepository, type ExpenseRepository } from "./expenses/repository";
import type { User } from "@shared-expense/shared";

export type AppDependencies = {
  authenticateToken: (token: string) => Promise<User>;
  expenseRepository: ExpenseRepository;
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
