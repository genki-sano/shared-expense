import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readText(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("api Cloudflare deployment configuration", () => {
  it("configures the API Worker entrypoint", () => {
    const wranglerConfig = readText("wrangler.jsonc");
    const indexSource = readText("src/index.ts");

    expect(wranglerConfig).toContain('"name": "shared-expense-api"');
    expect(wranglerConfig).toContain('"main": "src/index.ts"');
    expect(wranglerConfig).toContain('"compatibility_date": "2026-07-29"');
    expect(indexSource).toContain("createAppFromEnv(env)");
  });

  it("exposes Wrangler scripts for API Worker deployment", () => {
    const packageJson = readText("package.json");
    const rootPackageJson = readFileSync(
      new URL("../../../package.json", import.meta.url),
      "utf8",
    );

    expect(packageJson).toContain('"dev:worker": "wrangler dev"');
    expect(packageJson).toContain('"dry-run": "wrangler deploy --dry-run"');
    expect(packageJson).toContain('"deploy": "wrangler deploy"');
    expect(packageJson).toContain('"tail": "wrangler tail"');
    expect(rootPackageJson).toContain(
      '"deploy:api": "pnpm --filter @shared-expense/api run deploy"',
    );
  });
});
