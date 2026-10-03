"use client";
import { useState } from "react";
import type { CreateExpensePayload } from "../api";
type ExpenseFormDraft = { date: string; price: string; memo: string };
const DEFAULT_EXPENSE_CATEGORY = "その他";

export function ExpenseForm(props: {
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
        <button
          className="primaryButton"
          type="submit"
          disabled={props.disabled}
        >
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

export function defaultDraftForMonth(month: string): ExpenseFormDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    date: today.startsWith(month) ? today : `${month}-01`,
    price: "",
    memo: "",
  };
}
