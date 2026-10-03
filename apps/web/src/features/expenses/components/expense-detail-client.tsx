"use client";

import { errorMessageForUser } from "../error-message";
import type { Expense } from "@shared-expense/shared";
import Link from "next/link";
import { hasLiffPrimaryRedirectParams } from "../../../lib/liff-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  deleteExpense,
  restoreExpense,
  updateExpense,
  type UpdateExpensePayload,
} from "../api";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ApiSessionBoundary } from "../../../components/api-session";
import type { ApiSession } from "../../../lib/api-auth";
import { QueryBoundary } from "../../../components/query-boundary";
import {
  expenseQuery,
  expenseFormOptionsQuery,
  expenseMutationOptions,
} from "../queries/expense-queries";
import { LiffPrimaryRedirectGate } from "../../../components/liff-primary-redirect-gate";

import { ExpenseForm } from "./expense-form";

export function ExpenseDetailClient() {
  const searchParams = useSearchParams();
  const expenseId = normalizeStringParam(searchParams.get("id") ?? undefined);
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
  const router = useRouter();
  const { data: formOptions } = useSuspenseQuery(
    expenseFormOptionsQuery(session),
  );
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

        {state.deleted ? (
          <div className="archiveNotice" role="status">
            <strong>アーカイブ済み</strong>
            <p>
              この支出は削除されています。
              <br />
              内容を変更するには、先に復元してください。
            </p>
          </div>
        ) : null}
        <ExpenseForm
          defaultDraft={draftFromExpense(state.expense)}
          members={formOptions.members}
          submitLabel="変更を保存"
          disabled={isSubmitting}
          archived={state.deleted}
          key={`${state.expense.id}:${state.expense.version}:${state.deleted}`}
          onCancel={() => router.push(listHref)}
          onDelete={() => handleDelete(state.expense)}
          onRestore={() => handleRestore(state.expense)}
          onSubmit={(payload) =>
            handleUpdate(state.expense, {
              ...payload,
              version: state.expense.version,
            })
          }
        />
      </div>
    </main>
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

function draftFromExpense(expense: Expense) {
  return {
    userId: expense.userId,
    date: expense.date,
    price: String(expense.price),
    memo: expense.memo ?? "",
  };
}

function createIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}
