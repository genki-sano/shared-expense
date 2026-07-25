import type { Expense } from "@shared-expense/shared";

export type MonthlyExpensesSource = "api" | "sample";

export type MonthlyExpensesResult = {
  source: MonthlyExpensesSource;
  expenses: Expense[];
};

export type FetchMonthlyExpensesInput = {
  month: string;
  apiBaseUrl: string | undefined;
  idToken?: string | undefined;
  fetcher?: typeof fetch;
};

export const sampleExpenses: Expense[] = [
  {
    id: "sample_1",
    userId: "Genki",
    date: "2026-07-18",
    price: 6420,
    category: "食費",
    memo: "スーパー",
    version: 1,
  },
  {
    id: "sample_2",
    userId: "Partner",
    date: "2026-07-12",
    price: 11840,
    category: "光熱費",
    memo: "電気代",
    version: 1,
  },
  {
    id: "sample_3",
    userId: "Genki",
    date: "2026-07-06",
    price: 3280,
    category: "生活用品",
    memo: "日用品",
    version: 1,
  },
];

export async function fetchMonthlyExpenses(
  input: FetchMonthlyExpensesInput,
): Promise<MonthlyExpensesResult> {
  if (input.apiBaseUrl === undefined || input.apiBaseUrl.trim() === "") {
    return { source: "sample", expenses: sampleExpenses };
  }

  const fetcher = input.fetcher ?? fetch;
  const url = new URL("/api/expenses", input.apiBaseUrl);
  url.searchParams.set("date", input.month);

  const response = await fetcher(url.toString(), {
    headers:
      input.idToken === undefined || input.idToken === ""
        ? {}
        : { Authorization: `Bearer ${input.idToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch expenses: ${response.status}`);
  }

  const body = (await response.json()) as { expenses: Expense[] };
  return { source: "api", expenses: body.expenses };
}
