import type { GoogleSheetsValuesClient } from "./expense-repository";
import type { GoogleAccessTokenProvider } from "../google/service-account-auth-provider";

export type FetchGoogleSheetsValuesClientInput = {
  accessTokenProvider: GoogleAccessTokenProvider;
  fetcher?: typeof fetch;
};

export class FetchGoogleSheetsValuesClient implements GoogleSheetsValuesClient {
  readonly #accessTokenProvider: GoogleAccessTokenProvider;
  readonly #fetcher: typeof fetch;

  constructor(input: FetchGoogleSheetsValuesClientInput) {
    this.#accessTokenProvider = input.accessTokenProvider;
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
          Authorization: `Bearer ${await this.#accessTokenProvider.getAccessToken()}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to read Google Sheets values: ${response.status}`);
    }

    return (await response.json()) as { values?: unknown[][] };
  }
}
