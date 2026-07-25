import { describe, expect, it } from "vitest";
import { fetchMonthlyExpenses } from "./api";

describe("fetchMonthlyExpenses", () => {
  it("returns sample expenses when no API base URL is configured", async () => {
    const result = await fetchMonthlyExpenses({
      month: "2026-07",
      apiBaseUrl: undefined,
    });

    expect(result.expenses.length).toBeGreaterThan(0);
    expect(result.source).toBe("sample");
  });

  it("fetches monthly expenses from the configured API with the LIFF token", async () => {
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
          Response.json({ message: "Unauthorized", details: {} }, { status: 401 }),
      }),
    ).rejects.toThrow("Failed to fetch expenses: 401");
  });
});
