import type { Expense } from "@shared-expense/shared";
import {
  expenseFromLegacyPaymentRow,
  expenseToLegacyPaymentRow,
  type LegacyPaymentRow,
  type UserIdToUserType,
  type UserTypeToUserId,
} from "./expense-row";

const PAYMENTS_RANGE = "payments!A2:L";

export type GoogleSheetsValuesClient = {
  getValues(input: {
    spreadsheetId: string;
    range: string;
  }): Promise<{ values?: unknown[][] }>;
  appendValues?(input: {
    spreadsheetId: string;
    range: string;
    values: unknown[][];
  }): Promise<void>;
  updateValues?(input: {
    spreadsheetId: string;
    range: string;
    values: unknown[][];
  }): Promise<void>;
  clearValues?(input: { spreadsheetId: string; range: string }): Promise<void>;
};

export type SpreadsheetExpenseRepositoryInput = {
  spreadsheetId: string;
  valuesClient: GoogleSheetsValuesClient;
  userTypeToUserId: UserTypeToUserId;
  userIdToUserType?: UserIdToUserType;
  now?: () => Date;
};

export type ListSpreadsheetExpensesInput = {
  month: string;
};

export type CreateSpreadsheetExpenseInput = {
  actor: { id: string };
  date: string;
  price: number;
  category: string;
  memo: string | null;
};

export type UpdateSpreadsheetExpenseInput = {
  id: string;
  version: number;
  actor: { id: string };
  patch: {
    date?: string;
    price?: number;
    category?: string;
    memo?: string | null;
  };
};

export type DeleteSpreadsheetExpenseInput = {
  id: string;
  actor?: { id: string };
};

export class SpreadsheetExpenseRepository {
  readonly #spreadsheetId: string;
  readonly #valuesClient: GoogleSheetsValuesClient;
  readonly #userTypeToUserId: UserTypeToUserId;
  readonly #userIdToUserType: UserIdToUserType | undefined;
  readonly #now: () => Date;

  constructor(input: SpreadsheetExpenseRepositoryInput) {
    this.#spreadsheetId = input.spreadsheetId;
    this.#valuesClient = input.valuesClient;
    this.#userTypeToUserId = input.userTypeToUserId;
    this.#userIdToUserType = input.userIdToUserType;
    this.#now = input.now ?? (() => new Date());
  }

