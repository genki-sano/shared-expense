import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const rootDir = process.cwd();

function readPackageJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(rootDir, path), "utf8")) as Record<
    string,
    unknown
  >;
}

describe("web dev configuration", () => {
  test("root pnpm dev delegates to the web app", () => {
    const rootPackage = readPackageJson("package.json");

    expect(rootPackage.scripts).toMatchObject({
      dev: "pnpm --filter @shared-expense/web dev",
    });
  });

  test("web app exposes Next.js development and verification scripts", () => {
    const webPackage = readPackageJson("apps/web/package.json");

    expect(webPackage).toMatchObject({
      name: "@shared-expense/web",
      scripts: {
        dev: "next dev",
        build: "next build",
        typecheck: "tsc -p tsconfig.json --noEmit",
      },
    });
    expect(existsSync(join(rootDir, "apps/web/src/app/page.tsx"))).toBe(true);
  });
});
