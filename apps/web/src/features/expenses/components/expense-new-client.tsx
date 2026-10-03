"use client";

import Link from "next/link";
import { hasLiffPrimaryRedirectParams } from "../../../lib/liff-client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { ApiSessionBoundary } from "../../../components/api-session";
import type { ApiSession } from "../../../lib/api-auth";
import { LiffPrimaryRedirectGate } from "../../../components/liff-primary-redirect-gate";
import { errorMessageForUser } from "../error-message";
import { createExpense, type CreateExpensePayload } from "../api";
import { QueryBoundary } from "../../../components/query-boundary";
import {
  expenseFormOptionsQuery,
  expenseMutationOptions,
} from "../queries/expense-queries";
import { currentMonthInJst, normalizeMonthParam } from "../month";
import { ExpenseForm, defaultDraftForMonth } from "./expense-form";

export function ExpenseNewClient() {
  const searchParams = useSearchParams();
  const month = normalizeMonthParam(
    searchParams.get("month") ?? undefined,
    currentMonthInJst(),
  );
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.trim();
  if (liffId && hasLiffPrimaryRedirectParams(searchParams))
    return <LiffPrimaryRedirectGate liffId={liffId} />;
  return (
    <ApiSessionBoundary>
      {(session) => (
        <QueryBoundary
          loading="支出フォームを読み込んでいます"
          formatError={(error) =>
            `支出フォームを取得できませんでした。${errorMessageForUser(error)}`
          }
        >
          <ExpenseNew {...session} month={month} key={month} />
        </QueryBoundary>
      )}
    </ApiSessionBoundary>
  );
}

function ExpenseNew({ month, ...session }: ApiSession & { month: string }) {
  const { data: formOptions } = useSuspenseQuery(
    expenseFormOptionsQuery(session),
  );
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation(
    expenseMutationOptions(queryClient, createExpense),
  );
  const [message, setMessage] = useState<string | null>(null);
  const listHref = `/expenses?month=${month}`;
  const canMutate = Boolean(
    session.apiBaseUrl?.trim() && session.idToken?.trim(),
  );
  async function handleSubmit(expense: CreateExpensePayload) {
    setMessage(null);
    try {
      await mutation.mutateAsync({
        ...session,
        expense,
        idempotencyKey: `expense-create-${crypto.randomUUID()}`,
      });
      router.push(`/expenses?month=${expense.date.slice(0, 7)}`);
    } catch (error) {
      setMessage(`支出を追加できませんでした。${errorMessageForUser(error)}`);
    }
  }
  return (
    <main className="shell">
      <div className="app">
        <header className="detailTopbar">
          <h1 className="title">支出を追加</h1>
          <Link className="backLink" href={listHref}>
            一覧へ
          </Link>
        </header>
        {message ? (
          <p className="errorMessage" role="status">
            {message}
          </p>
        ) : null}
        {!canMutate ? (
          <p className="errorMessage">
            APIまたは認証が未設定のため、追加・編集・削除はできません
          </p>
        ) : null}
        <ExpenseForm
          defaultDraft={defaultDraftForMonth(month, formOptions.actorId)}
          members={formOptions.members}
          disabled={!canMutate || mutation.isPending}
          submitLabel="追加する"
          onCancel={() => router.push(listHref)}
          onSubmit={handleSubmit}
        />
      </div>
    </main>
  );
}
