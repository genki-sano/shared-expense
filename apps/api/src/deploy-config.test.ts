import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readText(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("api Cloudflare deployment configuration", () => {
  it("configures the API Worker entrypoint", () => {
    const wranglerConfig = readText("wrangler.jsonc");
    const parsedWranglerConfig = JSON.parse(wranglerConfig) as {
      name?: unknown;
      main?: unknown;
      compatibility_date?: unknown;
      vars?: Record<string, unknown>;
    };
    const indexSource = readText("src/index.ts");

    expect(parsedWranglerConfig.name).toBe("shared-expense-api");
    expect(parsedWranglerConfig.main).toBe("src/index.ts");
    expect(parsedWranglerConfig.compatibility_date).toBe("2026-07-29");
    expect(parsedWranglerConfig.vars).toMatchObject({
      API_ALLOWED_ORIGINS: "https://liff.line.me,https://shared-expense.pages.dev",
      LINE_NOTIFICATION_DETAIL_BASE_URL: "https://shared-expense.pages.dev",
    });
    expect(parsedWranglerConfig.vars).not.toHaveProperty("GOOGLE_SPREADSHEET_ID");
    expect(parsedWranglerConfig.vars).not.toHaveProperty("LINE_LOGIN_CHANNEL_ID");
    expect(indexSource).toContain("createAppFromEnv(env)");
  });

  it("exposes only necessary API Worker scripts", () => {
    const packageJson = readText("package.json");
    const parsedPackageJson = JSON.parse(packageJson) as {
      scripts?: Record<string, unknown>;
    };
    const rootPackageJson = readFileSync(
      new URL("../../../package.json", import.meta.url),
      "utf8",
    );

    expect(parsedPackageJson.scripts).toEqual({
      dev: "tsx src/dev.ts",
      build: "tsc -p tsconfig.json",
      typecheck: "tsc -p tsconfig.json --noEmit",
      deploy: "wrangler deploy",
      "dry-run": "wrangler deploy --dry-run",
    });
    expect(rootPackageJson).toContain(
      '"build:api": "pnpm --filter @shared-expense/api build"',
    );
    expect(rootPackageJson).toContain(
      '"deploy:api": "pnpm --filter @shared-expense/api run deploy"',
    );
  });
});
