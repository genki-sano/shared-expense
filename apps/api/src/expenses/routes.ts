import type { User } from "@shared-expense/shared";
import { Hono } from "hono";
import type { ExpenseRepository } from "./repository";

export type ExpenseRoutesDependencies = {
  authenticateToken: (token: string) => Promise<User>;
  expenseRepository: ExpenseRepository;
};

export function createExpenseRoutes(dependencies: ExpenseRoutesDependencies): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const token = bearerToken(c.req.header("Authorization"));
    if (token === null) {
      return c.json({ message: "Unauthorized", details: {} }, 401);
    }

    let actor: User;
    try {
      actor = await dependencies.authenticateToken(token);
    } catch {
      return c.json({ message: "Unauthorized", details: {} }, 401);
    }

    const month = c.req.query("date");
    if (month === undefined || !/^\d{4}-\d{2}$/.test(month)) {
      return c.json(
        {
          message: "Invalid request",
          details: { field: "date", reason: "must be YYYY-MM" },
        },
        400,
      );
    }

    const expenses = await dependencies.expenseRepository.listByMonth({
      month,
      actor,
    });

    return c.json({ expenses });
  });

  return app;
}

function bearerToken(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }

  const match = /^Bearer (?<token>.+)$/.exec(authorizationHeader);
  return match?.groups?.token ?? null;
}
