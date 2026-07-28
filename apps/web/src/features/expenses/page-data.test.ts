import { describe, expect, it } from "vitest";
import { loadMonthlyExpensesForPage } from "./page-data";

describe("loadMonthlyExpensesForPage", () => {
  it("keeps sample data only when no API base URL is configured", async () => {
    const result = await loadMonthlyExpensesForPage({
      month: "2026-07",
      apiBaseUrl: "",
    });

    expect(result.source).toBe("sample");
    expect(result.expenses.length).toBeGreaterThan(0);
    expect(result.settlement.month).toBe("2026-07");
  });

  it("loads expenses and settlement from the configured API", async () => {
    const urls: string[] = [];
    const result = await loadMonthlyExpensesForPage({
      month: "2026-07",
      apiBaseUrl: "http://localhost:8787",
      idToken: "id-token",
      fetcher: async (url) => {
        urls.push(String(url));

        if (String(url).includes("/api/settlements")) {
          return Response.json({
            month: "2026-07",
            householdTotal: 1000,
            userTotals: [
              { userId: "woman", displayName: "ひとみ", total: 1000 },
              { userId: "man", displayName: "げんき", total: 0 },
            ],
            difference: 1000,
            settlement: {
              fromUserId: "man",
              toUserId: "woman",
              amount: 500,
            },
          });
        }

        return Response.json({
          expenses: [
            {
              id: "exp_1",
              userId: "woman",
              date: "2026-07-01",
              price: 1000,
              category: "食費",
              memo: null,
              version: 1,
            },
          ],
        });
      },
    });

    expect(urls.sort()).toEqual([
      "http://localhost:8787/api/expenses?date=2026-07",
      "http://localhost:8787/api/settlements?month=2026-07",
    ]);
    expect(result).toMatchObject({
      source: "api",
      expenses: [{ id: "exp_1" }],
      settlement: {
        month: "2026-07",
        settlement: { amount: 500 },
      },
    });
  });

  it("does not fall back to sample data when the configured API fails", async () => {
    await expect(
      loadMonthlyExpensesForPage({
        month: "2026-07",
        apiBaseUrl: "http://localhost:8787",
        fetcher: async () => Response.json({ message: "Forbidden" }, { status: 403 }),
      }),
    ).resolves.toMatchObject({
      source: "api",
      expenses: [],
      settlement: {
        month: "2026-07",
        householdTotal: 0,
        settlement: { amount: 0 },
      },
      errorMessage: "APIから取得できません。APIの起動状態とSpreadsheet権限を確認してください",
    });
  });
});
