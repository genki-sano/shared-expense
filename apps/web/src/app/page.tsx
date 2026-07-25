import type { Expense } from "@shared-expense/shared";
import { loadMonthlyExpensesForPage } from "../features/expenses/page-data";

const month = "2026-07";

const numberFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export default async function Home() {
  const { expenses, source, errorMessage } = await loadExpenses();
  const total = expenses.reduce((sum, expense) => sum + expense.price, 0);

  return (
    <main className="shell">
      <div className="app">
        <header className="topbar">
          <div>
            <p className="month">2026年7月</p>
            <h1 className="title">月次支出</h1>
          </div>
          <button className="addButton" type="button" aria-label="支出を追加">
            +
          </button>
        </header>

        <section className="summaryPanel" aria-label="月次サマリ">
          <div>
            <p className="summaryLabel">精算予定</p>
            <p className="settlementAmount">{numberFormatter.format(4270)}</p>
          </div>
          <div className="summaryDetails" aria-label="合計と件数">
            <span>合計 {numberFormatter.format(total)}</span>
            <span>{expenses.length}件</span>
          </div>
        </section>

        <div className="toolbar">
          <h2 className="sectionTitle">明細</h2>
          {source === "sample" ? <span className="sourceBadge">Sample</span> : null}
        </div>

        {errorMessage === undefined ? null : (
          <p className="errorMessage">{errorMessage}</p>
        )}

        <section className="list" aria-label="支出明細">
          {expenses.map((expense) => (
            <article
              className={`expense ${payerClassName(expense.userId)}`}
              key={expense.id}
            >
              <span className="dateBadge">{formatMonthDay(expense.date)}</span>
              <div>
                <p className="expenseName">{expense.memo ?? expense.category}</p>
                <p className="expenseMeta">
                  <span
                    className={`payerPill ${payerClassName(expense.userId)}`}
                  >
                    {expense.userName ?? expense.userId}
                  </span>
                </p>
              </div>
              <span className="amount">
                {numberFormatter.format(expense.price)}
              </span>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

async function loadExpenses(): Promise<{
  expenses: Expense[];
  source: "api" | "sample";
  errorMessage?: string;
}> {
  try {
    return await loadMonthlyExpensesForPage({
      month,
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
      idToken: process.env.NEXT_PUBLIC_DEV_LIFF_ID_TOKEN,
    });
  } catch {
    return { source: "api", expenses: [], errorMessage: "支出明細を取得できません" };
  }
}

function formatMonthDay(date: string): string {
  return date.slice(5).replace("-", "/");
}

function payerClassName(userId: string): "payerWoman" | "payerMan" | "payerUnknown" {
  if (userId === "woman") {
    return "payerWoman";
  }

  if (userId === "man") {
    return "payerMan";
  }

  return "payerUnknown";
}
