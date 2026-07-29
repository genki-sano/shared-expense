import { describe, expect, it } from "vitest";
import {
  createExpense,
  deleteExpense,
  ExpenseApiError,
  fetchMonthlyExpenses,
  fetchMonthlySettlement,
  restoreExpense,
  updateExpense,
} from "./api";

describe("fetchMonthlyExpenses", () => {
  it("returns sample expenses when no API base URL is configured", async () => {
    const result = await fetchMonthlyExpenses({
      month: "2026-07",
      apiBaseUrl: undefined,
    });

    expect(result.expenses.length).toBeGreaterThan(0);
    expect(result.source).toBe("sample");
  });

  it("fetches monthly expenses from the configured API with the LINE ID token", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const result = await fetchMonthlyExpenses({
      month: "2026-07",
      apiBaseUrl: "https://api.example.test",
      idToken: "id-token",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json({
          expenses: [
            {
              id: "exp_1",
              userId: "user_a",
              userName: "ひとみ",
              date: "2026-07-18",
              price: 6420,
              category: "食費",
              memo: "スーパー",
              version: 1,
            },
          ],
        });
      },
    });

    expect(calls).toEqual([
      {
        url: "https://api.example.test/api/expenses?date=2026-07",
        init: {
          headers: {
            Authorization: "Bearer id-token",
          },
        },
      },
    ]);
    expect(result).toEqual({
      source: "api",
      expenses: [
        {
          id: "exp_1",
          userId: "user_a",
          userName: "ひとみ",
          date: "2026-07-18",
          price: 6420,
          category: "食費",
          memo: "スーパー",
          version: 1,
        },
      ],
    });
  });

  it("throws when the configured API returns an error", async () => {
    await expect(
      fetchMonthlyExpenses({
        month: "2026-07",
        apiBaseUrl: "https://api.example.test",
        fetcher: async () =>
          Response.json(
            {
              message: "認証情報の有効期限が切れているか、正しくありません",
              details: {
                code: "AUTH_INVALID",
                action: "LINEから開き直して、もう一度お試しください",
              },
            },
            { status: 401 },
          ),
      }),
    ).rejects.toMatchObject({
      message:
        'Failed to fetch expenses: 401 {"message":"認証情報の有効期限が切れているか、正しくありません","details":{"code":"AUTH_INVALID","action":"LINEから開き直して、もう一度お試しください"}}',
      operation: "fetch expenses",
      status: 401,
      responseBody:
        '{"message":"認証情報の有効期限が切れているか、正しくありません","details":{"code":"AUTH_INVALID","action":"LINEから開き直して、もう一度お試しください"}}',
    });
  });
});

describe("fetchMonthlySettlement", () => {
  it("returns a sample settlement when no API base URL is configured", async () => {
    const result = await fetchMonthlySettlement({
      month: "2026-07",
      apiBaseUrl: undefined,
    });

    expect(result.source).toBe("sample");
    expect(result.settlement.month).toBe("2026-07");
    expect(result.settlement.settlement.amount).toBeGreaterThan(0);
  });

  it("fetches monthly settlement from the configured API with the LINE ID token", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const result = await fetchMonthlySettlement({
      month: "2026-07",
      apiBaseUrl: "https://api.example.test",
      idToken: "id-token",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json({
          month: "2026-07",
          householdTotal: 10000,
          userTotals: [
            { userId: "woman", displayName: "ひとみ", total: 3000 },
            { userId: "man", displayName: "げんき", total: 7000 },
          ],
          difference: 4000,
          settlement: {
            fromUserId: "woman",
            toUserId: "man",
            amount: 2000,
          },
        });
      },
    });

    expect(calls).toEqual([
      {
        url: "https://api.example.test/api/settlements?month=2026-07",
        init: {
          headers: {
            Authorization: "Bearer id-token",
          },
        },
      },
    ]);
    expect(result).toEqual({
      source: "api",
      settlement: {
        month: "2026-07",
        householdTotal: 10000,
        userTotals: [
          { userId: "woman", displayName: "ひとみ", total: 3000 },
          { userId: "man", displayName: "げんき", total: 7000 },
        ],
        difference: 4000,
        settlement: {
          fromUserId: "woman",
          toUserId: "man",
          amount: 2000,
        },
      },
    });
  });

  it("throws when the configured settlement API returns an error", async () => {
    await expect(
      fetchMonthlySettlement({
        month: "2026-07",
        apiBaseUrl: "https://api.example.test",
        fetcher: async () =>
          Response.json(
            {
              message: "認証情報の有効期限が切れているか、正しくありません",
              details: {
                code: "AUTH_INVALID",
                action: "LINEから開き直して、もう一度お試しください",
              },
            },
            { status: 401 },
          ),
      }),
    ).rejects.toMatchObject({
      message:
        'Failed to fetch settlement: 401 {"message":"認証情報の有効期限が切れているか、正しくありません","details":{"code":"AUTH_INVALID","action":"LINEから開き直して、もう一度お試しください"}}',
      operation: "fetch settlement",
      status: 401,
      responseBody:
        '{"message":"認証情報の有効期限が切れているか、正しくありません","details":{"code":"AUTH_INVALID","action":"LINEから開き直して、もう一度お試しください"}}',
    });
  });
});

