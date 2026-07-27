import type { Expense } from "@shared-expense/shared";
import { ExpenseDashboard } from "../features/expenses/expense-dashboard";
import { loadMonthlyExpensesForPage } from "../features/expenses/page-data";

const month = "2026-07";

export default async function Home() {
  const { expenses, source, errorMessage } = await loadExpenses();

  return (
    <ExpenseDashboard
      apiBaseUrl={process.env.NEXT_PUBLIC_API_BASE_URL}
      errorMessage={errorMessage}
      expenses={expenses}
      idToken={process.env.NEXT_PUBLIC_DEV_LIFF_ID_TOKEN}
      month={month}
      source={source}
    />
  );
}

async function loadExpenses(): Promise<{
  expenses: Expense[];
  source: "api" | "sample";
  errorMessage?: string;
}> {
  try {
    return await loadMonthlyExpensesForPage({
      month,
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
      idToken: process.env.NEXT_PUBLIC_DEV_LIFF_ID_TOKEN,
    });
  } catch {
    return { source: "api", expenses: [], errorMessage: "支出明細を取得できません" };
  }
}
