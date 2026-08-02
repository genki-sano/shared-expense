"use client";

import { calculateMonthlySettlement } from "@shared-expense/shared";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ExpenseDashboard } from "../features/expenses/expense-dashboard";
import { currentMonthInJst, normalizeMonthParam } from "../features/expenses/month";
import { sampleExpenses, sampleUsers } from "../features/expenses/api";

const LIFF_LAUNCH_GUARD_MS = 450;

export function HomeClient() {
  const searchParams = useSearchParams();
  const currentMonth = currentMonthInJst();
  const month = normalizeMonthParam(searchParams.get("month") ?? undefined, currentMonth);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const devIdToken =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_ID_TOKEN
      : undefined;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const shouldUseSampleData = apiBaseUrl === undefined || apiBaseUrl.trim() === "";
  const expenses = shouldUseSampleData ? sampleExpenses : [];
  const shouldDelayInitialList =
    process.env.NODE_ENV === "production" &&
    liffId !== undefined &&
    liffId.trim() !== "";
  const [isLiffLaunchGuardActive, setIsLiffLaunchGuardActive] = useState(
    shouldDelayInitialList,
  );

  useEffect(() => {
    if (!shouldDelayInitialList) {
      setIsLiffLaunchGuardActive(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsLiffLaunchGuardActive(false);
    }, LIFF_LAUNCH_GUARD_MS);

    return () => window.clearTimeout(timeoutId);
  }, [shouldDelayInitialList]);

  if (isLiffLaunchGuardActive) {
    return (
      <main className="shell">
        <div className="app">
          <p className="statusMessage" role="status">
            LINE認証を確認しています
          </p>
        </div>
      </main>
    );
  }

  return (
    <ExpenseDashboard
      apiBaseUrl={apiBaseUrl}
      errorMessage={undefined}
      expenses={expenses}
      idToken={devIdToken}
      liffId={liffId}
      month={month}
      currentMonth={currentMonth}
      settlement={calculateMonthlySettlement(month, sampleUsers, expenses)}
      source={shouldUseSampleData ? "sample" : "api"}
    />
  );
}
