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

export class InMemoryExpenseRepository implements ExpenseRepository {
  readonly #expenses: Expense[];
  readonly #deletedExpenses: Expense[] = [];

  constructor(expenses: readonly Expense[]) {
    this.#expenses = [...expenses];
  }

  async listByMonth(input: ListExpensesInput): Promise<Expense[]> {
    return [...this.#expenses]
      .filter((expense) => expense.date.startsWith(`${input.month}-`))
      .sort((left, right) => {
        const dateOrder = right.date.localeCompare(left.date);
        if (dateOrder !== 0) {
          return dateOrder;
        }

        return right.id.localeCompare(left.id);
      });
  }

  async getById(input: { id: string; actor: User }): Promise<ExpenseDetail> {
    const activeExpense = this.#expenses.find((expense) => expense.id === input.id);
    if (activeExpense !== undefined) {
      return { expense: activeExpense, deleted: false };
    }

    const deletedExpense = this.#deletedExpenses.find(
      (expense) => expense.id === input.id,
    );
    if (deletedExpense !== undefined) {
      return { expense: deletedExpense, deleted: true };
    }

    throw new ExpenseRepositoryError("not_found", input.id);
  }

  async create(input: CreateExpenseInput): Promise<Expense> {
    const expense: Expense = {
      id: `exp_${this.#expenses.length + 1}`,
      userId: input.actor.id,
      date: input.date,
      price: input.price,
      category: input.category,
      memo: input.memo,
      version: 1,
    };
    this.#expenses.push(expense);

    return expense;
  }

  async update(input: UpdateExpenseInput): Promise<Expense> {
    const index = this.#expenses.findIndex((expense) => expense.id === input.id);
    if (index === -1) {
      throw new ExpenseRepositoryError("not_found", input.id);
    }

    const current = this.#expenses[index];
    if (current === undefined) {
      throw new ExpenseRepositoryError("not_found", input.id);
    }

    if (current.version !== input.version) {
      throw new ExpenseRepositoryError(
        "version_conflict",
        input.id,
        input.version,
        current.version,
      );
    }

    const next: Expense = {
      ...current,
      date: input.patch.date ?? current.date,
      price: input.patch.price ?? current.price,
      category: input.patch.category ?? current.category,
      memo: "memo" in input.patch ? input.patch.memo ?? null : current.memo,
    };
    this.#expenses[index] = next;

    return next;
  }

  async delete(input: DeleteExpenseInput): Promise<Expense> {
    const index = this.#expenses.findIndex((expense) => expense.id === input.id);
    if (index === -1) {
      throw new ExpenseRepositoryError("not_found", input.id);
    }

    const deletedExpense = this.#expenses[index];
    if (deletedExpense === undefined) {
      throw new ExpenseRepositoryError("not_found", input.id);
    }

    this.#deletedExpenses.push(...this.#expenses.splice(index, 1));
    return deletedExpense;
  }

  async restore(input: RestoreExpenseInput): Promise<Expense> {
    const index = this.#deletedExpenses.findIndex((expense) => expense.id === input.id);
    if (index === -1) {
      throw new ExpenseRepositoryError("not_found", input.id);
    }

    const restored = this.#deletedExpenses[index];
    if (restored === undefined) {
      throw new ExpenseRepositoryError("not_found", input.id);
    }

    this.#deletedExpenses.splice(index, 1);
    this.#expenses.push(restored);

    return restored;
  }
}

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
