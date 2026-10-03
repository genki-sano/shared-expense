import { Suspense } from "react";
import { ExpenseDetailClient } from "../../features/expenses/components/expense-detail-client";

export default function ExpenseDetailPage() {
  return (
    <Suspense fallback={null}>
      <ExpenseDetailClient />
    </Suspense>
  );
}
