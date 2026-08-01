import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readText(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("jobs Cloudflare deployment configuration", () => {
  it("configures the monthly settlement reminder Cron trigger", () => {
    const wranglerConfig = JSON.parse(readText("wrangler.jsonc")) as {
      name?: unknown;
      main?: unknown;
      compatibility_date?: unknown;
      triggers?: { crons?: unknown };
      observability?: Record<string, unknown>;
    };

    expect(wranglerConfig.name).toBe("shared-expense-jobs");
    expect(wranglerConfig.main).toBe("src/index.ts");
    expect(wranglerConfig.compatibility_date).toBe("2026-07-29");
    expect(wranglerConfig.triggers?.crons).toEqual(["0 10 5 * *"]);
    expect(wranglerConfig.observability).toMatchObject({
      enabled: true,
      head_sampling_rate: 1,
    });
  });

  it("exposes only necessary Jobs Worker scripts", () => {
    const packageJson = JSON.parse(readText("package.json")) as {
      scripts?: Record<string, unknown>;
    };

    expect(packageJson.scripts).toEqual({
      dev: "wrangler dev --test-scheduled",
      build: "tsc -p tsconfig.json",
      typecheck: "tsc -p tsconfig.json --noEmit",
      deploy: "wrangler deploy",
      "dry-run": "wrangler deploy --dry-run",
    });
  });

  it("uses pnpm run to avoid the built-in pnpm deploy command", () => {
    const rootPackageJson = readFileSync(
      new URL("../../../package.json", import.meta.url),
      "utf8",
    );

    expect(rootPackageJson).toContain(
      '"build:jobs": "pnpm --filter @shared-expense/jobs build"',
    );
    expect(rootPackageJson).toContain(
      '"deploy:jobs": "pnpm --filter @shared-expense/jobs run deploy"',
    );
  });
});
