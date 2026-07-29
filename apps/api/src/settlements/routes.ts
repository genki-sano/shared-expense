import { calculateMonthlySettlement } from "@shared-expense/shared";
import type { User } from "@shared-expense/shared";
import { Hono } from "hono";
import { authenticateRequest } from "../core/auth/request-auth";
import type { HouseholdUserRepository } from "../core/users/repository";
import type { MonthlySettlementExpenseReader } from "./repository";

export type SettlementRoutesDependencies = {
  authenticateToken: (token: string) => Promise<User>;
  monthlyExpenseReader: MonthlySettlementExpenseReader;
  userRepository: HouseholdUserRepository;
};

export function createSettlementRoutes(dependencies: SettlementRoutesDependencies): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const auth = await authenticateRequest(
      c.req.header("Authorization"),
      dependencies.authenticateToken,
    );
    if (!auth.ok) {
      return c.json(auth.body, auth.status);
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
      dependencies.monthlyExpenseReader.listByMonth({ month, actor: auth.actor }),
    ]);

    return c.json(calculateMonthlySettlement(month, users, expenses));
  });

  return app;
}
