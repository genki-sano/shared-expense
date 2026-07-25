import { describe, expect, it } from "vitest";
import { parseLocalEnvFile } from "./dev-env";

describe("parseLocalEnvFile", () => {
  it("reads quoted and unquoted values from a local env file", () => {
    expect(
      parseLocalEnvFile(`
        # comment
        GOOGLE_SPREADSHEET_ID=spreadsheet_1
        GOOGLE_SERVICE_ACCOUNT_EMAIL="sheets-reader@example.iam.gserviceaccount.com"
        GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n"
        NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
      `),
    ).toEqual({
      GOOGLE_SPREADSHEET_ID: "spreadsheet_1",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "sheets-reader@example.iam.gserviceaccount.com",
      GOOGLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:8787",
    });
  });
});
