"use client";
import { useId, useState } from "react";
import { flushSync } from "react-dom";
import type { CreateExpensePayload, ExpenseFormOptions } from "../api";
import { formatAmountInput } from "../amount-input";
export type ExpenseFormDraft = {
  date: string;
  price: string;
  memo: string;
  userId: string;
};
const DEFAULT_EXPENSE_CATEGORY = "その他";

export function ExpenseForm(props: {
  defaultDraft: ExpenseFormDraft;
  members: ExpenseFormOptions["members"];
  disabled: boolean;
  archived?: boolean;
  submitLabel: string;
  onCancel?: () => void;
  onDelete?: () => Promise<void>;
  onRestore?: () => Promise<void>;
  onSubmit: (payload: CreateExpensePayload) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => ({
    ...props.defaultDraft,
    price: formatAmountInput(
      props.defaultDraft.price,
      props.defaultDraft.price.length,
    ).value,
  }));
  const unitId = useId();
  const payerLabelId = useId();
  const locked = props.disabled || props.archived;
  return (
    <form
      className="expenseForm"
      data-archived={props.archived || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        if (locked) return;
        const price = Number(draft.price.replaceAll(",", ""));
        if (!Number.isSafeInteger(price) || price < 0) return;
        void props.onSubmit({
          date: draft.date,
          price,
          userId: draft.userId,
          category: DEFAULT_EXPENSE_CATEGORY,
          memo: draft.memo.trim() === "" ? null : draft.memo.trim(),
        });
      }}
    >
      <div className="expenseFormCard">
        <label className="amountField">
          <span className="formFieldLabel">金額</span>
          <span className="amountInputLine">
            <span className="currencyPrefix" id={unitId}>
              ¥
            </span>
            <input
              aria-describedby={unitId}
              aria-label="金額"
              required
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              pattern="[0-9,]+"
              value={draft.price}
              disabled={locked}
              onChange={(event) => {
                const input = event.currentTarget;
                const formatted = formatAmountInput(
                  input.value,
                  input.selectionStart ?? input.value.length,
                );
                input.setCustomValidity(
                  Number.isSafeInteger(
                    Number(formatted.value.replaceAll(",", "")),
                  )
                    ? ""
                    : "金額が大きすぎます",
                );
                flushSync(() =>
                  setDraft((current) => ({
                    ...current,
                    price: formatted.value,
                  })),
                );
                input.setSelectionRange(formatted.caret, formatted.caret);
              }}
            />
          </span>
        </label>
        <div className="formInfoRow">
          <span className="formFieldLabel" id={payerLabelId}>
            支払った人
          </span>
          <div
            className="payerOptions"
            role="group"
            aria-labelledby={payerLabelId}
          >
            {props.members.map((member, index) => (
              <button
                key={member.id}
                className={`payerOption ${member.id === "woman" ? "payerWoman" : member.id === "man" ? "payerMan" : index === 0 ? "payerWoman" : "payerMan"}`}
                type="button"
                aria-pressed={draft.userId === member.id}
                disabled={locked}
                onClick={() =>
                  setDraft((current) => ({ ...current, userId: member.id }))
                }
              >
                <span className="payerDot" />
                {member.displayName}
                <span className="payerCheck" aria-hidden="true">
                  ✓
                </span>
              </button>
            ))}
          </div>
        </div>
        <label className="field formInfoRow">
          <span>日付</span>
          <input
            required
            type="date"
            value={draft.date}
            disabled={locked}
            onChange={(event) =>
              setDraft((current) => ({ ...current, date: event.target.value }))
            }
          />
        </label>
        <label className="field formInfoRow">
          <span>支払内容</span>
          <input
            type="text"
            placeholder="例：スーパーで食材"
            value={draft.memo}
            disabled={locked}
            onChange={(event) =>
              setDraft((current) => ({ ...current, memo: event.target.value }))
            }
          />
        </label>
      </div>
      <div className="formActions">
        {props.onCancel ? (
          <button
            className="secondaryButton"
            type="button"
            disabled={props.disabled}
            onClick={props.onCancel}
          >
            {props.archived ? "一覧へ" : "キャンセル"}
          </button>
        ) : null}
        {props.archived ? (
          <button
            className="primaryButton"
            type="button"
            disabled={props.disabled}
            onClick={() => void props.onRestore?.()}
          >
            この支出を復元
          </button>
        ) : (
          <button
            className="primaryButton"
            type="submit"
            disabled={props.disabled}
          >
            {props.submitLabel}
          </button>
        )}
      </div>
      {!props.archived && props.onDelete ? (
        <button
          className="deleteButton"
          type="button"
          disabled={props.disabled}
          onClick={() => void props.onDelete?.()}
        >
          この支出を削除
        </button>
      ) : null}
    </form>
  );
}

export function defaultDraftForMonth(
  month: string,
  userId: string,
): ExpenseFormDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    date: today.startsWith(month) ? today : `${month}-01`,
    price: "",
    memo: "",
    userId,
  };
}
