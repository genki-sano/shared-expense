import { calculateMonthlySettlement, type Expense } from "@shared-expense/shared";
import type { MonthlySettlementSummary } from "@shared-expense/shared";
import { ExpenseDashboard } from "../features/expenses/expense-dashboard";
import { loadMonthlyExpensesForPage } from "../features/expenses/page-data";
import { sampleUsers } from "../features/expenses/api";

const month = "2026-07";

export default async function Home() {
  const { expenses, settlement, source, errorMessage } = await loadExpenses();
  const devIdToken = process.env.NEXT_PUBLIC_DEV_ID_TOKEN;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  return (
    <ExpenseDashboard
      apiBaseUrl={process.env.NEXT_PUBLIC_API_BASE_URL}
      errorMessage={errorMessage}
      expenses={expenses}
      idToken={devIdToken}
      liffId={liffId}
      month={month}
      settlement={settlement}
      source={source}
    />
  );
}

async function loadExpenses(): Promise<{
  expenses: Expense[];
  settlement: MonthlySettlementSummary;
  source: "api" | "sample";
  errorMessage?: string;
}> {
  const devIdToken = process.env.NEXT_PUBLIC_DEV_ID_TOKEN;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  if (
    (devIdToken === undefined || devIdToken.trim() === "") &&
    liffId !== undefined &&
    liffId.trim() !== ""
  ) {
    return {
      source: "api",
      expenses: [],
      settlement: calculateMonthlySettlement(month, sampleUsers, []),
    };
  }

  try {
    return await loadMonthlyExpensesForPage({
      month,
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
      idToken: devIdToken,
    });
  } catch {
    return {
      source: "api",
      expenses: [],
      settlement: calculateMonthlySettlement(month, sampleUsers, []),
      errorMessage: "支出明細を取得できません",
    };
  }
}
