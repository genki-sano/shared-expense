import { describe, expect, it } from "vitest";
import { loadMonthlyExpensesForPage } from "./page-data";

describe("loadMonthlyExpensesForPage", () => {
  it("keeps sample data only when no API base URL is configured", async () => {
    await expect(
      loadMonthlyExpensesForPage({
        month: "2026-07",
        apiBaseUrl: "",
      }),
    ).resolves.toMatchObject({
      source: "sample",
    });
  });

  it("does not fall back to sample data when the configured API fails", async () => {
    await expect(
      loadMonthlyExpensesForPage({
        month: "2026-07",
        apiBaseUrl: "http://localhost:8787",
        fetcher: async () => Response.json({ message: "Forbidden" }, { status: 403 }),
      }),
    ).resolves.toEqual({
      source: "api",
      expenses: [],
      errorMessage: "APIから取得できません。APIの起動状態とSpreadsheet権限を確認してください",
    });
  });
});
