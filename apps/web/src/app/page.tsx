import { calculateMonthlySettlement, type Expense } from "@shared-expense/shared";
import type { MonthlySettlementSummary } from "@shared-expense/shared";
import { ExpenseDashboard } from "../features/expenses/expense-dashboard";
import { currentMonthInJst, normalizeMonthParam } from "../features/expenses/month";
import { loadMonthlyExpensesForPage } from "../features/expenses/page-data";
import { sampleUsers } from "../features/expenses/api";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home(props: HomeProps) {
  const searchParams = await props.searchParams;
  const currentMonth = currentMonthInJst();
  const month = normalizeMonthParam(searchParams?.month, currentMonth);
  const { expenses, settlement, source, errorMessage } = await loadExpenses(month);
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
      currentMonth={currentMonth}
      settlement={settlement}
      source={source}
    />
  );
}

async function loadExpenses(month: string): Promise<{
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
