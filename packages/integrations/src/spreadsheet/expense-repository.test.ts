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

const userIdToUserType = (userId: string): string | null => {
  if (userId === "user_a") {
    return "man";
  }

  if (userId === "user_b") {
    return "woman";
  }

  return null;
};

describe("SpreadsheetExpenseRepository", () => {
  it("reads household users from the users sheet", async () => {
    const repository = new SpreadsheetExpenseRepository({
      spreadsheetId: "spreadsheet_1",
      valuesClient: {
        getValues: async (input) => {
          expect(input.range).toBe("users!A2:F");
          return {
            values: [
              ["1", "ひとみ", "line_woman", "line_woman", "2021/03/03", "2021/03/03"],
              ["2", "げんき", "line_man", "line_man", "2021/03/03", "2021/03/03"],
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

    await expect(repository.listHouseholdUsers()).resolves.toEqual([
      {
        id: "woman",
        lineUserId: "line_woman",
        displayName: "ひとみ",
        notifyEnabled: true,
      },
      {
        id: "man",
        lineUserId: "line_man",
        displayName: "げんき",
        notifyEnabled: true,
      },
    ]);
  });

  it("reads legacy payments rows from payments!A2:L and returns requested month expenses newest first", async () => {
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
            [
              "exp_deleted",
              "man",
              "食費",
              "500",
              "2026/07/05",
              "削除済み",
              "man",
              "man",
              "2026/07/05 10:00:00",
              "2026/07/05 10:00:00",
              "45843",
              "2026/07/10 12:00:00",
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
    expect(ranges).toEqual(["spreadsheet_1:users!A2:F", "spreadsheet_1:payments!A2:L"]);
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

  it("creates a legacy payment row for the actor", async () => {
    const appendedRows: unknown[][] = [];
    const repository = new SpreadsheetExpenseRepository({
      spreadsheetId: "spreadsheet_1",
      valuesClient: {
        getValues: async (input) => {
          if (input.range === "users!A2:F") {
            return { values: [["man", "げんき"]] };
          }

          return {
            values: [
              [
                "10",
                "woman",
                "食費",
                "1000",
                "2026/07/01",
                "",
                "woman",
                "woman",
                "2026/07/01 10:00:00",
                "2026/07/01 10:00:00",
                "45839",
              ],
            ],
          };
        },
        appendValues: async (input) => {
          appendedRows.push(input.values[0] ?? []);
        },
        updateValues: async () => {
          throw new Error("update should not be called");
        },
        clearValues: async () => {
          throw new Error("clear should not be called");
        },
      },
      userTypeToUserId,
      userIdToUserType,
      now: () => new Date("2026-07-26T12:34:56+09:00"),
    });

    await expect(
      repository.create({
        actor: { id: "user_a" },
        date: "2026-07-26",
        price: 1200,
        category: "食費",
        memo: "昼食",
      }),
    ).resolves.toEqual({
      id: "11",
      userId: "user_a",
      userName: "げんき",
      date: "2026-07-26",
      price: 1200,
      category: "食費",
      memo: "昼食",
      version: 1,
    });
    expect(appendedRows).toEqual([
      [
        "11",
        "man",
        "食費",
        "1200",
        "2026/07/26",
        "昼食",
        "man",
        "man",
        "2026/07/26 12:34:56",
        "2026/07/26 12:34:56",
        "=DATEVALUE(E3)",
      ],
    ]);
  });

  it("updates a matching legacy payment row", async () => {
    const updates: Array<{ range: string; values: unknown[][] }> = [];
    const repository = new SpreadsheetExpenseRepository({
      spreadsheetId: "spreadsheet_1",
      valuesClient: {
        getValues: async (input) => {
          if (input.range === "users!A2:F") {
            return { values: [["man", "げんき"]] };
          }

          return {
            values: [
              [
                "10",
                "man",
                "食費",
                "1000",
                "2026/07/01",
                "朝食",
                "man",
                "man",
                "2026/07/01 10:00:00",
                "2026/07/01 10:00:00",
                "45839",
              ],
            ],
          };
        },
        appendValues: async () => {
          throw new Error("append should not be called");
        },
        updateValues: async (input) => {
          updates.push({ range: input.range, values: input.values });
        },
        clearValues: async () => {
          throw new Error("clear should not be called");
        },
      },
      userTypeToUserId,
      userIdToUserType,
      now: () => new Date("2026-07-26T12:34:56+09:00"),
    });

    await expect(
      repository.update({
        id: "10",
        version: 1,
        actor: { id: "user_a" },
        patch: { price: 1300, memo: null },
      }),
    ).resolves.toMatchObject({
      id: "10",
      userId: "user_a",
      price: 1300,
      memo: null,
      userName: "げんき",
    });
    expect(updates).toEqual([
      {
        range: "payments!A2:K2",
        values: [
          [
            "10",
            "man",
            "食費",
            "1300",
            "2026/07/01",
            "",
            "man",
            "man",
            "2026/07/01 10:00:00",
            "2026/07/26 12:34:56",
            "=DATEVALUE(E2)",
          ],
        ],
      },
    ]);
  });

  it("marks a matching legacy payment row as deleted", async () => {
    const updates: Array<{ range: string; values: unknown[][] }> = [];
    const repository = new SpreadsheetExpenseRepository({
      spreadsheetId: "spreadsheet_1",
      valuesClient: {
        getValues: async (input) => {
          if (input.range === "users!A2:F") {
            return {};
          }

          return {
            values: [
              [
                "10",
                "man",
                "食費",
                "1000",
                "2026/07/01",
                "朝食",
                "man",
                "man",
                "2026/07/01 10:00:00",
                "2026/07/01 10:00:00",
                "45839",
              ],
            ],
          };
        },
        appendValues: async () => {
          throw new Error("append should not be called");
        },
        updateValues: async (input) => {
          updates.push({ range: input.range, values: input.values });
        },
        clearValues: async (input) => {
          throw new Error(`clear should not be called: ${input.range}`);
        },
      },
      userTypeToUserId,
      userIdToUserType,
      now: () => new Date("2026-07-26T12:34:56+09:00"),
    });

    await expect(repository.delete({ id: "10", actor: { id: "user_a" } })).resolves.toBeUndefined();
    expect(updates).toEqual([
      {
        range: "payments!L2:L2",
        values: [["2026/07/26 12:34:56"]],
      },
    ]);
  });

  it("restores a deleted legacy payment row by clearing deleted_at", async () => {
    const updates: Array<{ range: string; values: unknown[][] }> = [];
    const repository = new SpreadsheetExpenseRepository({
      spreadsheetId: "spreadsheet_1",
      valuesClient: {
        getValues: async (input) => {
          if (input.range === "users!A2:F") {
            return { values: [["man", "げんき"]] };
          }

          return {
            values: [
              [
                "10",
                "man",
                "食費",
                "1000",
                "2026/07/01",
                "朝食",
                "man",
                "man",
                "2026/07/01 10:00:00",
                "2026/07/01 10:00:00",
                "45839",
                "2026/07/26 12:34:56",
              ],
            ],
          };
        },
        appendValues: async () => {
          throw new Error("append should not be called");
        },
        updateValues: async (input) => {
          updates.push({ range: input.range, values: input.values });
        },
        clearValues: async (input) => {
          throw new Error(`clear should not be called: ${input.range}`);
        },
      },
      userTypeToUserId,
      userIdToUserType,
    });

    await expect(repository.restore({ id: "10", actor: { id: "user_a" } })).resolves.toEqual({
      id: "10",
      userId: "user_a",
      userName: "げんき",
      date: "2026-07-01",
      price: 1000,
      category: "食費",
      memo: "朝食",
      version: 1,
    });
    expect(updates).toEqual([
      {
        range: "payments!L2:L2",
        values: [[""]],
      },
    ]);
  });
});
