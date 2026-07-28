import type { Expense, MonthlySettlementSummary } from "@shared-expense/shared";
import {
  fetchMonthlyExpenses,
  fetchMonthlySettlement,
  sampleExpenses,
  sampleUsers,
  type FetchMonthlyExpensesInput,
} from "./api";
import { calculateMonthlySettlement } from "@shared-expense/shared";

export type MonthlyExpensesPageData = {
  expenses: Expense[];
  settlement: MonthlySettlementSummary;
  source: "api" | "sample";
  errorMessage?: string;
};

export async function loadMonthlyExpensesForPage(
  input: FetchMonthlyExpensesInput,
): Promise<MonthlyExpensesPageData> {
  if (input.apiBaseUrl === undefined || input.apiBaseUrl.trim() === "") {
    return {
      source: "sample",
      expenses: sampleExpenses,
      settlement: calculateMonthlySettlement(input.month, sampleUsers, sampleExpenses),
    };
  }

  try {
    const [expensesResult, settlementResult] = await Promise.all([
      fetchMonthlyExpenses(input),
      fetchMonthlySettlement(input),
    ]);

    return {
      source: expensesResult.source,
      expenses: expensesResult.expenses,
      settlement: settlementResult.settlement,
    };
  } catch {
    return {
      source: "api",
      expenses: [],
      settlement: calculateMonthlySettlement(input.month, sampleUsers, []),
      errorMessage: "APIから取得できません。APIの起動状態とSpreadsheet権限を確認してください",
    };
  }
}

export { sampleExpenses };
