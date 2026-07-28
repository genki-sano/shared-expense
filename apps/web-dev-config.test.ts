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
      dev: "NEXT_PUBLIC_API_BASE_URL=http://localhost:8787 NEXT_PUBLIC_DEV_ID_TOKEN=local-dev pnpm --parallel --filter @shared-expense/api --filter @shared-expense/web dev",
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
    expect(envExample).toContain("NEXT_PUBLIC_LIFF_ID=");
    expect(envExample).toContain("LINE_LOGIN_CHANNEL_ID=");
    expect(envExample).toContain("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=");
    expect(envExample).toContain("LINE_NOTIFICATION_DETAIL_BASE_URL=");
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

  test("web app can initialize LIFF ID tokens for production auth", () => {
    const webPackage = readPackageJson("apps/web/package.json");
    const pageSource = readText("apps/web/src/app/page.tsx");
    const dashboardSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");
    const liffClientSource = readText("apps/web/src/features/expenses/liff-client.ts");

    expect(webPackage.dependencies).toMatchObject({
      "@line/liff": expect.any(String),
    });
    expect(pageSource).toContain("NEXT_PUBLIC_LIFF_ID");
    expect(pageSource).toContain("NEXT_PUBLIC_DEV_ID_TOKEN");
    expect(dashboardSource).toContain("getLiffIdToken(");
    expect(dashboardSource).toContain("fetchMonthlyExpenses({");
    expect(dashboardSource).toContain("fetchMonthlySettlement({");
    expect(liffClientSource).toContain('import("@line/liff")');
    expect(liffClientSource).toContain("liff.init({ liffId: input.liffId })");
    expect(liffClientSource).toContain("liff.isLoggedIn()");
    expect(liffClientSource).toContain("liff.login(");
    expect(liffClientSource).toContain("liff.getIDToken()");
  });

  test("mobile preview uses a compact dashboard summary instead of stacked metric cards", () => {
    const pageSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");
    const apiSource = readText("apps/web/src/features/expenses/api.ts");

    expect(pageSource).toContain('className="summaryPanel"');
    expect(pageSource).toContain('className="summaryDetails"');
    expect(pageSource).toContain("calculateMonthlySettlement(");
    expect(pageSource).not.toContain("numberFormatter.format(4270)");
    expect(apiSource).toContain('new URL("/api/settlements"');
    expect(pageSource).not.toContain('className="metric"');
  });

  test("expense dashboard exposes mobile month navigation", () => {
    const appSource = readText("apps/web/src/app/page.tsx");
    const dashboardSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(appSource).toContain("normalizeMonthParam(searchParams?.month");
    expect(appSource).toContain("currentMonthInJst()");
    expect(appSource).not.toContain('const month = "2026-07"');
    expect(dashboardSource).toContain('className="monthControls"');
    expect(dashboardSource).toContain('type="month"');
    expect(dashboardSource).toContain("addMonths(displayMonth, -1)");
    expect(dashboardSource).toContain("addMonths(displayMonth, 1)");
    expect(dashboardSource).toContain("useRouter()");
    expect(dashboardSource).toContain("useTransition()");
    expect(dashboardSource).toContain("router.push(`/?month=${nextMonth}`)");
    expect(dashboardSource).toContain("setDisplayMonth(nextMonth)");
    expect(dashboardSource).toContain('className="monthLoading"');
    expect(cssSource).toContain(".monthControls");
    expect(cssSource).toContain('[data-loading="true"]');
    expect(cssSource).toContain(".monthLoading");
    expect(cssSource).toContain(".monthInput");
  });

  test("web app pins light rendering colors to avoid dark mode text inversion", () => {
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(cssSource).toContain("color-scheme: light");
    expect(cssSource).toContain(".summaryPanel");
    expect(cssSource).toContain("background: #12211d");
    expect(cssSource).toContain("color: #ffffff");
  });

  test("expense rows expose payer bars and payer pills for quick scanning", () => {
    const pageSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(pageSource).toContain("payerClassName(expense.userId)");
    expect(pageSource).toContain("payerPill ${payerClassName(expense.userId)}");
    expect(cssSource).toContain(".expense.payerWoman");
    expect(cssSource).toContain(".expense.payerMan");
    expect(cssSource).toContain(".payerPill.payerWoman");
    expect(cssSource).toContain(".payerPill.payerMan");
  });

  test("expense row meta shows only the payer pill, not category text", () => {
    const pageSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");

    expect(pageSource).toContain('className="expenseMeta"');
    expect(pageSource).not.toContain("{expense.category}\n                  <span");
  });

  test("expense dashboard exposes create, edit, and delete controls backed by the API client", () => {
    const pageSource = readText("apps/web/src/app/page.tsx");
    const dashboardSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(pageSource).toContain("<ExpenseDashboard");
    expect(dashboardSource).toContain('"use client"');
    expect(dashboardSource).toContain("createExpense(");
    expect(dashboardSource).toContain("updateExpense(");
    expect(dashboardSource).toContain("deleteExpense(");
    expect(dashboardSource).toContain("restoreExpense(");
    expect(dashboardSource).toContain("console.error");
    expect(dashboardSource).toContain("errorMessageForUser(error)");
    expect(dashboardSource).toContain('aria-label="支出を追加"');
    expect(dashboardSource).toContain('aria-label={`支出を編集:');
    expect(dashboardSource).toContain('aria-label="支出を削除"');
    expect(dashboardSource).toContain("元に戻す");
    expect(cssSource).toContain(".statusLink");
    expect(cssSource).toContain(".expenseForm");
  });

  test("expense edit and delete controls are optimized for mobile tapping", () => {
    const dashboardSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(dashboardSource).toContain('className="expenseTapTarget"');
    expect(dashboardSource).toContain('aria-label={`支出を編集:');
    expect(dashboardSource).toContain("deleteLabel=");
    expect(dashboardSource).not.toContain('className="rowActions"');
    expect(cssSource).toContain(".expenseTapTarget");
    expect(cssSource).toContain("min-height: 58px");
    expect(cssSource).toContain(".deleteButton");
    expect(cssSource).not.toContain(".rowActions");
  });

  test("expense form captures payment content without a category field", () => {
    const dashboardSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");

    expect(dashboardSource).toContain("<span>支払内容</span>");
    expect(dashboardSource).toContain('category: DEFAULT_EXPENSE_CATEGORY');
    expect(dashboardSource).not.toContain("<span>カテゴリ</span>");
    expect(dashboardSource).not.toContain("category: string;");
    expect(dashboardSource).not.toContain("category: expense.category");
  });
});
