import type { Expense, User } from "@shared-expense/shared";

export type ListExpensesInput = {
  month: string;
  actor: User;
};

export type ExpenseRepository = {
  listByMonth(input: ListExpensesInput): Promise<Expense[]>;
};

export class InMemoryExpenseRepository implements ExpenseRepository {
  readonly #expenses: readonly Expense[];

  constructor(expenses: readonly Expense[]) {
    this.#expenses = expenses;
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
}
