"use client";

import { useSearchParams } from "next/navigation";
import { errorMessageForUser } from "./error-message";
import { ExpenseDashboard } from "./components/expense-dashboard";
import {
  hasLiffPrimaryRedirectParams,
  LiffPrimaryRedirectGate,
} from "../../lib/liff-primary-redirect-gate";
import { currentMonthInJst, normalizeMonthParam } from "./month";
import { ApiSessionBoundary } from "../../lib/api-session";
import { QueryBoundary } from "../../components/query-boundary";

export function HomeClient() {
  const searchParams = useSearchParams();
  const currentMonth = currentMonthInJst();
  const month = normalizeMonthParam(
    searchParams.get("month") ?? undefined,
    currentMonth,
  );
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const normalizedLiffId = liffId?.trim();
  const shouldGateLiffPrimaryRedirect =
    normalizedLiffId !== undefined &&
    normalizedLiffId !== "" &&
    hasLiffPrimaryRedirectParams(searchParams);

  if (shouldGateLiffPrimaryRedirect) {
    return <LiffPrimaryRedirectGate liffId={normalizedLiffId} />;
  }

  return (
    <ApiSessionBoundary>
      {(session) => (
        <QueryBoundary
          key={month}
          loading="支出明細を読み込んでいます"
          formatError={(error) =>
            `支出明細を取得できませんでした。${errorMessageForUser(error)}`
          }
        >
          <ExpenseDashboard
            {...session}
            month={month}
            currentMonth={currentMonth}
          />
        </QueryBoundary>
      )}
    </ApiSessionBoundary>
  );
}
