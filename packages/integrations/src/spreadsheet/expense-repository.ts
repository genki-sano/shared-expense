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
    const response = await this.#valuesClient.getValues({
      spreadsheetId: this.#spreadsheetId,
      range: "payments!A2:K",
    });

    return (response.values ?? [])
      .map((row, index) => this.#expenseFromRow(row, index + 2))
      .filter((expense) => expense.date.startsWith(`${input.month}-`))
      .sort((left, right) => {
        const dateOrder = right.date.localeCompare(left.date);
        if (dateOrder !== 0) {
          return dateOrder;
        }

        return right.id.localeCompare(left.id);
      });
  }

  #expenseFromRow(row: unknown[], sheetRowNumber: number): Expense {
    try {
      return expenseFromLegacyPaymentRow(toLegacyPaymentRow(row), this.#userTypeToUserId);
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
