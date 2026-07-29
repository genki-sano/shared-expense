import type { Expense, User } from "@shared-expense/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { InMemoryExpenseRepository, type ExpenseRepository } from "./expenses/repository";
import { InMemoryHouseholdUserRepository } from "./core/users/repository";

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
  const expenseRepository = new InMemoryExpenseRepository(expenses);
  return createApp({
    authenticateToken: async (token) => {
      if (token !== "valid") {
        throw new Error("invalid token");
      }

      return user;
    },
    expenseRepository,
    monthlyExpenseReader: expenseRepository,
    userRepository: new InMemoryHouseholdUserRepository([
      user,
      { ...user, id: "user_b", lineUserId: "line_b", displayName: "B" },
    ]),
  });
}

describe("CORS", () => {
  it("allows local web preflight requests for expense mutations", async () => {
    const response = await app().request("/api/expenses", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers":
          "authorization,content-type,idempotency-key",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Idempotency-Key",
    );
  });

  it("does not allow arbitrary origins", async () => {
    const response = await app().request("/api/expenses", {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example.test",
        "Access-Control-Request-Method": "POST",
      },
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("GET /api/expenses", () => {
  it("requires a bearer token", async () => {
    const response = await app().request("/api/expenses?date=2026-07");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "ログイン状態を確認できませんでした",
      details: {
        code: "AUTH_REQUIRED",
        action: "LINEから開き直して、もう一度お試しください",
      },
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

describe("Expense mutations", () => {
  it("creates an expense for the authenticated actor", async () => {
    const response = await app().request("/api/expenses", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
        "Idempotency-Key": "create-1",
      },
      body: JSON.stringify({
        date: "2026-07-26",
        price: 1200,
        category: "食費",
        memo: "昼食",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: expect.any(String),
      userId: "user_a",
      date: "2026-07-26",
      price: 1200,
      category: "食費",
      memo: "昼食",
      version: 1,
    });
  });

  it("returns structured details when creating an expense fails in the repository", async () => {
    const failingRepository: ExpenseRepository = {
      listByMonth: async () => [],
      create: async () => {
        throw new Error("Failed to append Google Sheets values: 403");
      },
      update: async () => {
        throw new Error("unused");
      },
      delete: async () => {
        throw new Error("unused");
      },
      restore: async () => {
        throw new Error("unused");
      },
    };
    const response = await createApp({
      authenticateToken: async () => user,
      expenseRepository: failingRepository,
      monthlyExpenseReader: failingRepository,
      userRepository: new InMemoryHouseholdUserRepository([
        user,
        { ...user, id: "user_b", lineUserId: "line_b", displayName: "B" },
      ]),
    }).request("/api/expenses", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
        "Idempotency-Key": "create-failure-1",
      },
      body: JSON.stringify({
        date: "2026-07-26",
        price: 1200,
        category: "食費",
        memo: "昼食",
      }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Expense create failed",
      details: {
        reason: "Failed to append Google Sheets values: 403",
      },
    });
  });

  it("requires Idempotency-Key for mutations", async () => {
    const response = await app().request("/api/expenses", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: "2026-07-26",
        price: 1200,
        category: "食費",
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid request",
      details: { field: "Idempotency-Key", reason: "is required" },
    });
  });

  it("updates an existing expense", async () => {
    const response = await app().request("/api/expenses/exp_earlier", {
      method: "PUT",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
        "Idempotency-Key": "update-1",
      },
      body: JSON.stringify({
        price: 3600,
        memo: null,
        version: 2,
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "exp_earlier",
      userId: "user_a",
      date: "2026-07-06",
      price: 3600,
      category: "生活用品",
      memo: null,
      version: 2,
    });
  });

  it("notifies the partner after creating, updating, and deleting expenses", async () => {
    const notified: unknown[] = [];
    const expenseRepository = new InMemoryExpenseRepository(expenses);
    const notificationApp = createApp({
      authenticateToken: async () => user,
      expenseRepository,
      monthlyExpenseReader: expenseRepository,
      userRepository: new InMemoryHouseholdUserRepository([
        user,
        { ...user, id: "user_b", lineUserId: "line_b", displayName: "B" },
      ]),
      expenseMutationNotifier: {
        notify: async (input) => {
          notified.push(input);
        },
      },
    });

    const createResponse = await notificationApp.request("/api/expenses", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
        "Idempotency-Key": "notify-create-1",
      },
      body: JSON.stringify({
        date: "2026-07-26",
        price: 1200,
        category: "食費",
        memo: "昼食",
      }),
    });
    const created = (await createResponse.json()) as Expense;

    const updateResponse = await notificationApp.request(`/api/expenses/${created.id}`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
        "Idempotency-Key": "notify-update-1",
      },
      body: JSON.stringify({
        price: 1300,
        version: created.version,
      }),
    });
    const updated = (await updateResponse.json()) as Expense;

    const deleteResponse = await notificationApp.request(`/api/expenses/${created.id}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer valid",
        "Idempotency-Key": "notify-delete-1",
      },
    });

    expect(createResponse.status).toBe(201);
    expect(updateResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(204);
    expect(notified).toMatchObject([
      { eventType: "expense.created", actor: user, expense: created },
      { eventType: "expense.updated", actor: user, expense: updated },
      { eventType: "expense.deleted", actor: user, expense: updated },
    ]);
  });

  it("keeps mutation responses successful when partner notification fails", async () => {
    const expenseRepository = new InMemoryExpenseRepository(expenses);
    const notificationApp = createApp({
      authenticateToken: async () => user,
      expenseRepository,
      monthlyExpenseReader: expenseRepository,
      userRepository: new InMemoryHouseholdUserRepository([
        user,
        { ...user, id: "user_b", lineUserId: "line_b", displayName: "B" },
      ]),
      expenseMutationNotifier: {
        notify: async () => {
          throw new Error("LINE failed");
        },
      },
    });

    const response = await notificationApp.request("/api/expenses", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
        "Idempotency-Key": "notify-failure-1",
      },
      body: JSON.stringify({
        date: "2026-07-26",
        price: 1200,
        category: "食費",
        memo: "昼食",
      }),
    });

    expect(response.status).toBe(201);
  });

  it("returns 409 when update version does not match", async () => {
    const response = await app().request("/api/expenses/exp_earlier", {
      method: "PUT",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
        "Idempotency-Key": "update-conflict-1",
      },
      body: JSON.stringify({
        price: 3600,
        version: 1,
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "Expense version conflict",
      details: {
        id: "exp_earlier",
        expectedVersion: 1,
        actualVersion: 2,
      },
    });
  });

  it("deletes an existing expense", async () => {
    const response = await app().request("/api/expenses/exp_earlier", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer valid",
        "Idempotency-Key": "delete-1",
      },
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("returns 404 when deleting an unknown expense", async () => {
    const response = await app().request("/api/expenses/missing", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer valid",
        "Idempotency-Key": "delete-missing-1",
      },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Expense not found",
      details: { id: "missing" },
    });
  });

  it("restores a deleted expense", async () => {
    const restoreApp = app();
    const deleteResponse = await restoreApp.request("/api/expenses/exp_earlier", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer valid",
        "Idempotency-Key": "delete-before-restore-1",
      },
    });
    expect(deleteResponse.status).toBe(204);

    const response = await restoreApp.request("/api/expenses/exp_earlier/restore", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Idempotency-Key": "restore-1",
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "exp_earlier",
      userId: "user_a",
      date: "2026-07-06",
      price: 3280,
      category: "生活用品",
      memo: "",
      version: 2,
    });
  });

  it("returns 404 when restoring an active or unknown expense", async () => {
    const response = await app().request("/api/expenses/exp_earlier/restore", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Idempotency-Key": "restore-active-1",
      },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Expense not found",
      details: { id: "exp_earlier" },
    });
  });
});

describe("GET /api/settlements", () => {
  it("requires a bearer token", async () => {
    const response = await app().request("/api/settlements?month=2026-07");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "ログイン状態を確認できませんでした",
      details: {
        code: "AUTH_REQUIRED",
        action: "LINEから開き直して、もう一度お試しください",
      },
    });
  });

  it("rejects an invalid month query", async () => {
    const response = await app().request("/api/settlements?month=2026-7", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid request",
      details: {
        field: "month",
        reason: "must be YYYY-MM",
      },
    });
  });

  it("returns the monthly settlement summary from repository expenses", async () => {
    const response = await app().request("/api/settlements?month=2026-07", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      month: "2026-07",
      householdTotal: 9700,
      userTotals: [
        { userId: "user_a", displayName: "A", total: 3280 },
        { userId: "user_b", displayName: "B", total: 6420 },
      ],
      difference: 3140,
      settlement: {
        fromUserId: "user_a",
        toUserId: "user_b",
        amount: 1570,
      },
    });
  });
});
