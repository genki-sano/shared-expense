import { describe, expect, it } from "vitest";
import type { Expense } from "@shared-expense/shared";
import {
  expenseFromLegacyPaymentRow,
  expenseToLegacyPaymentRow,
  type LegacyPaymentRow,
} from "./expense-row";

describe("legacy payment row mapping", () => {
  const userTypeToUserId = (userType: string): string | null => {
    if (userType === "1") {
      return "user_a";
    }

    if (userType === "2") {
      return "user_b";
    }

    return null;
  };

  const userIdToUserType = (userId: string): string | null => {
    if (userId === "user_a") {
      return "1";
    }

    if (userId === "user_b") {
      return "2";
    }

    return null;
  };

  it("maps a legacy payments row to an Expense with ISO date and internal user id", () => {
    const row: LegacyPaymentRow = [
      "exp_1",
      "1",
      "food",
      "1000",
      "2026/06/03",
      "",
      "1",
      "1",
      "2026/06/03 10:00:00",
      "2026/06/03 10:00:00",
      "=DATEVALUE(E2)",
    ];

    expect(expenseFromLegacyPaymentRow(row, userTypeToUserId)).toEqual({
      id: "exp_1",
      userId: "user_a",
      date: "2026-06-03",
      price: 1000,
      category: "food",
      memo: null,
      version: 1,
    });
  });

  it("keeps a non-empty memo string", () => {
    const row: LegacyPaymentRow = [
      "exp_1",
      "1",
      "food",
      "1000",
      "2026/06/03",
      "lunch",
      "1",
      "1",
      "2026/06/03 10:00:00",
      "2026/06/03 10:00:00",
      "=DATEVALUE(E2)",
    ];

    expect(expenseFromLegacyPaymentRow(row, userTypeToUserId).memo).toBe(
      "lunch",
    );
  });

  it("throws when a legacy userType cannot be converted to an internal user id", () => {
    const row: LegacyPaymentRow = [
      "exp_1",
      "9",
      "food",
      "1000",
      "2026/06/03",
      "",
      "9",
      "9",
      "2026/06/03 10:00:00",
      "2026/06/03 10:00:00",
      "=DATEVALUE(E2)",
    ];

    expect(() => expenseFromLegacyPaymentRow(row, userTypeToUserId)).toThrow(
      "Unknown userType: 9",
    );
  });

  it.each(["1000abc", "12.9", ""])(
    "throws when a legacy price is not a non-negative integer: %s",
    (price) => {
      const row: LegacyPaymentRow = [
        "exp_1",
        "1",
        "food",
        price,
        "2026/06/03",
        "",
        "1",
        "1",
        "2026/06/03 10:00:00",
        "2026/06/03 10:00:00",
        "=DATEVALUE(E2)",
      ];

      expect(() => expenseFromLegacyPaymentRow(row, userTypeToUserId)).toThrow(
        `Invalid legacy payment price: ${price}`,
      );
    },
  );

  it("throws when a legacy payment date includes a timestamp", () => {
    const row: LegacyPaymentRow = [
      "exp_1",
      "1",
      "food",
      "1000",
      "2026/06/03 10:00:00",
      "",
      "1",
      "1",
      "2026/06/03 10:00:00",
      "2026/06/03 10:00:00",
      "=DATEVALUE(E2)",
    ];

    expect(() => expenseFromLegacyPaymentRow(row, userTypeToUserId)).toThrow(
      "Invalid legacy payment date: 2026/06/03 10:00:00",
    );
  });

  it("maps an Expense to a legacy payments compatible row", () => {
    const expense: Expense = {
      id: "exp_1",
      userId: "user_a",
      date: "2026-06-03",
      price: 1000,
      category: "food",
      memo: "lunch",
      version: 1,
    };

    expect(
      expenseToLegacyPaymentRow({
        expense,
        userIdToUserType,
        rowNumber: 2,
        timestamp: "2026/06/03 10:00:00",
      }),
    ).toEqual([
      "exp_1",
      "1",
      "food",
      "1000",
      "2026/06/03",
      "lunch",
      "1",
      "1",
      "2026/06/03 10:00:00",
      "2026/06/03 10:00:00",
      "=DATEVALUE(E2)",
    ]);
  });

  it("throws when an Expense user id cannot be converted to legacy userType", () => {
    const expense: Expense = {
      id: "exp_1",
      userId: "unknown_user",
      date: "2026-06-03",
      price: 1000,
      category: "food",
      memo: null,
      version: 1,
    };

    expect(() =>
      expenseToLegacyPaymentRow({
        expense,
        userIdToUserType,
        rowNumber: 2,
        timestamp: "2026/06/03 10:00:00",
      }),
    ).toThrow("Unknown userId: unknown_user");
  });

  it("throws when an Expense date is not an ISO date", () => {
    const expense: Expense = {
      id: "exp_1",
      userId: "user_a",
      date: "2026-06-03T00:00:00Z",
      price: 1000,
      category: "food",
      memo: null,
      version: 1,
    };

    expect(() =>
      expenseToLegacyPaymentRow({
        expense,
        userIdToUserType,
        rowNumber: 2,
        timestamp: "2026/06/03 10:00:00",
      }),
    ).toThrow("Invalid ISO expense date: 2026-06-03T00:00:00Z");
  });
});
