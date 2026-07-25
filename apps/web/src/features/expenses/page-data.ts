import type { Expense } from "@shared-expense/shared";
import {
  fetchMonthlyExpenses,
  sampleExpenses,
  type FetchMonthlyExpensesInput,
} from "./api";

export type MonthlyExpensesPageData = {
  expenses: Expense[];
  source: "api" | "sample";
  errorMessage?: string;
};

export async function loadMonthlyExpensesForPage(
  input: FetchMonthlyExpensesInput,
): Promise<MonthlyExpensesPageData> {
  try {
    return await fetchMonthlyExpenses(input);
  } catch {
    return {
      source: "api",
      expenses: [],
      errorMessage: "APIから取得できません。APIの起動状態とSpreadsheet権限を確認してください",
    };
  }
}

export { sampleExpenses };
