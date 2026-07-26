import type { User } from "@shared-expense/shared";
import { Hono } from "hono";
import { ExpenseRepositoryError, type ExpenseRepository } from "./repository";

export type ExpenseRoutesDependencies = {
  authenticateToken: (token: string) => Promise<User>;
  expenseRepository: ExpenseRepository;
};

type CreateExpenseBody = {
  date: string;
  price: number;
  category: string;
  memo?: string | null;
};

type UpdateExpenseBody = {
  version: number;
  date?: string;
  price?: number;
  category?: string;
  memo?: string | null;
};

export function createExpenseRoutes(dependencies: ExpenseRoutesDependencies): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const actor = await authenticateRequest(c.req.header("Authorization"), dependencies);
    if (actor === null) {
      return c.json({ message: "Unauthorized", details: {} }, 401);
    }

    const month = c.req.query("date");
    if (month === undefined || !/^\d{4}-\d{2}$/.test(month)) {
      return c.json(
        {
          message: "Invalid request",
          details: { field: "date", reason: "must be YYYY-MM" },
        },
        400,
      );
    }

    const expenses = await dependencies.expenseRepository.listByMonth({
      month,
      actor,
    });

    return c.json({ expenses });
  });

  app.post("/", async (c) => {
    const actor = await authenticateRequest(c.req.header("Authorization"), dependencies);
    if (actor === null) {
      return c.json({ message: "Unauthorized", details: {} }, 401);
    }

    const idempotencyError = validateIdempotencyKey(c.req.header("Idempotency-Key"));
    if (idempotencyError !== null) {
      return c.json(idempotencyError, 400);
    }

    const body = await readJsonObject(c.req.raw);
    const parsedBody = parseCreateBody(body);
    if ("error" in parsedBody) {
      return c.json(parsedBody.error, 400);
    }

    const expense = await dependencies.expenseRepository.create({
      actor,
      date: parsedBody.value.date,
      price: parsedBody.value.price,
      category: parsedBody.value.category,
      memo: parsedBody.value.memo ?? null,
    });

    return c.json(expense, 201);
  });

  app.put("/:id", async (c) => {
    const actor = await authenticateRequest(c.req.header("Authorization"), dependencies);
    if (actor === null) {
      return c.json({ message: "Unauthorized", details: {} }, 401);
    }

    const idempotencyError = validateIdempotencyKey(c.req.header("Idempotency-Key"));
    if (idempotencyError !== null) {
      return c.json(idempotencyError, 400);
    }

    const body = await readJsonObject(c.req.raw);
    const parsedBody = parseUpdateBody(body);
    if ("error" in parsedBody) {
      return c.json(parsedBody.error, 400);
    }

    try {
      const expense = await dependencies.expenseRepository.update({
        id: c.req.param("id"),
        actor,
        version: parsedBody.value.version,
        patch: {
          ...(parsedBody.value.date === undefined ? {} : { date: parsedBody.value.date }),
          ...(parsedBody.value.price === undefined ? {} : { price: parsedBody.value.price }),
          ...(parsedBody.value.category === undefined
            ? {}
            : { category: parsedBody.value.category }),
          ...("memo" in parsedBody.value ? { memo: parsedBody.value.memo } : {}),
        },
      });

      return c.json(expense);
    } catch (error) {
      return repositoryErrorResponse(error);
    }
  });

  app.delete("/:id", async (c) => {
    const actor = await authenticateRequest(c.req.header("Authorization"), dependencies);
    if (actor === null) {
      return c.json({ message: "Unauthorized", details: {} }, 401);
    }

    const idempotencyError = validateIdempotencyKey(c.req.header("Idempotency-Key"));
    if (idempotencyError !== null) {
      return c.json(idempotencyError, 400);
    }

    try {
      await dependencies.expenseRepository.delete({
        id: c.req.param("id"),
        actor,
      });

      return c.body(null, 204);
    } catch (error) {
      return repositoryErrorResponse(error);
    }
  });

  return app;
}

async function authenticateRequest(
  authorizationHeader: string | undefined,
  dependencies: ExpenseRoutesDependencies,
): Promise<User | null> {
  const token = bearerToken(authorizationHeader);
  if (token === null) {
    return null;
  }

  try {
    return await dependencies.authenticateToken(token);
  } catch {
    return null;
  }
}

function bearerToken(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }

  const match = /^Bearer (?<token>.+)$/.exec(authorizationHeader);
  return match?.groups?.token ?? null;
}

function validateIdempotencyKey(value: string | undefined):
  | {
      message: "Invalid request";
      details: { field: "Idempotency-Key"; reason: "is required" };
    }
  | null {
  if (value === undefined || value.trim() === "") {
    return {
      message: "Invalid request",
      details: { field: "Idempotency-Key", reason: "is required" },
    };
  }

  return null;
}