describe("expense mutations", () => {
  it("creates an expense with authorization and idempotency headers", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const result = await createExpense({
      apiBaseUrl: "https://api.example.test",
      idToken: "id-token",
      idempotencyKey: "create-key",
      expense: {
        date: "2026-07-27",
        price: 1200,
        category: "食費",
        memo: "ランチ",
      },
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json(
          {
            id: "exp_created",
            userId: "woman",
            userName: "ひとみ",
            date: "2026-07-27",
            price: 1200,
            category: "食費",
            memo: "ランチ",
            version: 1,
          },
          { status: 201 },
        );
      },
    });

    expect(calls).toEqual([
      {
        url: "https://api.example.test/api/expenses",
        init: {
          method: "POST",
          headers: {
            Authorization: "Bearer id-token",
            "Content-Type": "application/json",
            "Idempotency-Key": "create-key",
          },
          body: JSON.stringify({
            date: "2026-07-27",
            price: 1200,
            category: "食費",
            memo: "ランチ",
          }),
        },
      },
    ]);
    expect(result.id).toBe("exp_created");
  });

  it("updates an expense with versioned payload", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    await updateExpense({
      apiBaseUrl: "https://api.example.test",
      idToken: "id-token",
      idempotencyKey: "update-key",
      id: "exp_1",
      expense: {
        version: 1,
        date: "2026-07-28",
        price: 3400,
        category: "日用品",
        memo: null,
      },
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json({
          id: "exp_1",
          userId: "man",
          date: "2026-07-28",
          price: 3400,
          category: "日用品",
          memo: null,
          version: 1,
        });
      },
    });

    expect(calls).toEqual([
      {
        url: "https://api.example.test/api/expenses/exp_1",
        init: {
          method: "PUT",
          headers: {
            Authorization: "Bearer id-token",
            "Content-Type": "application/json",
            "Idempotency-Key": "update-key",
          },
          body: JSON.stringify({
            version: 1,
            date: "2026-07-28",
            price: 3400,
            category: "日用品",
            memo: null,
          }),
        },
      },
    ]);
  });

  it("deletes an expense with an idempotency key", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    await deleteExpense({
      apiBaseUrl: "https://api.example.test",
      idToken: "id-token",
      idempotencyKey: "delete-key",
      id: "exp_1",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return new Response(null, { status: 204 });
      },
    });

    expect(calls).toEqual([
      {
        url: "https://api.example.test/api/expenses/exp_1",
        init: {
          method: "DELETE",
          headers: {
            Authorization: "Bearer id-token",
            "Idempotency-Key": "delete-key",
          },
        },
      },
    ]);
  });

  it("restores an expense with an idempotency key", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const result = await restoreExpense({
      apiBaseUrl: "https://api.example.test",
      idToken: "id-token",
      idempotencyKey: "restore-key",
      id: "exp_1",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json({
          id: "exp_1",
          userId: "man",
          date: "2026-07-28",
          price: 3400,
          category: "日用品",
          memo: null,
          version: 1,
        });
      },
    });

    expect(calls).toEqual([
      {
        url: "https://api.example.test/api/expenses/exp_1/restore",
        init: {
          method: "POST",
          headers: {
            Authorization: "Bearer id-token",
            "Idempotency-Key": "restore-key",
          },
        },
      },
    ]);
    expect(result.id).toBe("exp_1");
  });

  it("throws a detailed API error when mutation API returns JSON error body", async () => {
    await expect(
      deleteExpense({
        apiBaseUrl: "https://api.example.test",
        idToken: "id-token",
        idempotencyKey: "delete-key",
        id: "exp_1",
        fetcher: async () =>
          Response.json({ message: "Expense not found" }, { status: 404 }),
      }),
    ).rejects.toMatchObject({
      message: 'Failed to delete expense: 404 {"message":"Expense not found"}',
      operation: "delete expense",
      status: 404,
      responseBody: '{"message":"Expense not found"}',
    });
  });

  it("marks mutation failures with ExpenseApiError for UI logging", async () => {
    await expect(
      createExpense({
        apiBaseUrl: "https://api.example.test",
        idToken: "id-token",
        idempotencyKey: "create-key",
        expense: {
          date: "2026-07-27",
          price: 1200,
          category: "食費",
          memo: "ランチ",
        },
        fetcher: async () =>
          Response.json(
            { message: "Invalid request", details: { field: "date" } },
            { status: 400 },
          ),
      }),
    ).rejects.toBeInstanceOf(ExpenseApiError);
  });
});
