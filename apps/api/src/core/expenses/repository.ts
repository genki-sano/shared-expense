import type { Expense, User } from "@shared-expense/shared";

export type ListExpensesInput = {
  month: string;
  actor: User;
};

export type CreateExpenseInput = {
  actor: User;
  date: string;
  price: number;
  category: string;
  memo: string | null;
};

export type UpdateExpenseInput = {
  id: string;
  actor: User;
  version: number;
  patch: {
    date?: string;
    price?: number;
    category?: string;
    memo?: string | null;
  };
};

export type DeleteExpenseInput = {
  id: string;
  actor: User;
};

export type RestoreExpenseInput = {
  id: string;
  actor: User;
};

export type ExpenseDetail = {
  expense: Expense;
  deleted: boolean;
};

export type ExpenseRepository = {
  listByMonth(input: ListExpensesInput): Promise<Expense[]>;
  getById(input: { id: string; actor: User }): Promise<ExpenseDetail>;
  create(input: CreateExpenseInput): Promise<Expense>;
  update(input: UpdateExpenseInput): Promise<Expense>;
  delete(input: DeleteExpenseInput): Promise<Expense>;
  restore(input: RestoreExpenseInput): Promise<Expense>;
};

export class ExpenseRepositoryError extends Error {
  readonly code: "not_found" | "version_conflict";
  readonly id: string;
  readonly expectedVersion: number | undefined;
  readonly actualVersion: number | undefined;

  constructor(
    code: "not_found" | "version_conflict",
    id: string,
    expectedVersion?: number,
    actualVersion?: number,
  ) {
    super(code === "not_found" ? `Expense not found: ${id}` : `Expense version conflict: ${id}`);
    this.name = "ExpenseRepositoryError";
    this.code = code;
    this.id = id;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}
