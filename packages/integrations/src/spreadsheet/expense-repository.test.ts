import { describe, expect, it } from "vitest";
import { SpreadsheetExpenseRepository } from "./expense-repository";
import type { GoogleSheetsValuesClient } from "./expense-repository";

const userTypeToUserId = (userType: string): string | null => {
  if (userType === "man") {
    return "user_a";
  }

  if (userType === "woman") {
    return "user_b";
  }

  return null;
};

describe("SpreadsheetExpenseRepository", () => {
  it("reads legacy payments rows from payments!A2:K and returns requested month expenses newest first", async () => {
    const ranges: string[] = [];
    const client: GoogleSheetsValuesClient = {
      getValues: async (input) => {
        ranges.push(`${input.spreadsheetId}:${input.range}`);
        if (input.range === "users!A2:F") {
          return {};
        }

        return {
          values: [
            [
              "exp_old",
              "man",
              "食費",
              "900",
              "2026/06/30",
              "先月",
              "man",
              "man",
              "2026/06/30 10:00:00",
              "2026/06/30 10:00:00",
              "45838",
            ],
            [
              "exp_later",
              "woman",
              "食費",
              "6420",
              "2026/07/18",
              "スーパー",
              "woman",
              "woman",
              "2026/07/18 10:00:00",
              "2026/07/18 10:00:00",
              "45856",
            ],
            [
              "exp_earlier",
              "man",
              "生活用品",
              "3280",
              "2026/07/06",
              "",
              "man",
              "man",
              "2026/07/06 10:00:00",
              "2026/07/06 10:00:00",
              "45844",
            ],
          ],
        };
      },
    };

    const repository = new SpreadsheetExpenseRepository({
      spreadsheetId: "spreadsheet_1",
      valuesClient: client,
      userTypeToUserId,
    });

    await expect(repository.listByMonth({ month: "2026-07" })).resolves.toEqual([
      {
        id: "exp_later",
        userId: "user_b",
        date: "2026-07-18",
        price: 6420,
        category: "食費",
        memo: "スーパー",
        version: 1,
      },
      {
        id: "exp_earlier",
        userId: "user_a",
        date: "2026-07-06",
        price: 3280,
        category: "生活用品",
        memo: null,
        version: 1,
      },
    ]);
    expect(ranges).toEqual(["spreadsheet_1:users!A2:F", "spreadsheet_1:payments!A2:K"]);
  });

  it("adds user names from the users sheet by legacy user type", async () => {
    const repository = new SpreadsheetExpenseRepository({
      spreadsheetId: "spreadsheet_1",
      valuesClient: {
        getValues: async (input) => {
          if (input.range === "users!A2:F") {
            return {
              values: [
                ["1", "ひとみ", "line_woman", "line_woman", "2021/03/03", "2021/03/03"],
                ["2", "げんき", "line_man", "line_man", "2021/03/03", "2021/03/03"],
              ],
            };
          }

          return {
            values: [
              [
                "exp_1",
                "1",
                "食費",
                "6420",
                "2026/07/18",
                "スーパー",
                "1",
                "1",
                "2026/07/18 10:00:00",
                "2026/07/18 10:00:00",
                "45856",
              ],
            ],
          };
        },
      },
      userTypeToUserId: (userType) => {
        if (userType === "1") {
          return "woman";
        }

        if (userType === "2") {
          return "man";
        }

        return null;
      },
    });

    await expect(repository.listByMonth({ month: "2026-07" })).resolves.toEqual([
      {
        id: "exp_1",
        userId: "woman",
        userName: "ひとみ",
        date: "2026-07-18",
        price: 6420,
        category: "食費",
        memo: "スーパー",
        version: 1,
      },
    ]);
  });

  it("treats missing values as an empty payments sheet", async () => {
    const repository = new SpreadsheetExpenseRepository({
      spreadsheetId: "spreadsheet_1",
      valuesClient: {
        getValues: async () => ({}),
      },
      userTypeToUserId,
    });

    await expect(repository.listByMonth({ month: "2026-07" })).resolves.toEqual([]);
  });

  it("wraps invalid legacy rows with row context", async () => {
    const repository = new SpreadsheetExpenseRepository({
      spreadsheetId: "spreadsheet_1",
      valuesClient: {
        getValues: async () => ({
          values: [
            [
              "exp_bad",
              "unknown",
              "食費",
              "1000",
              "2026/07/18",
              "",
              "unknown",
              "unknown",
              "2026/07/18 10:00:00",
              "2026/07/18 10:00:00",
              "45856",
            ],
          ],
        }),
      },
      userTypeToUserId,
    });

    await expect(repository.listByMonth({ month: "2026-07" })).rejects.toThrow(
      "Invalid payments row at sheet row 2: Unknown userType: unknown",
    );
  });
});
