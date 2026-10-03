"use client";

import {
  calculateMonthlySettlement,
  type Expense,
} from "@shared-expense/shared";
import type {
  HouseholdUsers,
  MonthlySettlementSummary,
} from "@shared-expense/shared";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { monthlyExpensesQuery } from "../queries/expense-queries";
import { errorMessageForUser } from "../error-message";
import { addMonths, formatMonthLabel } from "../month";

type ExpenseDashboardProps = {
  month: string;
  apiBaseUrl: string | undefined;
  idToken: string | undefined;
  currentMonth: string;
};

const numberFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function ExpenseDashboard(props: ExpenseDashboardProps) {
  const router = useRouter();
  const {
    data,
    error: readError,
    refetch,
  } = useSuspenseQuery(monthlyExpensesQuery(props, props.month));
  const expenses = sortExpenses(data.expenses);
  const settlementSummary = data.settlement;
  const displayMonth = props.month;
  const [isMonthPending, startMonthTransition] = useTransition();

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.price, 0),
    [expenses],
  );
  const settlementUsers = useMemo(
    () => usersFromSettlement(settlementSummary),
    [settlementSummary],
  );
  const settlement = useMemo(
    () => calculateMonthlySettlement(displayMonth, settlementUsers, expenses),
    [displayMonth, expenses, settlementUsers],
  );
  const isMonthLoading = isMonthPending;

  function navigateToMonth(nextMonth: string): void {
    if (nextMonth === displayMonth) {
      return;
    }

    startMonthTransition(() => {
      router.push(`/expenses?month=${nextMonth}`);
    });
  }

  return (
    <main className="shell">
      <div className="app">
        <header className="topbar">
          <div>
            <p className="month">{formatMonthLabel(displayMonth)}</p>
            <h1 className="title">月次支出</h1>
          </div>
          <Link
            className="addButton"
            aria-label="支出を追加"
            href={`/expenses/new?month=${displayMonth}`}
          >
            +
          </Link>
        </header>

        <div
          className="monthControls"
          data-loading={isMonthLoading ? "true" : undefined}
        >
          <button
            className="monthButton"
            type="button"
            aria-label="前月を表示"
            disabled={isMonthLoading}
            onClick={() => navigateToMonth(addMonths(displayMonth, -1))}
          >
            ‹
          </button>
          <form
            className="monthPicker"
            action="/expenses"
            onSubmit={(event) => event.preventDefault()}
          >
            <input
              className="monthInput"
              type="month"
              name="month"
              value={displayMonth}
              aria-label="表示月"
              disabled={isMonthLoading}
              onChange={(event) => navigateToMonth(event.currentTarget.value)}
            />
          </form>
          <button
            className="monthButton monthToday"
            type="button"
            disabled={isMonthLoading || displayMonth === props.currentMonth}
            onClick={() => navigateToMonth(props.currentMonth)}
          >
            今月
          </button>
          <button
            className="monthButton"
            type="button"
            aria-label="翌月を表示"
            disabled={isMonthLoading}
            onClick={() => navigateToMonth(addMonths(displayMonth, 1))}
          >
            ›
          </button>
        </div>

        <section
          className="summaryPanel"
          aria-label="月次サマリ"
          data-loading={isMonthLoading ? "true" : undefined}
        >
          <div>
            <p className="summaryLabel">精算予定</p>
            <p className="settlementAmount">
              {numberFormatter.format(settlement.settlement.amount)}
            </p>
          </div>
          <div className="summaryDetails" aria-label="合計と件数">
            <span>{settlementDirectionLabel(settlement, settlementUsers)}</span>
            <span>合計 {numberFormatter.format(total)}</span>
            <span>{expenses.length}件</span>
          </div>
        </section>

        {isMonthLoading ? (
          <p className="monthLoading" role="status">
            {formatMonthLabel(displayMonth)}を読み込んでいます
          </p>
        ) : null}

        <div className="toolbar">
          <h2 className="sectionTitle">明細</h2>
          {data.source === "sample" ? (
            <span className="sourceBadge">Sample</span>
          ) : null}
        </div>

        {readError ? (
          <p className="errorMessage" role="status">
            支出明細を取得できませんでした。{errorMessageForUser(readError)}
            <button
              className="statusLink"
              type="button"
              onClick={() => void refetch()}
            >
              再試行
            </button>
          </p>
        ) : null}

        <section className="list" aria-label="支出明細">
          {expenses.map((expense) => (
            <article
              className={`expense ${payerClassName(expense.userId)}`}
              key={expense.id}
            >
              <Link
                className="expenseTapTarget"
                aria-label={`支出詳細: ${expense.memo ?? expense.category}`}
                href={`/expenses/detail?id=${encodeURIComponent(expense.id)}`}
              >
                <span className="dateBadge">
                  {formatMonthDay(expense.date)}
                </span>
                <span className="expenseBody">
                  <span className="expenseName">
                    {expense.memo ?? expense.category}
                  </span>
                  <span className="expenseMeta">
                    <span
                      className={`payerPill ${payerClassName(expense.userId)}`}
                    >
                      {expense.userName ?? expense.userId}
                    </span>
                  </span>
                </span>
                <span className="amount">
                  {numberFormatter.format(expense.price)}
                </span>
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date));
}

function usersFromSettlement(
  settlement: MonthlySettlementSummary,
): HouseholdUsers {
  const [first, second] = settlement.userTotals;

  return [
    {
      id: first?.userId ?? "user_a",
      lineUserId: first?.userId ?? "user_a",
      displayName: first?.displayName ?? "A",
      notifyEnabled: true,
    },
    {
      id: second?.userId ?? "user_b",
      lineUserId: second?.userId ?? "user_b",
      displayName: second?.displayName ?? "B",
      notifyEnabled: true,
    },
  ];
}

function settlementDirectionLabel(
  settlement: MonthlySettlementSummary,
  users: HouseholdUsers,
): string {
  if (settlement.settlement.amount === 0) {
    return "精算なし";
  }

  const fromUser = users.find(
    (user) => user.id === settlement.settlement.fromUserId,
  );
  const toUser = users.find(
    (user) => user.id === settlement.settlement.toUserId,
  );

  return `${fromUser?.displayName ?? "支払う人"} → ${toUser?.displayName ?? "受け取る人"}`;
}

function formatMonthDay(date: string): string {
  return date.slice(5).replace("-", "/");
}

function payerClassName(
  userId: string,
): "payerWoman" | "payerMan" | "payerUnknown" {
  if (userId === "woman") {
    return "payerWoman";
  }

  if (userId === "man") {
    return "payerMan";
  }

  return "payerUnknown";
}
