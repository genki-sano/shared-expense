import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readText(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("jobs Cloudflare deployment configuration", () => {
  it("configures the monthly settlement reminder Cron trigger", () => {
    const wranglerConfig = readText("wrangler.jsonc");

    expect(wranglerConfig).toContain('"name": "shared-expense-jobs"');
    expect(wranglerConfig).toContain('"main": "src/index.ts"');
    expect(wranglerConfig).toContain('"compatibility_date": "2026-07-29"');
    expect(wranglerConfig).toContain('"crons": ["0 10 5 * *"]');
  });

  it("exposes Wrangler scripts for local scheduled testing and deployment", () => {
    const packageJson = readText("package.json");

    expect(packageJson).toContain('"dev": "wrangler dev --test-scheduled"');
    expect(packageJson).toContain('"dry-run": "wrangler deploy --dry-run"');
    expect(packageJson).toContain('"deploy": "wrangler deploy"');
    expect(packageJson).toContain('"tail": "wrangler tail"');
  });
});