  async listByMonth(input: ListSpreadsheetExpensesInput): Promise<Expense[]> {
    const userNamesByType = await this.#userNamesByType();
    const response = await this.#valuesClient.getValues({
      spreadsheetId: this.#spreadsheetId,
      range: PAYMENTS_RANGE,
    });

    return (response.values ?? [])
      .map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter((item) => item.row.length > 0)
      .map((item) => ({
        ...item,
        deletedAt: deletedAtFromPaymentRow(item.row),
      }))
      .filter((item) => item.deletedAt === "")
      .map((item) => this.#expenseFromRow(item.row, item.rowNumber, userNamesByType))
      .filter((expense) => expense.date.startsWith(`${input.month}-`))
      .sort((left, right) => {
        const dateOrder = right.date.localeCompare(left.date);
        if (dateOrder !== 0) {
          return dateOrder;
        }

        return right.id.localeCompare(left.id);
      });
  }

  async create(input: CreateSpreadsheetExpenseInput): Promise<Expense> {
    const userNamesByType = await this.#userNamesByType();
    const payments = await this.#paymentRows();
    const id = nextPaymentId(payments.rows);
    const rowNumber = payments.rows.length + 2;
    const expense: Expense = {
      id,
      userId: input.actor.id,
      date: input.date,
      price: input.price,
      category: input.category,
      memo: input.memo,
      version: 1,
    };
    const row = this.#legacyRowForExpense({
      expense,
      rowNumber,
      timestamp: formatTimestamp(this.#now()),
    });

    await this.#appendValues({
      spreadsheetId: this.#spreadsheetId,
      range: "payments!A2:K",
      values: [row],
    });

    return this.#withUserName(expense, row[1], userNamesByType);
  }

  async update(input: UpdateSpreadsheetExpenseInput): Promise<Expense> {
    if (input.version !== 1) {
      throw new Error(`Expense version conflict: ${input.id}`);
    }

    const userNamesByType = await this.#userNamesByType();
    const payments = await this.#paymentRows();
    const match = payments.rows.find((row) => row.deletedAt === "" && row.row[0] === input.id);

    if (match === undefined) {
      throw new Error(`Expense not found: ${input.id}`);
    }

    const current = expenseFromLegacyPaymentRow(match.row, this.#userTypeToUserId);
    const nextExpense: Expense = {
      ...current,
      date: input.patch.date ?? current.date,
      price: input.patch.price ?? current.price,
      category: input.patch.category ?? current.category,
      memo: "memo" in input.patch ? input.patch.memo ?? null : current.memo,
    };
    const updatedRow = this.#legacyRowForExpense({
      expense: nextExpense,
      rowNumber: match.rowNumber,
      timestamp: match.row[8],
    });
    updatedRow[7] = this.#userTypeFor(input.actor.id);
    updatedRow[9] = formatTimestamp(this.#now());

    await this.#updateValues({
      spreadsheetId: this.#spreadsheetId,
      range: `payments!A${match.rowNumber}:K${match.rowNumber}`,
      values: [updatedRow],
    });

    return this.#withUserName(nextExpense, updatedRow[1], userNamesByType);
  }

  async delete(input: DeleteSpreadsheetExpenseInput): Promise<void> {
    const payments = await this.#paymentRows();
    const match = payments.rows.find((row) => row.deletedAt === "" && row.row[0] === input.id);

    if (match === undefined) {
      throw new Error(`Expense not found: ${input.id}`);
    }

    await this.#updateValues({
      spreadsheetId: this.#spreadsheetId,
      range: `payments!L${match.rowNumber}:L${match.rowNumber}`,
      values: [[formatTimestamp(this.#now())]],
    });
  }

  async #userNamesByType(): Promise<Map<string, string>> {
    const response = await this.#valuesClient.getValues({
      spreadsheetId: this.#spreadsheetId,
      range: "users!A2:F",
    });
    const userNamesByType = new Map<string, string>();

    for (const row of response.values ?? []) {
      const userType = row[0];
      const userName = row[1];

      if (userType === undefined || userName === undefined) {
        continue;
      }

      const normalizedUserType = String(userType).trim();
      const normalizedUserName = String(userName).trim();

      if (normalizedUserType !== "" && normalizedUserName !== "") {
        userNamesByType.set(normalizedUserType, normalizedUserName);
      }
    }

    return userNamesByType;
  }

  #expenseFromRow(
    row: unknown[],
    sheetRowNumber: number,
    userNamesByType: Map<string, string>,
  ): Expense {
    try {
      const legacyRow = toLegacyPaymentRow(row);
      const expense = expenseFromLegacyPaymentRow(legacyRow, this.#userTypeToUserId);
      const userName = userNamesByType.get(legacyRow[1]);

      return userName === undefined ? expense : { ...expense, userName };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid payments row at sheet row ${sheetRowNumber}: ${message}`);
    }
  }

  async #paymentRows(): Promise<{
    rows: Array<{ row: LegacyPaymentRow; rowNumber: number; deletedAt: string }>;
  }> {
    const response = await this.#valuesClient.getValues({
      spreadsheetId: this.#spreadsheetId,
      range: PAYMENTS_RANGE,
    });

    return {
      rows: (response.values ?? [])
        .map((row, index) => ({ row, rowNumber: index + 2 }))
        .filter((item) => item.row.length > 0)
        .map((item) => ({
          row: toLegacyPaymentRow(item.row),
          rowNumber: item.rowNumber,
          deletedAt: deletedAtFromPaymentRow(item.row),
        })),
    };
  }

  #legacyRowForExpense(input: {
    expense: Expense;
    rowNumber: number;
    timestamp: string;
  }): LegacyPaymentRow {
    return expenseToLegacyPaymentRow({
      expense: input.expense,
      rowNumber: input.rowNumber,
      timestamp: input.timestamp,
      userIdToUserType: (userId) => this.#userTypeFor(userId),
    });
  }

  #userTypeFor(userId: string): string {
    if (this.#userIdToUserType === undefined) {
      throw new Error("userIdToUserType is not configured");
    }

    const userType = this.#userIdToUserType(userId);
    if (userType === null) {
      throw new Error(`Unknown userId: ${userId}`);
    }

    return userType;
  }

  #withUserName(
    expense: Expense,
    userType: string,
    userNamesByType: Map<string, string>,
  ): Expense {
    const userName = userNamesByType.get(userType);
    return userName === undefined ? expense : { ...expense, userName };
  }

  async #appendValues(input: {
    spreadsheetId: string;
    range: string;
    values: unknown[][];
  }): Promise<void> {
    if (this.#valuesClient.appendValues === undefined) {
      throw new Error("Google Sheets appendValues is not configured");
    }

    await this.#valuesClient.appendValues(input);
  }

  async #updateValues(input: {
    spreadsheetId: string;
    range: string;
    values: unknown[][];
  }): Promise<void> {
    if (this.#valuesClient.updateValues === undefined) {
      throw new Error("Google Sheets updateValues is not configured");
    }

    await this.#valuesClient.updateValues(input);
  }

}

function toLegacyPaymentRow(row: unknown[]): LegacyPaymentRow {
  if (row.length < 11) {
    throw new Error(`Expected 11 columns but received ${row.length}`);
  }

  return row.slice(0, 11).map((value) => String(value)) as LegacyPaymentRow;
}

function deletedAtFromPaymentRow(row: unknown[]): string {
  return row[11] === undefined ? "" : String(row[11]).trim();
}

function nextPaymentId(rows: Array<{ row: LegacyPaymentRow }>): string {
  const maxId = rows.reduce((max, item) => {
    const id = Number(item.row[0]);
    return Number.isSafeInteger(id) && id > max ? id : max;
  }, 0);

  return String(maxId + 1);
}

function formatTimestamp(date: Date): string {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
