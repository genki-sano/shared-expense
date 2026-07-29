import { calculateMonthlySettlement, type Expense } from "@shared-expense/shared";
import type { HouseholdUsers, MonthlySettlementSummary } from "@shared-expense/shared";

export type MonthlyExpensesSource = "api" | "sample";

export type MonthlyExpensesResult = {
  source: MonthlyExpensesSource;
  expenses: Expense[];
};

export type MonthlySettlementResult = {
  source: MonthlyExpensesSource;
  settlement: MonthlySettlementSummary;
};

export type FetchMonthlyExpensesInput = {
  month: string;
  apiBaseUrl: string | undefined;
  idToken?: string | undefined;
  fetcher?: typeof fetch;
};

export type FetchMonthlySettlementInput = FetchMonthlyExpensesInput;

export type CreateExpensePayload = {
  date: string;
  price: number;
  category: string;
  memo: string | null;
};

export type UpdateExpensePayload = CreateExpensePayload & {
  version: number;
};

export type ExpenseMutationInput = {
  apiBaseUrl: string | undefined;
  idToken?: string | undefined;
  idempotencyKey: string;
  fetcher?: typeof fetch;
};

export type CreateExpenseInput = ExpenseMutationInput & {
  expense: CreateExpensePayload;
};

export type UpdateExpenseInput = ExpenseMutationInput & {
  id: string;
  expense: UpdateExpensePayload;
};

export type DeleteExpenseInput = ExpenseMutationInput & {
  id: string;
};

export type RestoreExpenseInput = ExpenseMutationInput & {
  id: string;
};

export class ExpenseApiError extends Error {
  readonly operation: string;
  readonly status: number;
  readonly responseBody: string;

  constructor(input: { operation: string; status: number; responseBody: string }) {
    const detail =
      input.responseBody.trim() === "" ? "" : ` ${input.responseBody.trim()}`;
    super(`Failed to ${input.operation}: ${input.status}${detail}`);
    this.name = "ExpenseApiError";
    this.operation = input.operation;
    this.status = input.status;
    this.responseBody = input.responseBody;
  }
}

export const sampleExpenses: Expense[] = [
  {
    id: "sample_1",
    userId: "Genki",
    date: "2026-07-18",
    price: 6420,
    category: "食費",
    memo: "スーパー",
    version: 1,
  },
  {
    id: "sample_2",
    userId: "Partner",
    date: "2026-07-12",
    price: 11840,
    category: "光熱費",
    memo: "電気代",
    version: 1,
  },
  {
    id: "sample_3",
    userId: "Genki",
    date: "2026-07-06",
    price: 3280,
    category: "生活用品",
    memo: "日用品",
    version: 1,
  },
];

export const sampleUsers: HouseholdUsers = [
  { id: "Genki", lineUserId: "sample_genki", displayName: "Genki", notifyEnabled: true },
  {
    id: "Partner",
    lineUserId: "sample_partner",
    displayName: "Partner",
    notifyEnabled: true,
  },
];

export async function fetchMonthlyExpenses(
  input: FetchMonthlyExpensesInput,
): Promise<MonthlyExpensesResult> {
  if (input.apiBaseUrl === undefined || input.apiBaseUrl.trim() === "") {
    return { source: "sample", expenses: sampleExpenses };
  }

  const fetcher = input.fetcher ?? fetch;
  const url = new URL("/api/expenses", input.apiBaseUrl);
  url.searchParams.set("date", input.month);

  const response = await fetcher(url.toString(), {
    headers: authorizationHeaders(input.idToken),
  });

  if (!response.ok) {
    throw await expenseApiError("fetch expenses", response);
  }

  const body = (await response.json()) as { expenses: Expense[] };
  return { source: "api", expenses: body.expenses };
}

export async function fetchMonthlySettlement(
  input: FetchMonthlySettlementInput,
): Promise<MonthlySettlementResult> {
  if (input.apiBaseUrl === undefined || input.apiBaseUrl.trim() === "") {
    return {
      source: "sample",
      settlement: calculateMonthlySettlement(input.month, sampleUsers, sampleExpenses),
    };
  }

  const fetcher = input.fetcher ?? fetch;
  const url = new URL("/api/settlements", input.apiBaseUrl);
  url.searchParams.set("month", input.month);

  const response = await fetcher(url.toString(), {
    headers: authorizationHeaders(input.idToken),
  });

  if (!response.ok) {
    throw await expenseApiError("fetch settlement", response);
  }

  const settlement = (await response.json()) as MonthlySettlementSummary;
  return { source: "api", settlement };
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const operation = "create expense";
  const response = await mutationFetch(input, "/api/expenses", {
    method: "POST",
    json: input.expense,
  });

  if (!response.ok) {
    throw await expenseApiError(operation, response);
  }

  return (await response.json()) as Expense;
}

export async function updateExpense(input: UpdateExpenseInput): Promise<Expense> {
  const operation = "update expense";
  const response = await mutationFetch(input, `/api/expenses/${input.id}`, {
    method: "PUT",
    json: input.expense,
  });

  if (!response.ok) {
    throw await expenseApiError(operation, response);
  }

  return (await response.json()) as Expense;
}

export async function deleteExpense(input: DeleteExpenseInput): Promise<void> {
  const operation = "delete expense";
  const response = await mutationFetch(input, `/api/expenses/${input.id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await expenseApiError(operation, response);
  }
}

export async function restoreExpense(input: RestoreExpenseInput): Promise<Expense> {
  const operation = "restore expense";
  const response = await mutationFetch(input, `/api/expenses/${input.id}/restore`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await expenseApiError(operation, response);
  }

  return (await response.json()) as Expense;
}

async function mutationFetch(
  input: ExpenseMutationInput,
  path: string,
  options: { method: "POST" | "PUT" | "DELETE"; json?: unknown },
): Promise<Response> {
  if (input.apiBaseUrl === undefined || input.apiBaseUrl.trim() === "") {
    throw new Error("Expense API base URL is not configured");
  }

  const fetcher = input.fetcher ?? fetch;
  const headers: Record<string, string> = {
    ...authorizationHeaders(input.idToken),
    "Idempotency-Key": input.idempotencyKey,
  };

  const init: RequestInit = {
    method: options.method,
    headers:
      options.json === undefined
        ? headers
        : { ...headers, "Content-Type": "application/json" },
  };

  if (options.json !== undefined) {
    init.body = JSON.stringify(options.json);
  }

  return await fetcher(new URL(path, input.apiBaseUrl).toString(), init);
}

function authorizationHeaders(idToken: string | undefined): Record<string, string> {
  if (idToken === undefined || idToken === "") {
    return {};
  }

  return { Authorization: `Bearer ${idToken}` };
}

async function expenseApiError(
  operation: string,
  response: Response,
): Promise<ExpenseApiError> {
  let responseBody = "";
  try {
    responseBody = await response.text();
  } catch {
    responseBody = "";
  }

  return new ExpenseApiError({
    operation,
    status: response.status,
    responseBody,
  });
}
