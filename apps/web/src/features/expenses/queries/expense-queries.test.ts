import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateMonthlySettlement } from "@shared-expense/shared";
import { sampleUsers } from "../api";
import {
  createExpense,
  deleteExpense,
  restoreExpense,
  updateExpense,
} from "../api";
import {
  expenseMutationOptions,
  expenseQuery,
  monthlyExpensesQuery,
} from "./expense-queries";

const expense = {
  id: "expense-1",
  userId: "woman",
  date: "2026-09-10",
  price: 1000,
  category: "その他",
  memo: null,
  version: 1,
};
const session = {
  apiBaseUrl: "https://api.example.com",
  idToken: "verified-token",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("expense server state", () => {
  it("loads list, settlement and details with bearer auth and query cancellation signal", async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer verified-token",
      });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      if (url.includes("/api/settlements"))
        return Response.json({
          month: "2026-09",
          userTotals: [],
          settlement: { amount: 0 },
        });
      if (url.includes("/api/expenses/expense-1"))
        return Response.json({ expense, deleted: false });
      return Response.json({ expenses: [expense] });
    });
    vi.stubGlobal("fetch", fetcher);
    const client = new QueryClient();
    try {
      expect(
        (await client.fetchQuery(monthlyExpensesQuery(session, "2026-09")))
          .expenses,
      ).toEqual([expense]);
      expect(
        await client.fetchQuery(expenseQuery(session, expense.id)),
      ).toEqual({ expense, deleted: false });
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(fetcher.mock.calls.map(([url]) => url)).toContain(
        "https://api.example.com/api/expenses?date=2026-09",
      );
    } finally {
      client.clear();
    }
  });

  it.each(["create", "update", "delete", "restore"] as const)(
    "%s invalidates list/settlement and details across months without touching other features",
    async (operation) => {
      vi.stubEnv("NEXT_PUBLIC_LIFF_ID", "");
      const fetcher = vi.fn(async () =>
        operation === "delete"
          ? new Response(null, { status: 204 })
          : Response.json(expense),
      );
      vi.stubGlobal("fetch", fetcher);
      const client = new QueryClient();
      const month = monthlyExpensesQuery(session, "2026-09");
      const otherMonth = monthlyExpensesQuery(session, "2026-08");
      const detail = expenseQuery(session, expense.id);
      client.setQueryData(month.queryKey, {
        expenses: [],
        settlement: calculateMonthlySettlement("2026-09", sampleUsers, []),
        source: "api",
      });
      client.setQueryData(otherMonth.queryKey, {
        expenses: [],
        settlement: calculateMonthlySettlement("2026-09", sampleUsers, []),
        source: "api",
      });
      client.setQueryData(detail.queryKey, { expense, deleted: false });
      client.setQueryData(["other-feature"], "keep");
      const input = {
        ...session,
        id: expense.id,
        expense,
        idempotencyKey: `test-${operation}`,
      };
      const operationFn = {
        create: createExpense,
        update: updateExpense,
        delete: deleteExpense,
        restore: restoreExpense,
      }[operation];
      try {
        const mutation = client.getMutationCache().build(
          client,
          expenseMutationOptions(client, async (variables: typeof input) =>
            operationFn(variables),
          ),
        );
        await mutation.execute(input);
        for (const options of [month, otherMonth, detail])
          expect(client.getQueryState(options.queryKey)?.isInvalidated).toBe(
            true,
          );
        expect(client.getQueryState(["other-feature"])?.isInvalidated).toBe(
          false,
        );
        expect(fetcher).toHaveBeenCalledTimes(1);
      } finally {
        client.clear();
      }
    },
  );

  it("does not invalidate cached data when creation fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_LIFF_ID", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("failure", { status: 500 })),
    );
    const client = new QueryClient();
    const month = monthlyExpensesQuery(session, "2026-09");
    client.setQueryData(month.queryKey, {
      expenses: [],
      settlement: calculateMonthlySettlement("2026-09", sampleUsers, []),
      source: "api",
    });
    try {
      const mutation = client
        .getMutationCache()
        .build(client, expenseMutationOptions(client, createExpense));
      await expect(
        mutation.execute({
          ...session,
          expense,
          idempotencyKey: "test-failure",
        }),
      ).rejects.toThrow("500");
      expect(client.getQueryState(month.queryKey)?.isInvalidated).toBe(false);
    } finally {
      client.clear();
    }
  });
});
