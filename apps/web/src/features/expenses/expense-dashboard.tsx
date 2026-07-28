"use client";

import { calculateMonthlySettlement, type Expense } from "@shared-expense/shared";
import type { HouseholdUsers, MonthlySettlementSummary } from "@shared-expense/shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createExpense,
  deleteExpense,
  ExpenseApiError,
  fetchMonthlyExpenses,
  fetchMonthlySettlement,
  restoreExpense,
  updateExpense,
  type CreateExpensePayload,
  type UpdateExpensePayload,
} from "./api";
import { getLiffIdToken } from "./liff-client";
import { addMonths, formatMonthLabel } from "./month";

type ExpenseDashboardProps = {
  expenses: Expense[];
  source: "api" | "sample";
  month: string;
  apiBaseUrl: string | undefined;
  idToken: string | undefined;
  liffId: string | undefined;
  settlement: MonthlySettlementSummary;
  currentMonth: string;
  selectedExpenseId: string | undefined;
  errorMessage: string | undefined;
};

type ExpenseFormDraft = {
  date: string;
  price: string;
  memo: string;
};

const DEFAULT_EXPENSE_CATEGORY = "その他";

const numberFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function ExpenseDashboard(props: ExpenseDashboardProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(() => sortExpenses(props.expenses));
  const [idToken, setIdToken] = useState<string | undefined>(props.idToken);
  const [settlementSummary, setSettlementSummary] = useState(props.settlement);
  const [displayMonth, setDisplayMonth] = useState(props.month);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [restorableExpense, setRestorableExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isMonthPending, startMonthTransition] = useTransition();
  const expenseElementsRef = useRef(new Map<string, HTMLElement>());

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
  const isMonthLoading = isMonthPending || displayMonth !== props.month;
  const canMutate = isMutationEnabled && !isMonthLoading;

  useEffect(() => {
    const selectedExpenseExists = props.expenses.some(
      (expense) => expense.id === props.selectedExpenseId,
    );

    setDisplayMonth(props.month);
    setExpenses(sortExpenses(props.expenses));
    setSettlementSummary(props.settlement);
    setIsCreateOpen(false);
    setEditingExpenseId(selectedExpenseExists ? props.selectedExpenseId ?? null : null);
    setRestorableExpense(null);
  }, [props.expenses, props.month, props.selectedExpenseId, props.settlement]);

  useEffect(() => {
    const apiBaseUrl = props.apiBaseUrl;
    const liffId = props.liffId;
    if (
      props.idToken !== undefined ||
      apiBaseUrl === undefined ||
      apiBaseUrl.trim() === "" ||
      liffId === undefined ||
      liffId.trim() === ""
    ) {
      return;
    }

    const normalizedApiBaseUrl = apiBaseUrl;
    const normalizedLiffId = liffId;
    let isCancelled = false;

    async function initializeLiff(): Promise<void> {
      setIsAuthenticating(true);
      setStatusMessage("LINE認証を確認しています");
      try {
        const token = await getLiffIdToken({
          liffId: normalizedLiffId,
          redirectUri: window.location.href,
        });
        if (isCancelled || token === null) {
          return;
        }

        const [expensesResult, settlementResult] = await Promise.all([
          fetchMonthlyExpenses({
            month: props.month,
            apiBaseUrl: normalizedApiBaseUrl,
            idToken: token,
          }),
          fetchMonthlySettlement({
            month: props.month,
            apiBaseUrl: normalizedApiBaseUrl,
            idToken: token,
          }),
        ]);

        if (isCancelled) {
          return;
        }

        setIdToken(token);
        setExpenses(sortExpenses(expensesResult.expenses));
        setSettlementSummary(settlementResult.settlement);
        setStatusMessage(null);
      } catch (error) {
        logExpenseMutationError("authenticate", error);
        if (!isCancelled) {
          setStatusMessage(`LINE認証に失敗しました。${errorMessageForUser(error)}`);
        }
      } finally {
        if (!isCancelled) {
          setIsAuthenticating(false);
        }
      }
    }

    void initializeLiff();

    return () => {
      isCancelled = true;
    };
  }, [props.apiBaseUrl, props.idToken, props.liffId, props.month]);

  useEffect(() => {
    if (
      props.selectedExpenseId === undefined ||
      editingExpenseId !== props.selectedExpenseId
    ) {
      return;
    }

    const selectedElement = expenseElementsRef.current.get(props.selectedExpenseId);
    if (selectedElement === undefined) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      selectedElement.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [editingExpenseId, expenses, props.selectedExpenseId]);

  function navigateToMonth(nextMonth: string): void {
    if (nextMonth === displayMonth) {
      return;
    }

    setDisplayMonth(nextMonth);
    setIsCreateOpen(false);
    setEditingExpenseId(null);
    setRestorableExpense(null);
    startMonthTransition(() => {
      router.push(`/?month=${nextMonth}`);
    });
  }

  async function handleCreate(payload: CreateExpensePayload): Promise<void> {
    setIsSubmitting(true);
    setStatusMessage(null);
    setRestorableExpense(null);
    try {
      const created = await createExpense({
        apiBaseUrl: props.apiBaseUrl,
        idToken,
        idempotencyKey: createIdempotencyKey("expense-create"),
        expense: payload,
      });
      setExpenses((current) => sortExpenses([created, ...current]));
      setIsCreateOpen(false);
      setStatusMessage("支出を追加しました");
    } catch (error) {
      logExpenseMutationError("create", error);
      setStatusMessage(`支出を追加できませんでした。${errorMessageForUser(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(
    expense: Expense,
    payload: UpdateExpensePayload,
  ): Promise<void> {
    setIsSubmitting(true);
    setStatusMessage(null);
    setRestorableExpense(null);
    try {
      const updated = await updateExpense({
        apiBaseUrl: props.apiBaseUrl,
        idToken,
        idempotencyKey: createIdempotencyKey(`expense-update-${expense.id}`),
        id: expense.id,
        expense: payload,
      });
      setExpenses((current) =>
        sortExpenses(current.map((item) => (item.id === updated.id ? updated : item))),
      );
      setEditingExpenseId(null);
      setStatusMessage("支出を更新しました");
    } catch (error) {
      logExpenseMutationError("update", error);
      setStatusMessage(
        `支出を更新できませんでした。${errorMessageForUser(error)} 再読み込みしてからやり直してください`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(expense: Expense): Promise<void> {
    if (!window.confirm("この支出を削除しますか？")) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await deleteExpense({
        apiBaseUrl: props.apiBaseUrl,
        idToken,
        idempotencyKey: createIdempotencyKey(`expense-delete-${expense.id}`),
        id: expense.id,
      });
      setExpenses((current) => current.filter((item) => item.id !== expense.id));
      setEditingExpenseId(null);
      setRestorableExpense(expense);
      setStatusMessage("支出を削除しました");
    } catch (error) {
      logExpenseMutationError("delete", error);
      setStatusMessage(`支出を削除できませんでした。${errorMessageForUser(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRestore(expense: Expense): Promise<void> {
    setIsSubmitting(true);
    try {
      const restored = await restoreExpense({
        apiBaseUrl: props.apiBaseUrl,
        idToken,
        idempotencyKey: createIdempotencyKey(`expense-restore-${expense.id}`),
        id: expense.id,
      });
      setExpenses((current) => sortExpenses([restored, ...current]));
      setRestorableExpense(null);
      setStatusMessage("支出を復元しました");
    } catch (error) {
      logExpenseMutationError("restore", error);
      setStatusMessage(`支出を復元できませんでした。${errorMessageForUser(error)}`);
    } finally {
      setIsSubmitting(false);
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
          {props.source === "sample" ? <span className="sourceBadge">Sample</span> : null}
        </div>

        {props.errorMessage === undefined ? null : (
          <p className="errorMessage">{props.errorMessage}</p>
        )}
        {statusMessage === null ? null : (
          <p className="statusMessage" role="status">
            {statusMessage}
            {statusMessage === "支出を削除しました" && restorableExpense !== null ? (
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
            {isAuthenticating
              ? "LINE認証を確認しています"
              : "APIまたは認証が未設定のため、追加・編集・削除はできません"}
          </p>
        )}

        <section className="list" aria-label="支出明細">
          {expenses.map((expense) => (
            <article
              className={`expense ${payerClassName(expense.userId)}`}
              key={expense.id}
              ref={(element) => {
                if (element === null) {
                  expenseElementsRef.current.delete(expense.id);
                  return;
                }

                expenseElementsRef.current.set(expense.id, element);
              }}
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
                <span className="dateBadge">{formatMonthDay(expense.date)}</span>
                <span className="expenseBody">
                  <span className="expenseName">{expense.memo ?? expense.category}</span>
                  <span className="expenseMeta">
                    <span
                      className={`payerPill ${payerClassName(expense.userId)}`}
                    >
                      {expense.userName ?? expense.userId}
                    </span>
                  </span>
                </span>
                <span className="amount">{numberFormatter.format(expense.price)}</span>
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
                    handleUpdate(expense, { ...payload, version: expense.version })
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

function ExpenseForm(props: {
  defaultDraft: ExpenseFormDraft;
  deleteLabel?: string;
  disabled: boolean;
  submitLabel: string;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  onSubmit: (payload: CreateExpensePayload) => Promise<void>;
}) {
  const [draft, setDraft] = useState(props.defaultDraft);

  return (
    <form
      className="expenseForm"
      onSubmit={(event) => {
        event.preventDefault();
        void props.onSubmit({
          date: draft.date,
          price: Number(draft.price),
          category: DEFAULT_EXPENSE_CATEGORY,
          memo: draft.memo.trim() === "" ? null : draft.memo.trim(),
        });
      }}
    >
      <label className="field">
        <span>日付</span>
        <input
          required
          type="date"
          value={draft.date}
          disabled={props.disabled}
          onChange={(event) =>
            setDraft((current) => ({ ...current, date: event.target.value }))
          }
        />
      </label>
      <label className="field">
        <span>金額</span>
        <input
          required
          min="0"
          inputMode="numeric"
          type="number"
          value={draft.price}
          disabled={props.disabled}
          onChange={(event) =>
            setDraft((current) => ({ ...current, price: event.target.value }))
          }
        />
      </label>
      <label className="field wideField">
        <span>支払内容</span>
        <input
          type="text"
          value={draft.memo}
          disabled={props.disabled}
          onChange={(event) =>
            setDraft((current) => ({ ...current, memo: event.target.value }))
          }
        />
      </label>
      <div className="formActions">
        <button className="primaryButton" type="submit" disabled={props.disabled}>
          {props.submitLabel}
        </button>
        <button
          className="secondaryButton"
          type="button"
          disabled={props.disabled}
          onClick={props.onCancel}
        >
          キャンセル
        </button>
        {props.onDelete === undefined ? null : (
          <button
            className="deleteButton"
            type="button"
            disabled={props.disabled}
            aria-label="支出を削除"
            onClick={() => void props.onDelete?.()}
          >
            {props.deleteLabel ?? "削除"}
          </button>
        )}
      </div>
    </form>
  );
}

function defaultDraftForMonth(month: string): ExpenseFormDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    date: today.startsWith(month) ? today : `${month}-01`,
    price: "",
    memo: "",
  };
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

function usersFromSettlement(settlement: MonthlySettlementSummary): HouseholdUsers {
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

  const fromUser = users.find((user) => user.id === settlement.settlement.fromUserId);
  const toUser = users.find((user) => user.id === settlement.settlement.toUserId);

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

function payerClassName(userId: string): "payerWoman" | "payerMan" | "payerUnknown" {
  if (userId === "woman") {
    return "payerWoman";
  }

  if (userId === "man") {
    return "payerMan";
  }

  return "payerUnknown";
}

function logExpenseMutationError(
  operation: "authenticate" | "create" | "update" | "delete" | "restore",
  error: unknown,
): void {
  console.error(`Expense ${operation} failed`, error);
}

function errorMessageForUser(error: unknown): string {
  if (error instanceof ExpenseApiError) {
    const detail = error.responseBody.trim();
    if (detail === "") {
      return `API status: ${error.status}`;
    }

    return `API status: ${error.status} / ${detail}`;
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "詳細はブラウザ console を確認してください";
}
