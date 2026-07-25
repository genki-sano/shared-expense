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

function readText(path: string): string {
  return readFileSync(join(rootDir, path), "utf8");
}

describe("web dev configuration", () => {
  test("root pnpm dev starts the API and web app together", () => {
    const rootPackage = readPackageJson("package.json");

    expect(rootPackage.scripts).toMatchObject({
      dev: "NEXT_PUBLIC_API_BASE_URL=http://localhost:8787 NEXT_PUBLIC_DEV_LIFF_ID_TOKEN=local-dev pnpm --parallel --filter @shared-expense/api --filter @shared-expense/web dev",
    });
  });

  test("API app exposes a local development server script", () => {
    const apiPackage = readPackageJson("apps/api/package.json");

    expect(apiPackage).toMatchObject({
      name: "@shared-expense/api",
      scripts: {
        dev: "tsx src/dev.ts",
      },
    });
    expect(existsSync(join(rootDir, "apps/api/src/dev.ts"))).toBe(true);
  });

  test("env template points the web preview at the local API", () => {
    const envExample = readText(".env.example");

    expect(envExample).toContain("NEXT_PUBLIC_API_BASE_URL=http://localhost:8787");
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

  test("mobile preview uses a compact dashboard summary instead of stacked metric cards", () => {
    const pageSource = readText("apps/web/src/app/page.tsx");

    expect(pageSource).toContain('className="summaryPanel"');
    expect(pageSource).toContain('className="summaryDetails"');
    expect(pageSource).not.toContain('className="metric"');
  });

  test("web app pins light rendering colors to avoid dark mode text inversion", () => {
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(cssSource).toContain("color-scheme: light");
    expect(cssSource).toContain(".summaryPanel");
    expect(cssSource).toContain("background: #12211d");
    expect(cssSource).toContain("color: #ffffff");
  });
});
