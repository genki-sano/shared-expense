import type { Expense } from "@shared-expense/shared";
import {
  expenseFromLegacyPaymentRow,
  type LegacyPaymentRow,
  type UserTypeToUserId,
} from "./expense-row";

export type GoogleSheetsValuesClient = {
  getValues(input: {
    spreadsheetId: string;
    range: string;
  }): Promise<{ values?: unknown[][] }>;
};

export type SpreadsheetExpenseRepositoryInput = {
  spreadsheetId: string;
  valuesClient: GoogleSheetsValuesClient;
  userTypeToUserId: UserTypeToUserId;
};

export type ListSpreadsheetExpensesInput = {
  month: string;
};

export class SpreadsheetExpenseRepository {
  readonly #spreadsheetId: string;
  readonly #valuesClient: GoogleSheetsValuesClient;
  readonly #userTypeToUserId: UserTypeToUserId;

  constructor(input: SpreadsheetExpenseRepositoryInput) {
    this.#spreadsheetId = input.spreadsheetId;
    this.#valuesClient = input.valuesClient;
    this.#userTypeToUserId = input.userTypeToUserId;
  }

  async listByMonth(input: ListSpreadsheetExpensesInput): Promise<Expense[]> {
    const userNamesByType = await this.#userNamesByType();
    const response = await this.#valuesClient.getValues({
      spreadsheetId: this.#spreadsheetId,
      range: "payments!A2:K",
    });

    return (response.values ?? [])
      .map((row, index) => this.#expenseFromRow(row, index + 2, userNamesByType))
      .filter((expense) => expense.date.startsWith(`${input.month}-`))
      .sort((left, right) => {
        const dateOrder = right.date.localeCompare(left.date);
        if (dateOrder !== 0) {
          return dateOrder;
        }

        return right.id.localeCompare(left.id);
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
}

function toLegacyPaymentRow(row: unknown[]): LegacyPaymentRow {
  if (row.length < 11) {
    throw new Error(`Expected 11 columns but received ${row.length}`);
  }

  return row.slice(0, 11).map((value) => String(value)) as LegacyPaymentRow;
}
