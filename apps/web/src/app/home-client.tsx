"use client";

import { calculateMonthlySettlement } from "@shared-expense/shared";
import { useSearchParams } from "next/navigation";
import { ExpenseDashboard } from "../features/expenses/expense-dashboard";
import { currentMonthInJst, normalizeMonthParam } from "../features/expenses/month";
import { sampleExpenses, sampleUsers } from "../features/expenses/api";

export function HomeClient() {
  const searchParams = useSearchParams();
  const currentMonth = currentMonthInJst();
  const month = normalizeMonthParam(searchParams.get("month") ?? undefined, currentMonth);
  const selectedExpenseId = normalizeStringParam(
    searchParams.get("expenseId") ?? undefined,
  );
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const devIdToken = process.env.NEXT_PUBLIC_DEV_ID_TOKEN;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const shouldUseSampleData = apiBaseUrl === undefined || apiBaseUrl.trim() === "";
  const expenses = shouldUseSampleData ? sampleExpenses : [];

  return (
    <ExpenseDashboard
      apiBaseUrl={apiBaseUrl}
      errorMessage={undefined}
      expenses={expenses}
      idToken={devIdToken}
      liffId={liffId}
      month={month}
      currentMonth={currentMonth}
      selectedExpenseId={selectedExpenseId}
      settlement={calculateMonthlySettlement(month, sampleUsers, expenses)}
      source={shouldUseSampleData ? "sample" : "api"}
    />
  );
}

function normalizeStringParam(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return value;
}
