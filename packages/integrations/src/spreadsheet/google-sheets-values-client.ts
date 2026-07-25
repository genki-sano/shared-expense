import type { GoogleSheetsValuesClient } from "./expense-repository";

export type FetchGoogleSheetsValuesClientInput = {
  accessToken: string;
  fetcher?: typeof fetch;
};

export class FetchGoogleSheetsValuesClient implements GoogleSheetsValuesClient {
  readonly #accessToken: string;
  readonly #fetcher: typeof fetch;

  constructor(input: FetchGoogleSheetsValuesClientInput) {
    this.#accessToken = input.accessToken;
    this.#fetcher = input.fetcher ?? fetch;
  }

  async getValues(input: {
    spreadsheetId: string;
    range: string;
  }): Promise<{ values?: unknown[][] }> {
    const response = await this.#fetcher(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        input.spreadsheetId,
      )}/values/${encodeURIComponent(input.range)}`,
      {
        headers: {
          Authorization: `Bearer ${this.#accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to read Google Sheets values: ${response.status}`);
    }

    return (await response.json()) as { values?: unknown[][] };
  }
}
