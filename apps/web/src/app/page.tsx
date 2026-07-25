const expenses = [
  {
    id: "1",
    name: "スーパー",
    paidBy: "Genki",
    date: "7/18",
    category: "食費",
    amount: 6420,
  },
  {
    id: "2",
    name: "電気代",
    paidBy: "Partner",
    date: "7/12",
    category: "光熱費",
    amount: 11840,
  },
  {
    id: "3",
    name: "日用品",
    paidBy: "Genki",
    date: "7/06",
    category: "生活用品",
    amount: 3280,
  },
];

const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

const numberFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export default function Home() {
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
        </div>

        <section className="list" aria-label="支出明細">
          {expenses.map((expense) => (
            <article className="expense" key={expense.id}>
              <span className="dateBadge">{expense.date}</span>
              <div>
                <p className="expenseName">{expense.name}</p>
                <p className="expenseMeta">
                  {expense.category} / {expense.paidBy}
                </p>
              </div>
              <span className="amount">
                {numberFormatter.format(expense.amount)}
              </span>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
