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
    expect(existsSync(join(rootDir, "apps/web/src/features/expenses/components/home-client.tsx"))).toBe(true);
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
    const homeClientSource = readText("apps/web/src/features/expenses/components/home-client.tsx");
    const dashboardSource = readText("apps/web/src/features/expenses/components/expense-dashboard.tsx");
    const liffClientSource = readText("apps/web/src/lib/liff-client.ts");

    expect(webPackage.dependencies).toMatchObject({
      "@line/liff": expect.any(String),
    });
    expect(homeClientSource).toContain("NEXT_PUBLIC_LIFF_ID");
    expect(readText("apps/web/src/lib/api-auth.ts")).toContain("NEXT_PUBLIC_DEV_ID_TOKEN");
    expect(readText("apps/web/src/lib/api-auth.ts")).toContain('process.env.NODE_ENV === "development"');
    expect(homeClientSource).toContain("hasLiffPrimaryRedirectParams(searchParams)");
    expect(homeClientSource).toContain("<LiffPrimaryRedirectGate");
    expect(dashboardSource).toContain("useSuspenseQuery(monthlyExpensesQuery");
    expect(dashboardSource).not.toContain("useEffect");
    expect(readText("apps/web/src/features/expenses/queries/expense-queries.ts")).toContain("signal");
    expect(readText("apps/web/src/components/api-session.tsx")).toContain("resolveApiToken(apiBaseUrl)");
    expect(liffClientSource).toContain('import("@line/liff")');
    expect(liffClientSource).toContain("export async function initializeLiff");
    expect(liffClientSource).toContain("liff.init({ liffId })");
    expect(liffClientSource).toContain("liff.isLoggedIn()");
    expect(liffClientSource).toContain("liff.login(");
    expect(liffClientSource).toContain("liff.getIDToken()");
    expect(liffClientSource).toContain("liff.getDecodedIDToken()");
  });

  test("mobile preview uses a compact dashboard summary instead of stacked metric cards", () => {
    const pageSource = readText("apps/web/src/features/expenses/components/expense-dashboard.tsx");
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
    const homeClientSource = readText("apps/web/src/features/expenses/components/home-client.tsx");
    const dashboardSource = readText("apps/web/src/features/expenses/components/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(homeClientSource).toMatch(/normalizeMonthParam\(\s*searchParams.get\("month"\)/);
    expect(homeClientSource).toContain("currentMonthInJst()");
    expect(homeClientSource).toContain("key={month}");
    expect(appSource).not.toContain('const month = "2026-07"');
    expect(dashboardSource).toContain('className="monthControls"');
    expect(dashboardSource).toContain('type="month"');
    expect(dashboardSource).toContain("addMonths(displayMonth, -1)");
    expect(dashboardSource).toContain("addMonths(displayMonth, 1)");
    expect(dashboardSource).toContain("useRouter()");
    expect(dashboardSource).toContain("useTransition()");
    expect(dashboardSource).toContain("router.push(`/expenses?month=${nextMonth}`)");
    expect(dashboardSource).not.toContain("setExpenses(sortExpenses(props.expenses))");
    expect(dashboardSource).toContain('className="monthLoading"');
    expect(cssSource).toContain(".monthControls");
    expect(cssSource).toContain('[data-loading="true"]');
    expect(cssSource).toContain(".monthLoading");
    expect(cssSource).toContain(".monthInput");
  });

  test("notification detail links open the matching expense details", () => {
    const appSource = readText("apps/web/src/app/page.tsx");
    const homeClientSource = readText("apps/web/src/features/expenses/components/home-client.tsx");
    const detailPageSource = readText("apps/web/src/app/expenses/detail/page.tsx");
    const detailClientSource = readText(
      "apps/web/src/features/expenses/components/expense-detail-client.tsx",
    );
    const liffGateSource = readText(
      "apps/web/src/components/liff-primary-redirect-gate.tsx",
    );
    const dashboardSource = readText("apps/web/src/features/expenses/components/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");
    const notificationSource = readText(
      "apps/api/src/core/notifications/expense-mutation-notifier.ts",
    );

    expect(readText("apps/web/src/app/expenses/page.tsx")).toContain("<HomeClient />");
    expect(appSource).toContain('"./expenses/page"');
    expect(existsSync(join(rootDir, "apps/web/src/app/expense/page.tsx"))).toBe(false);
    expect(homeClientSource).toContain("searchParams.get(\"month\")");
    expect(homeClientSource).not.toContain("searchParams.get(\"expenseId\")");
    expect(homeClientSource).not.toContain("selectedExpenseId=");
    expect(homeClientSource).not.toContain("LIFF_LAUNCH_GUARD_MS");
    expect(homeClientSource).not.toContain("setTimeout");
    expect(homeClientSource).toContain("hasLiffPrimaryRedirectParams(searchParams)");
    expect(detailClientSource).toContain("hasLiffPrimaryRedirectParams(searchParams)");
    expect(liffGateSource).toContain("LINE認証を確認しています");
    expect(dashboardSource).not.toContain("LINE認証に失敗しました");
    expect(detailPageSource).toContain("<ExpenseDetailClient />");
    expect(detailClientSource).toContain('searchParams.get("id")');
    expect(detailClientSource).not.toContain('searchParams.get("expenseId")');
    expect(detailClientSource).not.toContain("usePathname()");
    expect(detailClientSource).toContain("monthFromExpenseDate(state.expense.date)");
    expect(detailClientSource).not.toContain("formatMonthLabel(detailMonth)");
    expect(detailClientSource).toContain("updateMutation.mutateAsync(");
    expect(detailClientSource).toContain("deleteMutation.mutateAsync(");
    expect(detailClientSource).toContain("restoreMutation.mutateAsync(");
    expect(detailClientSource).toContain('key={`${state.expense.id}:${state.expense.version}:${state.deleted}`}');
    expect(detailClientSource).not.toContain("setDraft(props.defaultDraft)");
    expect(detailClientSource).toContain("一覧へ");
    expect(dashboardSource).not.toContain("selectedExpenseId");
    expect(dashboardSource).not.toContain("expenseElementsRef");
    expect(dashboardSource).not.toContain("scrollIntoView");
    expect(dashboardSource).not.toContain("通知対象");
    expect(notificationSource).toContain('/expenses/detail');
    expect(notificationSource).toContain('url.searchParams.set("id", expense.id)');
    expect(notificationSource).not.toContain('searchParams.set("month"');
    expect(cssSource).not.toContain('.expense[data-selected="true"]');
    expect(cssSource).not.toContain(".selectedPill");
    expect(cssSource).toContain(".expenseFormCard");
    expect(cssSource).not.toContain(".detailForm");
  });

  test("web app pins light rendering colors to avoid dark mode text inversion", () => {
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(cssSource).toContain("color-scheme: light");
    expect(cssSource).toContain("--color-background: #fff9f2");
    expect(cssSource).toContain("--color-surface: #fffdfc");
    expect(cssSource).toContain("--color-text-primary: #5b4638");
    expect(cssSource).toContain(".summaryPanel");
    expect(cssSource).toContain("background: var(--color-text-primary)");
    expect(cssSource).toContain("color: var(--color-surface)");
  });

  test("expense rows expose payer bars and payer pills for quick scanning", () => {
    const pageSource = readText("apps/web/src/features/expenses/components/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");

    expect(pageSource).toContain("payerClassName(expense.userId)");
    expect(pageSource).toContain("payerPill ${payerClassName(expense.userId)}");
    expect(cssSource).toContain(".expense.payerWoman");
    expect(cssSource).toContain(".expense.payerMan");
    expect(cssSource).toContain(".payerPill.payerWoman");
    expect(cssSource).toContain(".payerPill.payerMan");
  });

  test("expense row meta shows only the payer pill, not category text", () => {
    const pageSource = readText("apps/web/src/features/expenses/components/expense-dashboard.tsx");

    expect(pageSource).toContain('className="expenseMeta"');
    expect(pageSource).not.toContain("{expense.category}\n                  <span");
  });

  test("expense dashboard links to canonical create and detail pages", () => {
    const dashboardSource = readText("apps/web/src/features/expenses/components/expense-dashboard.tsx");
    const detailSource = readText("apps/web/src/features/expenses/components/expense-detail-client.tsx");
    const newSource = readText("apps/web/src/features/expenses/components/expense-new-client.tsx");

    expect(dashboardSource).toContain('href={`/expenses/new?month=${displayMonth}`}');
    expect(dashboardSource).toContain('href={`/expenses/detail?id=${encodeURIComponent(expense.id)}`}');
    expect(dashboardSource).toContain('aria-label="支出を追加"');
    expect(dashboardSource).toContain('aria-label={`支出詳細:');
    expect(dashboardSource).not.toContain("ExpenseForm");
    expect(dashboardSource).not.toContain("useMutation");
    expect(dashboardSource).not.toContain("isCreateOpen");
    expect(dashboardSource).not.toContain("editingExpenseId");
    expect(newSource).toContain("mutation.mutateAsync(");
    for (const operation of ["update", "delete", "restore"]) {
      expect(detailSource).toContain(`${operation}Mutation.mutateAsync(`);
    }
  });

  test("expense detail navigation preserves mobile tap targets", () => {
    const dashboardSource = readText("apps/web/src/features/expenses/components/expense-dashboard.tsx");
    const cssSource = readText("apps/web/src/app/globals.css");
    expect(dashboardSource).toContain('className="expenseTapTarget"');
    expect(cssSource).toContain(".expenseTapTarget");
    expect(cssSource).toContain("min-height: 58px");
    expect(cssSource).toContain("text-decoration: none");
  });

  test("create and detail share the same expense input form and styling", () => {
    const detail = readText("apps/web/src/features/expenses/components/expense-detail-client.tsx");
    const create = readText("apps/web/src/features/expenses/components/expense-new-client.tsx");
    const form = readText("apps/web/src/features/expenses/components/expense-form.tsx");
    const css = readText("apps/web/src/app/globals.css");
    for (const screen of [detail, create]) {
      expect(screen).toContain('from "./expense-form"');
      expect(screen).toContain("<ExpenseForm");
      expect(screen).not.toContain("<form");
      expect(screen).not.toContain("<input");
    }
    expect(detail).not.toContain("DetailExpenseForm");
    expect(detail).toContain('submitLabel="変更を保存"');
    expect(create).toContain('submitLabel="追加する"');
    expect(form).toContain('className="expenseForm"');
    expect(form).toContain("props.onDelete");
    expect(form).toContain("props.onCancel");
    expect(css).not.toContain(".detailForm");
    expect(css).not.toContain(".expense .expenseForm");
  });

  test("expense form captures payment content without a category field", () => {
    const dashboardSource = readText("apps/web/src/features/expenses/components/expense-form.tsx");

    expect(dashboardSource).toContain("<span>支払内容</span>");
    expect(dashboardSource).toContain('category: DEFAULT_EXPENSE_CATEGORY');
    expect(dashboardSource).not.toContain("<span>カテゴリ</span>");
    expect(dashboardSource).not.toContain("category: string;");
    expect(dashboardSource).not.toContain("category: expense.category");
  });
});
