import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { authenticateMutation, type ApiSession } from "../../../lib/api-auth";
import {
  fetchMonthlyExpenses,
  fetchMonthlySettlement,
  fetchExpenseDetail,
} from "../api";

export const expenseQueryKey = ["expenses"] as const;

export const monthlyExpensesQuery = (session: ApiSession, month: string) =>
  queryOptions({
    queryKey: [
      ...expenseQueryKey,
      session.apiBaseUrl,
      session.idToken,
      "month",
      month,
    ],
    queryFn: async ({ signal }) => {
      const [list, summary] = await Promise.all([
        fetchMonthlyExpenses({ ...session, month, signal }),
        fetchMonthlySettlement({ ...session, month, signal }),
      ]);
      return {
        expenses: list.expenses,
        settlement: summary.settlement,
        source: list.source,
      };
    },
  });

export const expenseQuery = (session: ApiSession, id: string) =>
  queryOptions({
    queryKey: [
      ...expenseQueryKey,
      session.apiBaseUrl,
      session.idToken,
      "detail",
      id,
    ],
    queryFn: ({ signal }) => fetchExpenseDetail({ ...session, id, signal }),
  });

export function expenseMutationOptions<
  T extends { apiBaseUrl: string | undefined; idToken?: string | undefined },
  R,
>(client: QueryClient, mutationFn: (input: T) => Promise<R>) {
  return {
    mutationFn: async (input: T) =>
      mutationFn(await authenticateMutation(input)),
    onSuccess: () => client.invalidateQueries({ queryKey: expenseQueryKey }),
  };
}
