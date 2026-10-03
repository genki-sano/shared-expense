import { Suspense } from "react";
import { ExpenseNewClient } from "../../../features/expenses/components/expense-new-client";
import { StatusScreen } from "../../../components/query-boundary";

export default function ExpenseNewPage() {
  return (
    <Suspense fallback={<StatusScreen message="支出明細を読み込んでいます" />}>
      <ExpenseNewClient />
    </Suspense>
  );
}
