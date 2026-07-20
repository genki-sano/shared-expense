import { describe, expect, it } from "vitest";
import { calculateMonthlySettlement } from "./settlement";
import type { Expense } from "./expense";
import type { User } from "./user";

const users: [User, User] = [
  { id: "user_a", lineUserId: "line_a", displayName: "A", notifyEnabled: true },
  { id: "user_b", lineUserId: "line_b", displayName: "B", notifyEnabled: true },
];

describe("calculateMonthlySettlement", () => {
  it("calculates totals and the payment direction for two users using ceil rounding", () => {
    const expenses: Expense[] = [
      {
        id: "exp_1",
        userId: "user_a",
        date: "2026-06-03",
        price: 10001,
        category: "food",
        memo: "supermarket",
        version: 1,
      },
      {
        id: "exp_2",
        userId: "user_b",
        date: "2026-06-08",
        price: 4000,
        category: "daily",
        memo: null,
        version: 1,
      },
    ];

    expect(calculateMonthlySettlement("2026-06", users, expenses)).toEqual({
      month: "2026-06",
      householdTotal: 14001,
      userTotals: [
        { userId: "user_a", displayName: "A", total: 10001 },
        { userId: "user_b", displayName: "B", total: 4000 },
      ],
      difference: 6001,
      settlement: {
        fromUserId: "user_b",
        toUserId: "user_a",
        amount: 3001,
      },
    });
  });

  it("returns zero settlement when both users paid equally", () => {
    const expenses: Expense[] = [
      {
        id: "exp_1",
        userId: "user_a",
        date: "2026-06-03",
        price: 5000,
        category: "food",
        memo: null,
        version: 1,
      },
      {
        id: "exp_2",
        userId: "user_b",
        date: "2026-06-08",
        price: 5000,
        category: "daily",
        memo: null,
        version: 1,
      },
    ];

    expect(calculateMonthlySettlement("2026-06", users, expenses).settlement).toEqual({
      fromUserId: null,
      toUserId: null,
      amount: 0,
    });
  });

  it("does not include expenses outside the target month", () => {
    const expenses: Expense[] = [
      {
        id: "exp_1",
        userId: "user_a",
        date: "2026-06-30",
        price: 7000,
        category: "food",
        memo: null,
        version: 1,
      },
      {
        id: "exp_2",
        userId: "user_b",
        date: "2026-06-01",
        price: 1000,
        category: "daily",
        memo: null,
        version: 1,
      },
      {
        id: "exp_3",
        userId: "user_b",
        date: "2026-07-01",
        price: 9000,
        category: "daily",
        memo: null,
        version: 1,
      },
    ];

    expect(calculateMonthlySettlement("2026-06", users, expenses)).toMatchObject({
      householdTotal: 8000,
      userTotals: [
        { userId: "user_a", total: 7000 },
        { userId: "user_b", total: 1000 },
      ],
      difference: 6000,
      settlement: {
        fromUserId: "user_b",
        toUserId: "user_a",
        amount: 3000,
      },
    });
  });
});
