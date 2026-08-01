import type { GoogleSheetsValuesClient } from "./expense-repository";
import type { GoogleAccessTokenProvider } from "../google/service-account-auth-provider";
import { defaultFetcher } from "../fetcher";

export type FetchGoogleSheetsValuesClientInput = {
  accessTokenProvider: GoogleAccessTokenProvider;
  fetcher?: typeof fetch;
};

export class FetchGoogleSheetsValuesClient implements GoogleSheetsValuesClient {
  readonly #accessTokenProvider: GoogleAccessTokenProvider;
  readonly #fetcher: typeof fetch;

  constructor(input: FetchGoogleSheetsValuesClientInput) {
    this.#accessTokenProvider = input.accessTokenProvider;
    this.#fetcher = input.fetcher ?? defaultFetcher();
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

  async appendValues(input: {
    spreadsheetId: string;
    range: string;
    values: unknown[][];
  }): Promise<void> {
    await this.#writeValues({
      url: `${this.#valuesUrl(input)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      method: "POST",
      values: input.values,
      failureMessage: "Failed to append Google Sheets values",
    });
  }

  async updateValues(input: {
    spreadsheetId: string;
    range: string;
    values: unknown[][];
  }): Promise<void> {
    await this.#writeValues({
      url: `${this.#valuesUrl(input)}?valueInputOption=USER_ENTERED`,
      method: "PUT",
      values: input.values,
      failureMessage: "Failed to update Google Sheets values",
    });
  }

  async clearValues(input: { spreadsheetId: string; range: string }): Promise<void> {
    const response = await this.#fetcher(`${this.#valuesUrl(input)}:clear`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await this.#accessTokenProvider.getAccessToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to clear Google Sheets values: ${response.status}`);
    }
  }

  async #writeValues(input: {
    url: string;
    method: "POST" | "PUT";
    values: unknown[][];
    failureMessage: string;
  }): Promise<void> {
    const response = await this.#fetcher(input.url, {
      method: input.method,
      headers: {
        Authorization: `Bearer ${await this.#accessTokenProvider.getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: input.values }),
    });

    if (!response.ok) {
      throw new Error(`${input.failureMessage}: ${response.status}`);
    }
  }

  #valuesUrl(input: { spreadsheetId: string; range: string }): string {
    return `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      input.spreadsheetId,
    )}/values/${encodeURIComponent(input.range)}`;
  }
}
