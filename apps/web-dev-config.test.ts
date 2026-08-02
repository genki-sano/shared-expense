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
    expect(envExample).toContain("LINE_MESSAGING_CHANNEL_SECRET=");
    expect(envExample).toContain("LINE_LIFF_ID=");
    expect(envExample).not.toContain("LINE_NOTIFICATION_DETAIL_BASE_URL=");
  });

  test("web app exposes Next.js development and verification scripts", () => {
    const webPackage = readPackageJson("apps/web/package.json");
    const nextConfig = readText("apps/web/next.config.ts");
    const rootPackage = readPackageJson("package.json");

    expect(webPackage).toMatchObject({
      name: "@shared-expense/web",
      scripts: {
        dev: "next dev",
        build: "next build",
        typecheck: "tsc -p tsconfig.json --noEmit",
      },
    });
    expect(rootPackage.scripts).toMatchObject({
      "build:web": "pnpm --filter @shared-expense/web build",
    });
    expect(webPackage.scripts).not.toHaveProperty("pages:build");
    expect(webPackage.devDependencies).not.toHaveProperty("@opennextjs/cloudflare");
    expect(webPackage.devDependencies).not.toHaveProperty("wrangler");
    expect(nextConfig).toContain('output: "export"');
    expect(existsSync(join(rootDir, "apps/web/open-next.config.ts"))).toBe(false);
    expect(existsSync(join(rootDir, "apps/web/wrangler.jsonc"))).toBe(false);
    expect(rootPackage.scripts).not.toHaveProperty("deploy:web");
    expect(existsSync(join(rootDir, "apps/web/src/app/page.tsx"))).toBe(true);
    expect(existsSync(join(rootDir, "apps/web/src/app/home-client.tsx"))).toBe(true);
  });

  test("web app asks search engines not to index it", () => {
    const layoutSource = readText("apps/web/src/app/layout.tsx");
    const robotsSource = readText("apps/web/src/app/robots.ts");

    expect(layoutSource).toContain("robots:");
    expect(layoutSource).toContain("index: false");
    expect(layoutSource).toContain("follow: false");
    expect(robotsSource).toContain('userAgent: "*"');
    expect(robotsSource).toContain('disallow: "/"');
    expect(robotsSource).toContain('dynamic = "force-static"');
  });

  test("web app can initialize LIFF ID tokens for production auth", () => {
    const webPackage = readPackageJson("apps/web/package.json");
    const homeClientSource = readText("apps/web/src/app/home-client.tsx");
    const dashboardSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");
    const liffClientSource = readText("apps/web/src/features/expenses/liff-client.ts");

    expect(webPackage.dependencies).toMatchObject({
      "@line/liff": expect.any(String),
    });
    expect(homeClientSource).toContain("NEXT_PUBLIC_LIFF_ID");
    expect(homeClientSource).toContain("NEXT_PUBLIC_DEV_ID_TOKEN");
    expect(homeClientSource).toContain('process.env.NODE_ENV === "development"');
    expect(dashboardSource).toContain("async function resolveIdToken()");
    expect(dashboardSource).toContain("idToken: currentIdToken");
    expect(dashboardSource).toContain("getLiffIdToken(");
    expect(dashboardSource).toContain("fetchMonthlyExpenses({");
    expect(dashboardSource).toContain("fetchMonthlySettlement({");
    expect(liffClientSource).toContain('import("@line/liff")');
    expect(liffClientSource).toContain("liff.init({ liffId: input.liffId })");
    expect(liffClientSource).toContain("liff.isLoggedIn()");
    expect(liffClientSource).toContain("liff.login(");
    expect(liffClientSource).toContain("liff.getIDToken()");
    expect(liffClientSource).toContain("liff.getDecodedIDToken()");
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

  test("mobile date inputs keep stable dimensions", () => {
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(cssSource).toContain("appearance: none");
    expect(cssSource).toContain("-webkit-appearance: none");
    expect(cssSource).toContain(".monthInput");
    expect(cssSource).toContain("height: 42px");
    expect(cssSource).toContain(".field input");
    expect(cssSource).toContain("height: 40px");
    expect(cssSource).toContain("::-webkit-calendar-picker-indicator");
  });

  test("expense dashboard exposes mobile month navigation", () => {
    const appSource = readText("apps/web/src/app/page.tsx");
    const homeClientSource = readText("apps/web/src/app/home-client.tsx");
    const dashboardSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(homeClientSource).toContain("normalizeMonthParam(searchParams.get(\"month\")");
    expect(homeClientSource).toContain("currentMonthInJst()");
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

  test("notification detail links open the matching expense details", () => {
    const appSource = readText("apps/web/src/app/page.tsx");
    const homeClientSource = readText("apps/web/src/app/home-client.tsx");
    const detailPageSource = readText("apps/web/src/app/expense/page.tsx");
    const detailClientSource = readText(
      "apps/web/src/features/expenses/expense-detail-client.tsx",
    );
    const dashboardSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");
    const notificationSource = readText(
      "apps/api/src/core/notifications/expense-mutation-notifier.ts",
    );

    expect(appSource).toContain("<HomeClient />");
    expect(homeClientSource).toContain("searchParams.get(\"month\")");
    expect(homeClientSource).not.toContain("searchParams.get(\"expenseId\")");
    expect(homeClientSource).not.toContain("selectedExpenseId=");
    expect(homeClientSource).toContain("LIFF_LAUNCH_GUARD_MS");
    expect(homeClientSource).toContain("isLiffLaunchGuardActive");
    expect(homeClientSource).toContain("LINE認証を確認しています");
    expect(detailPageSource).toContain("<ExpenseDetailClient />");
    expect(detailClientSource).toContain('searchParams.get("expenseId")');
    expect(detailClientSource).not.toContain("usePathname()");
    expect(detailClientSource).toContain("monthFromExpenseDate(state.expense.date)");
    expect(detailClientSource).not.toContain("formatMonthLabel(detailMonth)");
    expect(detailClientSource).toContain("fetchExpenseDetail(");
    expect(detailClientSource).toContain("updateExpense(");
    expect(detailClientSource).toContain("deleteExpense(");
    expect(detailClientSource).toContain("restoreExpense(");
    expect(detailClientSource).toContain("一覧へ");
    expect(dashboardSource).not.toContain("selectedExpenseId");
    expect(dashboardSource).not.toContain("expenseElementsRef");
    expect(dashboardSource).not.toContain("scrollIntoView");
    expect(dashboardSource).not.toContain("通知対象");
    expect(notificationSource).toContain('/expense');
    expect(notificationSource).toContain('url.searchParams.set("expenseId", expense.id)');
    expect(notificationSource).not.toContain('searchParams.set("month"');
    expect(cssSource).not.toContain('.expense[data-selected="true"]');
    expect(cssSource).not.toContain(".selectedPill");
    expect(cssSource).toContain(".detailPanel");
    expect(cssSource).toContain(".detailForm .deleteButton");
    expect(cssSource).toContain("grid-column: auto");
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
    const homeClientSource = readText("apps/web/src/app/home-client.tsx");
    const dashboardSource = readText("apps/web/src/features/expenses/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(homeClientSource).toContain("<ExpenseDashboard");
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
