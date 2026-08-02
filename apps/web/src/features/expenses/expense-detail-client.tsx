"use client";

import type { Expense } from "@shared-expense/shared";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  deleteExpense,
  ExpenseApiError,
  fetchExpenseDetail,
  restoreExpense,
  updateExpense,
  type CreateExpensePayload,
  type UpdateExpensePayload,
} from "./api";
import { getLiffIdToken } from "./liff-client";
import { currentMonthInJst, formatMonthLabel, normalizeMonthParam } from "./month";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; expense: Expense; deleted: boolean }
  | { status: "error"; message: string };

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMonth = currentMonthInJst();
  const month = normalizeMonthParam(searchParams.get("month") ?? undefined, currentMonth);
  const expenseId =
    expenseIdFromPathname(pathname) ??
    normalizeStringParam(searchParams.get("expenseId") ?? undefined);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const devIdToken =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_ID_TOKEN
      : undefined;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const [idToken, setIdToken] = useState<string | undefined>(devIdToken);
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const listHref = useMemo(() => `/?month=${month}`, [month]);

  useEffect(() => {
    if (expenseId === undefined) {
      setState({ status: "error", message: "支出IDが指定されていません" });
      return;
    }

    const normalizedExpenseId = expenseId;
    let isCancelled = false;

    async function loadDetail(): Promise<void> {
      setState({ status: "loading" });
      setStatusMessage(null);
      try {
        const token = await resolveInitialToken({
          apiBaseUrl,
          devIdToken,
          liffId,
          currentIdToken: idToken,
        });
        if (isCancelled) {
          return;
        }
        setIdToken(token);
        const detail = await fetchExpenseDetail({
          apiBaseUrl,
          id: normalizedExpenseId,
          idToken: token,
        });
        if (isCancelled) {
          return;
        }
        setState({ status: "ready", ...detail });
      } catch (error) {
        if (!isCancelled) {
          setState({
            status: "error",
            message: `支出を取得できませんでした。${errorMessageForUser(error)}`,
          });
        }
      }
    }

    void loadDetail();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, devIdToken, expenseId, idToken, liffId]);

  async function handleUpdate(
    expense: Expense,
    payload: UpdateExpensePayload,
  ): Promise<void> {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const updated = await updateExpense({
        apiBaseUrl,
        idToken,
        idempotencyKey: createIdempotencyKey(`expense-detail-update-${expense.id}`),
        id: expense.id,
        expense: payload,
      });
      setState({ status: "ready", expense: updated, deleted: false });
      setStatusMessage("支出を更新しました");
    } catch (error) {
      setStatusMessage(`支出を更新できませんでした。${errorMessageForUser(error)}`);
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
        apiBaseUrl,
        idToken,
        idempotencyKey: createIdempotencyKey(`expense-detail-delete-${expense.id}`),
        id: expense.id,
      });
      setState({ status: "ready", expense, deleted: true });
      setStatusMessage("支出を削除しました");
    } catch (error) {
      setStatusMessage(`支出を削除できませんでした。${errorMessageForUser(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRestore(expense: Expense): Promise<void> {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const restored = await restoreExpense({
        apiBaseUrl,
        idToken,
        idempotencyKey: createIdempotencyKey(`expense-detail-restore-${expense.id}`),
        id: expense.id,
      });
      setState({ status: "ready", expense: restored, deleted: false });
      setStatusMessage("支出を復元しました");
    } catch (error) {
      setStatusMessage(`支出を復元できませんでした。${errorMessageForUser(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <div className="app">
        <header className="detailTopbar">
          <div>
            <p className="month">{formatMonthLabel(month)}</p>
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

        {state.status === "loading" ? (
          <p className="statusMessage" role="status">
            支出を読み込んでいます
          </p>
        ) : null}

        {state.status === "error" ? (
          <p className="errorMessage">{state.message}</p>
        ) : null}

        {state.status === "ready" ? (
          <section
            className="detailPanel"
            data-deleted={state.deleted ? "true" : undefined}
          >
            <div className="detailHeader">
              <span className="dateBadge">{formatMonthDay(state.expense.date)}</span>
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
        ) : null}
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

  useEffect(() => {
    setDraft(props.defaultDraft);
  }, [props.defaultDraft]);

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
        <button className="primaryButton" type="submit" disabled={props.disabled}>
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

async function resolveInitialToken(input: {
  apiBaseUrl: string | undefined;
  devIdToken: string | undefined;
  liffId: string | undefined;
  currentIdToken: string | undefined;
}): Promise<string | undefined> {
  if (input.currentIdToken !== undefined && input.currentIdToken.trim() !== "") {
    return input.currentIdToken;
  }

  if (input.devIdToken !== undefined && input.devIdToken.trim() !== "") {
    return input.devIdToken;
  }

  if (
    input.apiBaseUrl === undefined ||
    input.apiBaseUrl.trim() === "" ||
    input.liffId === undefined ||
    input.liffId.trim() === ""
  ) {
    return undefined;
  }

  return await getLiffIdToken({
    liffId: input.liffId,
    redirectUri: window.location.href,
  }) ?? undefined;
}

function normalizeStringParam(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return value;
}

function expenseIdFromPathname(pathname: string): string | undefined {
  const segments = pathname.split("/").filter((segment) => segment !== "");
  const expenseSegmentIndex = segments.lastIndexOf("expense");
  if (expenseSegmentIndex === -1) {
    return undefined;
  }

  const rawExpenseId = segments[expenseSegmentIndex + 1];
  if (rawExpenseId === undefined) {
    return undefined;
  }

  return normalizeStringParam(decodeURIComponent(rawExpenseId));
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

function errorMessageForUser(error: unknown): string {
  if (error instanceof ExpenseApiError) {
    const detail = error.responseBody.trim();
    return detail === "" ? `API status: ${error.status}` : detail;
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "詳細はブラウザ console を確認してください";
}
