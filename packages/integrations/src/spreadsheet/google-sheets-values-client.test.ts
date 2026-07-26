import { describe, expect, it } from "vitest";
import { FetchGoogleSheetsValuesClient } from "./google-sheets-values-client";

describe("FetchGoogleSheetsValuesClient", () => {
  it("calls Google Sheets values.get with encoded spreadsheet id, range, and bearer token", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = new FetchGoogleSheetsValuesClient({
      accessTokenProvider: {
        getAccessToken: async () => "access-token",
      },
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json({
          values: [["id", "1"]],
        });
      },
    });

    await expect(
      client.getValues({
        spreadsheetId: "spreadsheet/id",
        range: "payments!A2:K",
      }),
    ).resolves.toEqual({
      values: [["id", "1"]],
    });
    expect(calls).toEqual([
      {
        url: "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet%2Fid/values/payments!A2%3AK",
        init: {
          headers: {
            Authorization: "Bearer access-token",
          },
        },
      },
    ]);
  });

  it("throws when Google Sheets returns an error", async () => {
    const client = new FetchGoogleSheetsValuesClient({
      accessTokenProvider: {
        getAccessToken: async () => "access-token",
      },
      fetcher: async () => Response.json({ error: "denied" }, { status: 403 }),
    });

    await expect(
      client.getValues({
        spreadsheetId: "spreadsheet_1",
        range: "payments!A2:K",
      }),
    ).rejects.toThrow("Failed to read Google Sheets values: 403");
  });

  it("appends, updates, and clears Google Sheets values with bearer token", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = new FetchGoogleSheetsValuesClient({
      accessTokenProvider: {
        getAccessToken: async () => "access-token",
      },
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json({});
      },
    });

    await client.appendValues({
      spreadsheetId: "spreadsheet_1",
      range: "payments!A2:K",
      values: [["1"]],
    });
    await client.updateValues({
      spreadsheetId: "spreadsheet_1",
      range: "payments!A2:K2",
      values: [["2"]],
    });
    await client.clearValues({
      spreadsheetId: "spreadsheet_1",
      range: "payments!A2:K2",
    });

    expect(calls).toEqual([
      {
        url: "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/payments!A2%3AK:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",
        init: {
          method: "POST",
          headers: {
            Authorization: "Bearer access-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [["1"]] }),
        },
      },
      {
        url: "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/payments!A2%3AK2?valueInputOption=USER_ENTERED",
        init: {
          method: "PUT",
          headers: {
            Authorization: "Bearer access-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [["2"]] }),
        },
      },
      {
        url: "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_1/values/payments!A2%3AK2:clear",
        init: {
          method: "POST",
          headers: {
            Authorization: "Bearer access-token",
          },
        },
      },
    ]);
  });
});
