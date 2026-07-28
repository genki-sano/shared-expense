import { calculateMonthlySettlement } from "@shared-expense/shared";
import type { User } from "@shared-expense/shared";
import { Hono } from "hono";
import type { ExpenseRepository } from "../expenses/repository";
import type { HouseholdUserRepository } from "../users/repository";

export type SettlementRoutesDependencies = {
  authenticateToken: (token: string) => Promise<User>;
  expenseRepository: ExpenseRepository;
  userRepository: HouseholdUserRepository;
};

export function createSettlementRoutes(dependencies: SettlementRoutesDependencies): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const actor = await authenticateRequest(c.req.header("Authorization"), dependencies);
    if (actor === null) {
      return c.json({ message: "Unauthorized", details: {} }, 401);
    }

    const month = c.req.query("month");
    if (month === undefined || !/^\d{4}-\d{2}$/.test(month)) {
      return c.json(
        {
          message: "Invalid request",
          details: { field: "month", reason: "must be YYYY-MM" },
        },
        400,
      );
    }

    const [users, expenses] = await Promise.all([
      dependencies.userRepository.listHouseholdUsers(),
      dependencies.expenseRepository.listByMonth({ month, actor }),
    ]);

    return c.json(calculateMonthlySettlement(month, users, expenses));
  });

  return app;
}

async function authenticateRequest(
  authorizationHeader: string | undefined,
  dependencies: SettlementRoutesDependencies,
): Promise<User | null> {
  const token = bearerToken(authorizationHeader);
  if (token === null) {
    return null;
  }

  try {
    return await dependencies.authenticateToken(token);
  } catch {
    return null;
  }
}

function bearerToken(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }

  const match = /^Bearer (?<token>.+)$/.exec(authorizationHeader);
  return match?.groups?.token ?? null;
}