async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}

function parseCreateBody(
  body: Record<string, unknown> | null,
):
  | { value: CreateExpenseBody }
  | { error: { message: "Invalid request"; details: Record<string, string> } } {
  if (body === null) {
    return { error: invalidField("body", "must be a JSON object") };
  }

  const commonError = validateExpenseFields(body, ["date", "price", "category"]);
  if (commonError !== null) {
    return { error: commonError };
  }

  if ("memo" in body && body.memo !== null && typeof body.memo !== "string") {
    return { error: invalidField("memo", "must be string or null") };
  }

  return {
    value: {
      date: body.date as string,
      price: body.price as number,
      category: body.category as string,
      ...("memo" in body ? { memo: body.memo as string | null } : {}),
    },
  };
}

function parseUpdateBody(
  body: Record<string, unknown> | null,
):
  | { value: UpdateExpenseBody }
  | { error: { message: "Invalid request"; details: Record<string, string> } } {
  if (body === null) {
    return { error: invalidField("body", "must be a JSON object") };
  }

  if (!Number.isSafeInteger(body.version) || Number(body.version) < 1) {
    return { error: invalidField("version", "must be a positive integer") };
  }

  const commonError = validateExpenseFields(body, []);
  if (commonError !== null) {
    return { error: commonError };
  }

  const updateFields = ["date", "price", "category", "memo"].filter((field) => field in body);
  if (updateFields.length === 0) {
    return { error: invalidField("body", "must include at least one update field") };
  }

  return {
    value: {
      version: body.version as number,
      ...("date" in body ? { date: body.date as string } : {}),
      ...("price" in body ? { price: body.price as number } : {}),
      ...("category" in body ? { category: body.category as string } : {}),
      ...("memo" in body ? { memo: body.memo as string | null } : {}),
    },
  };
}

function validateExpenseFields(
  body: Record<string, unknown>,
  requiredFields: Array<"date" | "price" | "category">,
): { message: "Invalid request"; details: Record<string, string> } | null {
  for (const field of requiredFields) {
    if (!(field in body)) {
      return invalidField(field, "is required");
    }
  }

  if ("date" in body && (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date))) {
    return invalidField("date", "must be YYYY-MM-DD");
  }

  if ("price" in body && (!Number.isSafeInteger(body.price) || Number(body.price) < 0)) {
    return invalidField("price", "must be a non-negative integer");
  }

  if ("category" in body && (typeof body.category !== "string" || body.category.trim() === "")) {
    return invalidField("category", "must be a non-empty string");
  }

  if ("memo" in body && body.memo !== null && typeof body.memo !== "string") {
    return invalidField("memo", "must be string or null");
  }

  return null;
}

function invalidField(
  field: string,
  reason: string,
): { message: "Invalid request"; details: Record<string, string> } {
  return { message: "Invalid request", details: { field, reason } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function repositoryErrorResponse(error: unknown): Response {
  const repositoryError = normalizeRepositoryError(error);
  if (repositoryError === null) {
    throw error;
  }

  if (repositoryError.code === "not_found") {
    return Response.json(
      {
        message: "Expense not found",
        details: { id: repositoryError.id },
      },
      { status: 404 },
    );
  }

  return Response.json(
    {
      message: "Expense version conflict",
      details: {
        id: repositoryError.id,
        ...(repositoryError.expectedVersion === undefined
          ? {}
          : { expectedVersion: repositoryError.expectedVersion }),
        ...(repositoryError.actualVersion === undefined
          ? {}
          : { actualVersion: repositoryError.actualVersion }),
      },
    },
    { status: 409 },
  );
}

function normalizeRepositoryError(error: unknown):
  | {
      code: "not_found" | "version_conflict";
      id: string;
      expectedVersion?: number;
      actualVersion?: number;
    }
  | null {
  if (error instanceof ExpenseRepositoryError) {
    return {
      code: error.code,
      id: error.id,
      ...(error.expectedVersion === undefined
        ? {}
        : { expectedVersion: error.expectedVersion }),
      ...(error.actualVersion === undefined ? {} : { actualVersion: error.actualVersion }),
    };
  }

  if (!(error instanceof Error)) {
    return null;
  }

  const notFound = /^Expense not found: (?<id>.+)$/.exec(error.message);
  if (notFound?.groups?.id !== undefined) {
    return { code: "not_found", id: notFound.groups.id };
  }

  const conflict = /^Expense version conflict: (?<id>.+)$/.exec(error.message);
  if (conflict?.groups?.id !== undefined) {
    return { code: "version_conflict", id: conflict.groups.id };
  }

  return null;
}
