import type { Expense } from "@shared-expense/shared";

export type LegacyPaymentRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export type UserTypeToUserId = (userType: string) => string | null;
export type UserIdToUserType = (userId: string) => string | null;

export function expenseFromLegacyPaymentRow(
  row: LegacyPaymentRow,
  userTypeToUserId: UserTypeToUserId,
): Expense {
  const [id, userType, category, price, date, memo] = row;
  const userId = userTypeToUserId(userType);

  if (userId === null) {
    throw new Error(`Unknown userType: ${userType}`);
  }

  return {
    id,
    userId,
    date: legacyDateToIsoDate(date),
    price: legacyPriceToNumber(price),
    category,
    memo: memo === "" ? null : memo,
    version: 1,
  };
}

export function expenseToLegacyPaymentRow(input: {
  expense: Expense;
  userIdToUserType: UserIdToUserType;
  rowNumber: number;
  timestamp: string;
}): LegacyPaymentRow {
  const { expense, rowNumber, timestamp, userIdToUserType } = input;
  const userType = userIdToUserType(expense.userId);

  if (userType === null) {
    throw new Error(`Unknown userId: ${expense.userId}`);
  }

  return [
    expense.id,
    userType,
    expense.category,
    String(expense.price),
    isoDateToLegacyDate(expense.date),
    expense.memo ?? "",
    userType,
    userType,
    timestamp,
    timestamp,
    `=DATEVALUE(E${rowNumber})`,
  ];
}

function legacyDateToIsoDate(date: string): string {
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date)) {
    throw new Error(`Invalid legacy payment date: ${date}`);
  }

  return date.replaceAll("/", "-");
}

function isoDateToLegacyDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid ISO expense date: ${date}`);
  }

  return date.replaceAll("-", "/");
}

function legacyPriceToNumber(price: string): number {
  if (!/^\d+$/.test(price)) {
    throw new Error(`Invalid legacy payment price: ${price}`);
  }

  const parsedPrice = Number(price);

  if (!Number.isSafeInteger(parsedPrice)) {
    throw new Error(`Invalid legacy payment price: ${price}`);
  }

  return parsedPrice;
}
