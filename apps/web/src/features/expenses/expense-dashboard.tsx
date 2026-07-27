"use client";

import type { Expense } from "@shared-expense/shared";
import { useMemo, useState } from "react";
import {
  createExpense,
  deleteExpense,
  ExpenseApiError,
  updateExpense,
  type CreateExpensePayload,
  type UpdateExpensePayload,
} from "./api";

type ExpenseDashboardProps = {
  expenses: Expense[];
  source: "api" | "sample";
  month: string;
  apiBaseUrl: string | undefined;
  idToken: string | undefined;
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
  const [expenses, setExpenses] = useState(() => sortExpenses(props.expenses));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.price, 0),
    [expenses],
  );
  const isMutationEnabled =
    props.apiBaseUrl !== undefined && props.apiBaseUrl.trim() !== "";

  async function handleCreate(payload: CreateExpensePayload): Promise<void> {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const created = await createExpense({
        apiBaseUrl: props.apiBaseUrl,
        idToken: props.idToken,
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
    try {
      const updated = await updateExpense({
        apiBaseUrl: props.apiBaseUrl,
        idToken: props.idToken,
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
        idToken: props.idToken,
        idempotencyKey: createIdempotencyKey(`expense-delete-${expense.id}`),
        id: expense.id,
      });
      setExpenses((current) => current.filter((item) => item.id !== expense.id));
      setStatusMessage("支出を削除しました");
    } catch (error) {
      logExpenseMutationError("delete", error);
      setStatusMessage(`支出を削除できませんでした。${errorMessageForUser(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <div className="app">
        <header className="topbar">
          <div>
            <p className="month">2026年7月</p>
            <h1 className="title">月次支出</h1>
          </div>
          <button
            className="addButton"
            type="button"
            aria-label="支出を追加"
            aria-expanded={isCreateOpen}
            disabled={!isMutationEnabled}
            onClick={() => {
              setIsCreateOpen((current) => !current);
              setEditingExpenseId(null);
            }}
          >
            +
          </button>
        </header>

        <section className="summaryPanel" aria-label="月次サマリ">
          <div>
            <p className="summaryLabel">精算予定</p>
            <p className="settlementAmount">{numberFormatter.format(4270)}</p>
          </div>
          <div className="summaryDetails" aria-label="合計と件数">
            <span>合計 {numberFormatter.format(total)}</span>
            <span>{expenses.length}件</span>
          </div>
        </section>

        {isCreateOpen ? (
          <ExpenseForm
            defaultDraft={defaultDraftForMonth(props.month)}
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
          </p>
        )}
        {isMutationEnabled ? null : (
          <p className="errorMessage">API未設定のため、追加・編集・削除はできません</p>
        )}

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
                disabled={!isMutationEnabled || isSubmitting}
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
  operation: "create" | "update" | "delete",
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
