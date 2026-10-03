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
import { useMemo, useState, useTransition } from "react";
import {
  createExpense,
  deleteExpense,
  restoreExpense,
  updateExpense,
  type CreateExpensePayload,
  type UpdateExpensePayload,
} from "../api";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  monthlyExpensesQuery,
  expenseMutationOptions,
} from "../queries/expense-queries";
import { errorMessageForUser } from "../error-message";
import { addMonths, formatMonthLabel } from "../month";

import { ExpenseForm, defaultDraftForMonth } from "./expense-form";

type ExpenseDashboardProps = {
  month: string;
  apiBaseUrl: string | undefined;
  idToken: string | undefined;
  currentMonth: string;
};

type ExpenseFormDraft = { date: string; price: string; memo: string };

const numberFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function ExpenseDashboard(props: ExpenseDashboardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data,
    error: readError,
    refetch,
  } = useSuspenseQuery(monthlyExpensesQuery(props, props.month));
  const expenses = sortExpenses(data.expenses);
  const idToken = props.idToken;
  const settlementSummary = data.settlement;
  const displayMonth = props.month;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createMutation = useMutation(
    expenseMutationOptions(queryClient, createExpense),
  );
  const updateMutation = useMutation(
    expenseMutationOptions(queryClient, updateExpense),
  );
  const deleteMutation = useMutation(
    expenseMutationOptions(queryClient, deleteExpense),
  );
  const restoreMutation = useMutation(
    expenseMutationOptions(queryClient, restoreExpense),
  );
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [restorableExpense, setRestorableExpense] = useState<Expense | null>(
    null,
  );
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    restoreMutation.isPending;
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
  const isMutationEnabled =
    props.apiBaseUrl !== undefined &&
    props.apiBaseUrl.trim() !== "" &&
    idToken !== undefined &&
    idToken.trim() !== "";
  const isMonthLoading = isMonthPending;
  const canMutate = isMutationEnabled && !isMonthLoading;

  function navigateToMonth(nextMonth: string): void {
    if (nextMonth === displayMonth) {
      return;
    }

    setIsCreateOpen(false);
    setEditingExpenseId(null);
    setRestorableExpense(null);
    startMonthTransition(() => {
      router.push(`/expenses?month=${nextMonth}`);
    });
  }

  async function handleCreate(payload: CreateExpensePayload): Promise<void> {
    setStatusMessage(null);
    setRestorableExpense(null);
    try {
      const currentIdToken = props.idToken;
      await createMutation.mutateAsync({
        apiBaseUrl: props.apiBaseUrl,
        idToken: currentIdToken,
        idempotencyKey: createIdempotencyKey("expense-create"),
        expense: payload,
      });
      setIsCreateOpen(false);
      setStatusMessage("支出を追加しました");
    } catch (error) {
      logExpenseMutationError("create", error);
      setStatusMessage(
        `支出を追加できませんでした。${errorMessageForUser(error)}`,
      );
    }
  }

  async function handleUpdate(
    expense: Expense,
    payload: UpdateExpensePayload,
  ): Promise<void> {
    setStatusMessage(null);
    setRestorableExpense(null);
    try {
      const currentIdToken = props.idToken;
      await updateMutation.mutateAsync({
        apiBaseUrl: props.apiBaseUrl,
        idToken: currentIdToken,
        idempotencyKey: createIdempotencyKey(`expense-update-${expense.id}`),
        id: expense.id,
        expense: payload,
      });
      setEditingExpenseId(null);
      setStatusMessage("支出を更新しました");
    } catch (error) {
      logExpenseMutationError("update", error);
      setStatusMessage(
        `支出を更新できませんでした。${errorMessageForUser(error)} 再読み込みしてからやり直してください`,
      );
    }
  }

  async function handleDelete(expense: Expense): Promise<void> {
    if (!window.confirm("この支出を削除しますか？")) {
      return;
    }

    setStatusMessage(null);
    try {
      const currentIdToken = props.idToken;
      await deleteMutation.mutateAsync({
        apiBaseUrl: props.apiBaseUrl,
        idToken: currentIdToken,
        idempotencyKey: createIdempotencyKey(`expense-delete-${expense.id}`),
        id: expense.id,
      });
      setEditingExpenseId(null);
      setRestorableExpense(expense);
      setStatusMessage("支出を削除しました");
    } catch (error) {
      logExpenseMutationError("delete", error);
      setStatusMessage(
        `支出を削除できませんでした。${errorMessageForUser(error)}`,
      );
    }
  }

  async function handleRestore(expense: Expense): Promise<void> {
    try {
      const currentIdToken = props.idToken;
      await restoreMutation.mutateAsync({
        apiBaseUrl: props.apiBaseUrl,
        idToken: currentIdToken,
        idempotencyKey: createIdempotencyKey(`expense-restore-${expense.id}`),
        id: expense.id,
      });
      setRestorableExpense(null);
      setStatusMessage("支出を復元しました");
    } catch (error) {
      logExpenseMutationError("restore", error);
      setStatusMessage(
        `支出を復元できませんでした。${errorMessageForUser(error)}`,
      );
    }
  }

  return (
    <main className="shell">
      <div className="app">
        <header className="topbar">
          <div>
            <p className="month">{formatMonthLabel(displayMonth)}</p>
            <h1 className="title">月次支出</h1>
          </div>
          <button
            className="addButton"
            type="button"
            aria-label="支出を追加"
            aria-expanded={isCreateOpen}
            disabled={!canMutate}
            onClick={() => {
              setIsCreateOpen((current) => !current);
              setEditingExpenseId(null);
            }}
          >
            +
          </button>
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
            action="/"
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

        {isCreateOpen ? (
          <ExpenseForm
            defaultDraft={defaultDraftForMonth(displayMonth)}
            disabled={isSubmitting}
            submitLabel="追加"
            onCancel={() => setIsCreateOpen(false)}
            onSubmit={(payload) => handleCreate(payload)}
          />
        ) : null}

        <div className="toolbar">
          <h2 className="sectionTitle">明細</h2>
          {data.source === "sample" ? (
            <span className="sourceBadge">Sample</span>
          ) : null}
        </div>

        {statusMessage === null ? null : (
          <p className="statusMessage" role="status">
            {statusMessage}
            {statusMessage === "支出を削除しました" &&
            restorableExpense !== null ? (
              <button
                className="statusLink"
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleRestore(restorableExpense)}
              >
                元に戻す
              </button>
            ) : null}
          </p>
        )}
        {isMutationEnabled ? null : (
          <p className="errorMessage">
            APIまたは認証が未設定のため、追加・編集・削除はできません
          </p>
        )}

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
              <button
                className="expenseTapTarget"
                type="button"
                aria-label={`支出を編集: ${expense.memo ?? expense.category}`}
                aria-expanded={editingExpenseId === expense.id}
                disabled={!canMutate || isSubmitting}
                onClick={() => {
                  setEditingExpenseId((current) =>
                    current === expense.id ? null : expense.id,
                  );
                  setIsCreateOpen(false);
                }}
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
              </button>
              {editingExpenseId === expense.id ? (
                <ExpenseForm
                  defaultDraft={draftFromExpense(expense)}
                  deleteLabel="削除"
                  disabled={isSubmitting}
                  submitLabel="保存"
                  onCancel={() => setEditingExpenseId(null)}
                  onDelete={() => handleDelete(expense)}
                  onSubmit={(payload) =>
                    handleUpdate(expense, {
                      ...payload,
                      version: expense.version,
                    })
                  }
                />
              ) : null}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function draftFromExpense(expense: Expense): ExpenseFormDraft {
  return {
    date: expense.date,
    price: String(expense.price),
    memo: expense.memo ?? "",
  };
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

function createIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
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

function logExpenseMutationError(
  operation:
    "authenticate" | "load" | "create" | "update" | "delete" | "restore",
  error: unknown,
): void {
  console.error(`Expense ${operation} failed`, error);
}
