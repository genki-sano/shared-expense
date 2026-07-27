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
});
