import type { Expense, User } from "@shared-expense/shared";

export type ListMonthlySettlementExpensesInput = {
  month: string;
  actor: User;
};

export type MonthlySettlementExpenseReader = {
  listByMonth(input: ListMonthlySettlementExpensesInput): Promise<Expense[]>;
};
