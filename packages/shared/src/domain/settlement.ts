import type { Expense } from "./expense";
import type { HouseholdUsers } from "./user";

export type UserMonthlyTotal = {
  userId: string;
  displayName: string;
  total: number;
};

export type MonthlySettlement = {
  fromUserId: string | null;
  toUserId: string | null;
  amount: number;
};

export type MonthlySettlementSummary = {
  month: string;
  householdTotal: number;
  userTotals: UserMonthlyTotal[];
  difference: number;
  settlement: MonthlySettlement;
};

export function calculateMonthlySettlement(
  month: string,
  users: HouseholdUsers,
  expenses: readonly Expense[],
): MonthlySettlementSummary {
  const totalForUser = (user: HouseholdUsers[number]): UserMonthlyTotal => ({
    userId: user.id,
    displayName: user.displayName,
    total: expenses
      .filter((expense) => expense.userId === user.id && expense.date.startsWith(`${month}-`))
      .reduce((sum, expense) => sum + expense.price, 0),
  });

  const userTotals: [UserMonthlyTotal, UserMonthlyTotal] = [
    totalForUser(users[0]),
    totalForUser(users[1]),
  ];

  const [first, second] = userTotals;
  const householdTotal = userTotals.reduce((sum, userTotal) => sum + userTotal.total, 0);
  const difference = Math.abs(first.total - second.total);
  const amount = Math.ceil(difference / 2);

  if (amount === 0) {
    return {
      month,
      householdTotal,
      userTotals,
      difference,
      settlement: { fromUserId: null, toUserId: null, amount: 0 },
    };
  }

  const payer = first.total < second.total ? first : second;
  const receiver = first.total > second.total ? first : second;

  return {
    month,
    householdTotal,
    userTotals,
    difference,
    settlement: {
      fromUserId: payer.userId,
      toUserId: receiver.userId,
      amount,
    },
  };
}
