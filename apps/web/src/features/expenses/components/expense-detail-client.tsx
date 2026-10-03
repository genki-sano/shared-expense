"use client";

import { errorMessageForUser } from "../error-message";
import type { Expense } from "@shared-expense/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
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
import { ApiSessionBoundary, type ApiSession } from "../../../lib/api-session";
import { QueryBoundary } from "../../../components/query-boundary";
import {
  expenseQuery,
  expenseMutationOptions,
} from "../queries/expense-queries";
import {
  hasLiffPrimaryRedirectParams,
  LiffPrimaryRedirectGate,
} from "../../../lib/liff-primary-redirect-gate";

type ExpenseDetailDraft = {
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

export function ExpenseDetailClient() {
  const searchParams = useSearchParams();
  const expenseId = normalizeStringParam(
    searchParams.get("id") ?? searchParams.get("expenseId") ?? undefined,
  );
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const normalizedLiffId = liffId?.trim();
  const shouldGateLiffPrimaryRedirect =
    normalizedLiffId !== undefined &&
    normalizedLiffId !== "" &&
    hasLiffPrimaryRedirectParams(searchParams);
  if (shouldGateLiffPrimaryRedirect)
    return <LiffPrimaryRedirectGate liffId={normalizedLiffId} />;
  if (expenseId === undefined)
    return (
      <main className="shell">
        <div className="app">
          <p className="errorMessage">支出IDが指定されていません</p>
          <Link className="backLink" href="/expenses">
            一覧へ
          </Link>
        </div>
      </main>
    );
  return (
    <ApiSessionBoundary>
      {(session) => (
        <QueryBoundary
          key={expenseId}
          loading="支出を読み込んでいます"
          formatError={(error) =>
            `支出を取得できませんでした。${errorMessageForUser(error)}`
          }
        >
          <ExpenseDetail {...session} expenseId={expenseId} />
        </QueryBoundary>
      )}
    </ApiSessionBoundary>
  );
}

function ExpenseDetail({
  expenseId,
  ...session
}: ApiSession & { expenseId: string }) {
  const { apiBaseUrl, idToken } = session;
  const queryClient = useQueryClient();
  const {
    data: detail,
    error: readError,
    refetch,
  } = useSuspenseQuery(expenseQuery(session, expenseId));
  const state = detail;
  const updateMutation = useMutation(
    expenseMutationOptions(queryClient, updateExpense),
  );
  const deleteMutation = useMutation(
    expenseMutationOptions(queryClient, deleteExpense),
  );
  const restoreMutation = useMutation(
    expenseMutationOptions(queryClient, restoreExpense),
  );
  const isSubmitting =
    updateMutation.isPending ||
    deleteMutation.isPending ||
    restoreMutation.isPending;
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const listHref = `/expenses?month=${monthFromExpenseDate(state.expense.date)}`;

  async function handleUpdate(
    expense: Expense,
    payload: UpdateExpensePayload,
  ): Promise<void> {
    setStatusMessage(null);
    try {
      await updateMutation.mutateAsync({
        apiBaseUrl,
        idToken,
        idempotencyKey: createIdempotencyKey(
          `expense-detail-update-${expense.id}`,
        ),
        id: expense.id,
        expense: payload,
      });
      setStatusMessage("支出を更新しました");
    } catch (error) {
      setStatusMessage(
        `支出を更新できませんでした。${errorMessageForUser(error)}`,
      );
    }
  }

  async function handleDelete(expense: Expense): Promise<void> {
    if (!window.confirm("この支出を削除しますか？")) {
      return;
    }

    setStatusMessage(null);
    try {
      await deleteMutation.mutateAsync({
        apiBaseUrl,
        idToken,
        idempotencyKey: createIdempotencyKey(
          `expense-detail-delete-${expense.id}`,
        ),
        id: expense.id,
      });
      setStatusMessage("支出を削除しました");
    } catch (error) {
      setStatusMessage(
        `支出を削除できませんでした。${errorMessageForUser(error)}`,
      );
    }
  }

  async function handleRestore(expense: Expense): Promise<void> {
    setStatusMessage(null);
    try {
      await restoreMutation.mutateAsync({
        apiBaseUrl,
        idToken,
        idempotencyKey: createIdempotencyKey(
          `expense-detail-restore-${expense.id}`,
        ),
        id: expense.id,
      });
      setStatusMessage("支出を復元しました");
    } catch (error) {
      setStatusMessage(
        `支出を復元できませんでした。${errorMessageForUser(error)}`,
      );
    }
  }

  return (
    <main className="shell">
      <div className="app">
        <header className="detailTopbar">
          <div>
            <h1 className="title">支出詳細</h1>
          </div>
          <Link className="backLink" href={listHref}>
            一覧へ
          </Link>
        </header>

        {statusMessage === null ? null : (
          <p className="statusMessage" role="status">
            {statusMessage}
          </p>
        )}

        {readError ? (
          <p className="errorMessage" role="status">
            支出を取得できませんでした。{errorMessageForUser(readError)}
            <button
              className="statusLink"
              type="button"
              onClick={() => void refetch()}
            >
              再試行
            </button>
          </p>
        ) : null}

        <section
          className="detailPanel"
          data-deleted={state.deleted ? "true" : undefined}
        >
          <div className="detailHeader">
            <span className="dateBadge">
              {formatMonthDay(state.expense.date)}
            </span>
            <div>
              <p className="detailName">
                {state.expense.memo ?? state.expense.category}
              </p>
              <p className="detailMeta">
                {state.expense.userName ?? state.expense.userId}
                {state.deleted ? " / 削除済み" : ""}
              </p>
            </div>
            <strong className="amount">
              {numberFormatter.format(state.expense.price)}
            </strong>
          </div>

          {state.deleted ? (
            <div className="detailActions">
              <button
                className="primaryButton"
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleRestore(state.expense)}
              >
                復元
              </button>
            </div>
          ) : (
            <DetailExpenseForm
              defaultDraft={draftFromExpense(state.expense)}
              disabled={isSubmitting}
              key={`${state.expense.id}:${state.expense.version}`}
              onDelete={() => handleDelete(state.expense)}
              onSubmit={(payload) =>
                handleUpdate(state.expense, {
                  ...payload,
                  version: state.expense.version,
                })
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}

function DetailExpenseForm(props: {
  defaultDraft: ExpenseDetailDraft;
  disabled: boolean;
  onDelete: () => Promise<void>;
  onSubmit: (payload: CreateExpensePayload) => Promise<void>;
}) {
  const [draft, setDraft] = useState(props.defaultDraft);

  return (
    <form
      className="expenseForm detailForm"
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
        <button
          className="primaryButton"
          type="submit"
          disabled={props.disabled}
        >
          保存
        </button>
        <button
          className="deleteButton"
          type="button"
          disabled={props.disabled}
          onClick={() => void props.onDelete()}
        >
          削除
        </button>
      </div>
    </form>
  );
}

function normalizeStringParam(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return value;
}

function monthFromExpenseDate(date: string): string {
  return date.slice(0, 7);
}

function draftFromExpense(expense: Expense): ExpenseDetailDraft {
  return {
    date: expense.date,
    price: String(expense.price),
    memo: expense.memo ?? "",
  };
}

function formatMonthDay(date: string): string {
  return date.slice(5).replace("-", "/");
}

function createIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}
