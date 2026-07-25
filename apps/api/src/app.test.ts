import type { Expense, User } from "@shared-expense/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { InMemoryExpenseRepository } from "./expenses/repository";

const user: User = {
  id: "user_a",
  lineUserId: "line_a",
  displayName: "A",
  notifyEnabled: true,
};

const expenses: Expense[] = [
  {
    id: "exp_old",
    userId: "user_a",
    date: "2026-06-30",
    price: 900,
    category: "食費",
    memo: null,
    version: 1,
  },
  {
    id: "exp_later",
    userId: "user_b",
    date: "2026-07-18",
    price: 6420,
    category: "食費",
    memo: "スーパー",
    version: 1,
  },
  {
    id: "exp_earlier",
    userId: "user_a",
    date: "2026-07-06",
    price: 3280,
    category: "生活用品",
    memo: "",
    version: 2,
  },
];

function app() {
  return createApp({
    authenticateToken: async (token) => {
      if (token !== "valid") {
        throw new Error("invalid token");
      }

      return user;
    },
    expenseRepository: new InMemoryExpenseRepository(expenses),
  });
}

describe("GET /api/expenses", () => {
  it("requires a bearer token", async () => {
    const response = await app().request("/api/expenses?date=2026-07");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Unauthorized",
      details: {},
    });
  });

  it("rejects an invalid month query", async () => {
    const response = await app().request("/api/expenses?date=2026-7", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid request",
      details: {
        field: "date",
        reason: "must be YYYY-MM",
      },
    });
  });

  it("returns expenses in the requested month ordered by newest date first", async () => {
    const response = await app().request("/api/expenses?date=2026-07", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expenses: [
        {
          id: "exp_later",
          userId: "user_b",
          date: "2026-07-18",
          price: 6420,
          category: "食費",
          memo: "スーパー",
          version: 1,
        },
        {
          id: "exp_earlier",
          userId: "user_a",
          date: "2026-07-06",
          price: 3280,
          category: "生活用品",
          memo: "",
          version: 2,
        },
      ],
    });
  });
});
