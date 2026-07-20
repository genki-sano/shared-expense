# Shared Expense Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first implementation slice for the replacement: monorepo tooling, shared domain rules, OpenAPI contract updates, Spreadsheet row mapping, LIFF auth boundary, and old-system inventory.

**Architecture:** Start contract-first from `packages/api-contract/openapi.yaml`, place reusable business rules in `packages/shared`, isolate Spreadsheet mapping in `packages/integrations`, and create only the API authentication boundary in `apps/api`. Follow-up plans will implement full Expense routes, real Spreadsheet repositories, LINE adapter, Workers Cron, and LIFF UI.

**Tech Stack:** TypeScript, pnpm workspaces, Vitest, OpenAPI, Hono, Cloudflare Workers, Next.js, LIFF SDK, Google Sheets API, LINE Messaging API.

---

## File Structure

- Create `package.json`: root scripts and workspace tooling.
- Create `pnpm-workspace.yaml`: workspace package discovery.
- Create `tsconfig.base.json`: shared TypeScript compiler settings.
- Create `vitest.config.ts`: shared Vitest config.
- Modify `packages/api-contract/openapi.yaml`: add settlement API, idempotency/version contract, auth details, and 409 responses.
- Create `packages/shared/src/domain/expense.ts`: Expense and input types.
- Create `packages/shared/src/domain/user.ts`: User and household relationship types.
- Create `packages/shared/src/domain/settlement.ts`: settlement calculation.
- Create `packages/shared/src/domain/notification.ts`: notification history/event types.
- Create `packages/shared/src/domain/*.test.ts`: domain tests.
- Create `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`.
- Create `packages/integrations/src/spreadsheet/*.ts`: Spreadsheet row mappers.
- Create `apps/api/src/auth/*.ts`: LIFF token verification boundary.
- Create `apps/api/src/app.ts`: minimal Hono app shell.
- Create `docs/migration/existing-inventory.md`: inventory result from old repositories.
- Modify `.codex/tasks/todo.md`: append implementation progress and verification log.

---

## Execution Order

Run Task 1 first. Run Task 7 immediately after Task 1, before Tasks 2, 4, and 5. The old repository inventory must confirm settlement rounding, Spreadsheet column order, notification text, and existing API compatibility before domain and mapping behavior is finalized.

---

### Task 1: Monorepo Tooling Baseline

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the package skeleton**

Create `package.json`:

```json
{
  "name": "shared-expense",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "@types/node": "^20.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "dist"
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
```

Create `packages/shared/package.json`:

```json
{
  "name": "@shared-expense/shared",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/shared/src/index.ts`:

```ts
export {};
```

- [ ] **Step 2: Install dependencies**

Run: `pnpm install`

Expected: lockfile is created and dependencies install successfully.

- [ ] **Step 3: Run baseline checks**

Run: `pnpm test`

Expected: PASS with no tests found or an empty-suite success, depending on Vitest version.

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.config.ts packages/shared
git commit -m "chore: scaffold monorepo tooling"
```

---

### Task 2: Shared Domain Models and Settlement Calculation

**Files:**
- Create: `packages/shared/src/domain/expense.ts`
- Create: `packages/shared/src/domain/user.ts`
- Create: `packages/shared/src/domain/settlement.ts`
- Create: `packages/shared/src/domain/settlement.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write failing settlement tests**

Create `packages/shared/src/domain/settlement.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateMonthlySettlement } from "./settlement";
import type { Expense } from "./expense";
import type { User } from "./user";

const users: [User, User] = [
  { id: "user_a", lineUserId: "line_a", displayName: "A", notifyEnabled: true },
  { id: "user_b", lineUserId: "line_b", displayName: "B", notifyEnabled: true },
];

describe("calculateMonthlySettlement", () => {
  it("calculates totals and the payment direction for two users using the inventory-confirmed rounding rule", () => {
    const expenses: Expense[] = [
      { id: "exp_1", userId: "user_a", date: "2026-06-03", price: 10000, category: "food", memo: "スーパー", version: 1 },
      { id: "exp_2", userId: "user_b", date: "2026-06-08", price: 4000, category: "daily", memo: null, version: 1 },
    ];

    expect(calculateMonthlySettlement("2026-06", users, expenses)).toEqual({
      month: "2026-06",
      householdTotal: 14000,
      userTotals: [
        { userId: "user_a", displayName: "A", total: 10000 },
        { userId: "user_b", displayName: "B", total: 4000 },
      ],
      difference: 6000,
      settlement: {
        fromUserId: "user_b",
        toUserId: "user_a",
        amount: 3000,
      },
    });
  });

  it("returns zero settlement when both users paid equally", () => {
    const expenses: Expense[] = [
      { id: "exp_1", userId: "user_a", date: "2026-06-03", price: 5000, category: "food", memo: null, version: 1 },
      { id: "exp_2", userId: "user_b", date: "2026-06-08", price: 5000, category: "daily", memo: null, version: 1 },
    ];

    expect(calculateMonthlySettlement("2026-06", users, expenses).settlement).toEqual({
      fromUserId: null,
      toUserId: null,
      amount: 0,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test packages/shared/src/domain/settlement.test.ts`

Expected: FAIL because `./settlement`, `./expense`, and `./user` do not exist.

- [ ] **Step 3: Implement domain types and calculation**

Before writing this implementation, check `docs/migration/existing-inventory.md` for the existing settlement rounding rule. The code below assumes the old behavior is half of the difference rounded down with `Math.floor`. If the inventory shows a different rule, update this task's expected amount and implementation to match the inventory before coding.

Create `packages/shared/src/domain/expense.ts`:

```ts
export type Expense = {
  id: string;
  userId: string;
  date: string;
  price: number;
  category: string;
  memo: string | null;
  version: number;
};
```

Create `packages/shared/src/domain/user.ts`:

```ts
export type User = {
  id: string;
  lineUserId: string;
  displayName: string;
  notifyEnabled: boolean;
};

export type HouseholdUsers = readonly [User, User];

export function findPartnerUser(users: HouseholdUsers, actorUserId: string): User | null {
  return users.find((user) => user.id !== actorUserId) ?? null;
}
```

Create `packages/shared/src/domain/settlement.ts`:

```ts
import type { Expense } from "./expense";
import type { HouseholdUsers } from "./user";

export type UserMonthlyTotal = {
  userId: string;
  displayName: string;
  total: number;
};

export type MonthlySettlement = {
  fromUserId: string | null;
  toUserId: string | null;
  amount: number;
};

export type MonthlySettlementSummary = {
  month: string;
  householdTotal: number;
  userTotals: UserMonthlyTotal[];
  difference: number;
  settlement: MonthlySettlement;
};

export function calculateMonthlySettlement(
  month: string,
  users: HouseholdUsers,
  expenses: readonly Expense[],
): MonthlySettlementSummary {
  const userTotals = users.map((user) => ({
    userId: user.id,
    displayName: user.displayName,
    total: expenses
      .filter((expense) => expense.userId === user.id && expense.date.startsWith(`${month}-`))
      .reduce((sum, expense) => sum + expense.price, 0),
  }));

  const [first, second] = userTotals;
  const householdTotal = userTotals.reduce((sum, userTotal) => sum + userTotal.total, 0);
  const difference = Math.abs(first.total - second.total);
  const amount = Math.floor(difference / 2);

  if (amount === 0) {
    return {
      month,
      householdTotal,
      userTotals,
      difference,
      settlement: { fromUserId: null, toUserId: null, amount: 0 },
    };
  }

  const payer = first.total < second.total ? first : second;
  const receiver = first.total > second.total ? first : second;

  return {
    month,
    householdTotal,
    userTotals,
    difference,
    settlement: {
      fromUserId: payer.userId,
      toUserId: receiver.userId,
      amount,
    },
  };
}
```

Modify `packages/shared/src/index.ts`:

```ts
export type { Expense } from "./domain/expense";
export type { HouseholdUsers, User } from "./domain/user";
export { findPartnerUser } from "./domain/user";
export type {
  MonthlySettlement,
  MonthlySettlementSummary,
  UserMonthlyTotal,
} from "./domain/settlement";
export { calculateMonthlySettlement } from "./domain/settlement";
```

- [ ] **Step 4: Run tests**

Run: `pnpm test packages/shared/src/domain/settlement.test.ts`

Expected: PASS.

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src
git commit -m "feat: add shared settlement domain"
```

---

### Task 3: Notification Event and Deduplication Domain

**Files:**
- Create: `packages/shared/src/domain/notification.ts`
- Create: `packages/shared/src/domain/notification.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write failing notification tests**

Create `packages/shared/src/domain/notification.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildExpenseEventId, shouldSendNotification } from "./notification";

describe("buildExpenseEventId", () => {
  it("includes event type, expense id, and version", () => {
    expect(buildExpenseEventId("expense.updated", "exp_1", 3)).toBe("expense.updated:exp_1:v3");
  });
});

describe("shouldSendNotification", () => {
  it("does not send when recipient disabled notifications", () => {
    expect(shouldSendNotification({ notifyEnabled: false, histories: [] })).toBe(false);
  });

  it("does not send when successful delivery already exists", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        histories: [{ deliveryStatus: "success" }],
      }),
    ).toBe(false);
  });

  it("does not send when skipped history already exists", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        histories: [{ deliveryStatus: "skipped" }],
      }),
    ).toBe(false);
  });

  it("sends when recipient is enabled and no success history exists", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        histories: [{ deliveryStatus: "failed" }],
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test packages/shared/src/domain/notification.test.ts`

Expected: FAIL because `./notification` does not exist.

- [ ] **Step 3: Implement notification domain**

Create `packages/shared/src/domain/notification.ts`:

```ts
export type ExpenseEventType = "expense.created" | "expense.updated" | "expense.deleted";
export type NotificationDeliveryStatus = "success" | "failed" | "skipped";

export type NotificationHistory = {
  id: string;
  eventType: string;
  eventId: string;
  sentToUserId: string;
  sentAt: string;
  deliveryStatus: NotificationDeliveryStatus;
  providerMessageId: string | null;
  errorReason: string | null;
};

export function buildExpenseEventId(
  eventType: ExpenseEventType,
  expenseId: string,
  version: number,
): string {
  return `${eventType}:${expenseId}:v${version}`;
}

export function buildMonthlySettlementEventId(month: string): string {
  return `settlement.monthly:${month}`;
}

export function shouldSendNotification(input: {
  notifyEnabled: boolean;
  histories: readonly Pick<NotificationHistory, "deliveryStatus">[];
}): boolean {
  if (!input.notifyEnabled) {
    return false;
  }

  return !input.histories.some(
    (history) => history.deliveryStatus === "success" || history.deliveryStatus === "skipped",
  );
}
```

Modify `packages/shared/src/index.ts`:

```ts
export type { Expense } from "./domain/expense";
export type { HouseholdUsers, User } from "./domain/user";
export { findPartnerUser } from "./domain/user";
export type {
  MonthlySettlement,
  MonthlySettlementSummary,
  UserMonthlyTotal,
} from "./domain/settlement";
export { calculateMonthlySettlement } from "./domain/settlement";
export type {
  ExpenseEventType,
  NotificationDeliveryStatus,
  NotificationHistory,
} from "./domain/notification";
export {
  buildExpenseEventId,
  buildMonthlySettlementEventId,
  shouldSendNotification,
} from "./domain/notification";
```

- [ ] **Step 4: Run tests**

Run: `pnpm test packages/shared/src/domain/notification.test.ts`

Expected: PASS.

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src
git commit -m "feat: add notification domain rules"
```

---

### Task 4: OpenAPI Contract Update

**Files:**
- Create: `packages/api-contract/package.json`
- Modify: `packages/api-contract/openapi.yaml`

- [ ] **Step 1: Add contract lint tooling**

Create `packages/api-contract/package.json`:

```json
{
  "name": "@shared-expense/api-contract",
  "private": true,
  "type": "module",
  "scripts": {
    "lint": "redocly lint openapi.yaml",
    "build": "pnpm lint",
    "typecheck": "pnpm lint"
  },
  "devDependencies": {
    "@redocly/cli": "^1.34.0"
  }
}
```

- [ ] **Step 2: Add contract requirements**

Modify `packages/api-contract/openapi.yaml` so that:

- `CreateExpenseRequest` no longer requires `userId`.
- `Expense` includes required `version`.
- POST, PUT, and DELETE operations accept `Idempotency-Key` header. DELETE uses the key to avoid duplicate delete notifications when a client retries after a network failure.
- `PUT /api/expenses/{id}` accepts required `version` in `UpdateExpenseRequest`.
- `PUT /api/expenses/{id}` can return `409 Conflict`.
- Add `GET /api/settlements?month=YYYY-MM`.
- Add `SettlementSummaryResponse`, `UserMonthlyTotal`, and `MonthlySettlement`.
- Replace `https://api.example.com` with the actual planned production API hostname if it is known. If it is not known during this task, remove the production server entry and keep only `http://localhost:8787` until deployment planning defines the production URL.

Use this schema shape for settlement responses:

```yaml
    SettlementSummaryResponse:
      type: object
      additionalProperties: false
      required:
        - month
        - householdTotal
        - userTotals
        - difference
        - settlement
      properties:
        month:
          type: string
          pattern: '^\\d{4}-\\d{2}$'
          example: '2026-06'
        householdTotal:
          type: integer
          minimum: 0
          example: 14000
        userTotals:
          type: array
          items:
            $ref: '#/components/schemas/UserMonthlyTotal'
        difference:
          type: integer
          minimum: 0
          example: 6000
        settlement:
          $ref: '#/components/schemas/MonthlySettlement'
    UserMonthlyTotal:
      type: object
      additionalProperties: false
      required:
        - userId
        - displayName
        - total
      properties:
        userId:
          type: string
        displayName:
          type: string
        total:
          type: integer
          minimum: 0
    MonthlySettlement:
      type: object
      additionalProperties: false
      required:
        - fromUserId
        - toUserId
        - amount
      properties:
        fromUserId:
          type: string
          nullable: true
        toUserId:
          type: string
          nullable: true
        amount:
          type: integer
          minimum: 0
```

- [ ] **Step 3: Verify contract text and syntax**

Run: `rg -n "settlements|Idempotency-Key|409|version|userId" packages/api-contract/openapi.yaml`

Expected:

- `settlements` appears in paths.
- `Idempotency-Key` appears on mutating operations.
- `409` appears on update.
- `CreateExpenseRequest` does not list `userId` under `required`.

Run: `pnpm --filter @shared-expense/api-contract lint`

Expected: PASS with a valid OpenAPI document.

- [ ] **Step 4: Commit**

```bash
git add packages/api-contract/package.json packages/api-contract/openapi.yaml
git commit -m "feat: expand api contract for replacement scope"
```

---

### Task 5: Spreadsheet Repository Interfaces and Row Mapping

**Files:**
- Create: `packages/integrations/package.json`
- Create: `packages/integrations/tsconfig.json`
- Create: `packages/integrations/src/spreadsheet/expense-row.ts`
- Create: `packages/integrations/src/spreadsheet/expense-row.test.ts`
- Create: `packages/integrations/src/index.ts`

- [ ] **Step 1: Write failing row mapping tests**

Create `packages/integrations/src/spreadsheet/expense-row.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { expenseFromRow, expenseToRow } from "./expense-row";

describe("expense row mapping", () => {
  it("maps a spreadsheet row to an Expense", () => {
    expect(expenseFromRow(["exp_1", "user_a", "2026-06-03", "1000", "food", "", "2"])).toEqual({
      id: "exp_1",
      userId: "user_a",
      date: "2026-06-03",
      price: 1000,
      category: "food",
      memo: null,
      version: 2,
    });
  });

  it("maps an Expense to a spreadsheet row", () => {
    expect(
      expenseToRow({
        id: "exp_1",
        userId: "user_a",
        date: "2026-06-03",
        price: 1000,
        category: "food",
        memo: "lunch",
        version: 2,
      }),
    ).toEqual(["exp_1", "user_a", "2026-06-03", "1000", "food", "lunch", "2"]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test packages/integrations/src/spreadsheet/expense-row.test.ts`

Expected: FAIL because the package and mapper do not exist.

- [ ] **Step 3: Implement integrations package and mapper**

Create `packages/integrations/package.json`:

```json
{
  "name": "@shared-expense/integrations",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@shared-expense/shared": "workspace:*"
  }
}
```

Create `packages/integrations/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/integrations/src/spreadsheet/expense-row.ts`:

```ts
import type { Expense } from "@shared-expense/shared";

export type ExpenseRow = [string, string, string, string, string, string, string];

export function expenseFromRow(row: ExpenseRow): Expense {
  return {
    id: row[0],
    userId: row[1],
    date: row[2],
    price: Number.parseInt(row[3], 10),
    category: row[4],
    memo: row[5] === "" ? null : row[5],
    version: Number.parseInt(row[6], 10),
  };
}

export function expenseToRow(expense: Expense): ExpenseRow {
  return [
    expense.id,
    expense.userId,
    expense.date,
    String(expense.price),
    expense.category,
    expense.memo ?? "",
    String(expense.version),
  ];
}
```

Create `packages/integrations/src/index.ts`:

```ts
export type { ExpenseRow } from "./spreadsheet/expense-row";
export { expenseFromRow, expenseToRow } from "./spreadsheet/expense-row";
```

This row mapper is valid only after Task 7 confirms that the existing Spreadsheet column order is `id`, `userId`, `date`, `price`, `category`, `memo`, `version`. If the inventory finds a different order, update the test row and `ExpenseRow` tuple in this task before implementation.

- [ ] **Step 4: Run tests**

Run: `pnpm test packages/integrations/src/spreadsheet/expense-row.test.ts`

Expected: PASS.

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/integrations
git commit -m "feat: add spreadsheet expense row mapping"
```

---

### Task 6: API Application Skeleton and LIFF Auth Boundary

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/auth/liff-token.ts`
- Create: `apps/api/src/auth/liff-token.test.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/index.ts`

- [ ] **Step 1: Write failing auth tests**

Create `apps/api/src/auth/liff-token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AuthError, resolveAuthenticatedUser } from "./liff-token";

describe("resolveAuthenticatedUser", () => {
  it("returns the mapped user for a verified token subject", async () => {
    const user = await resolveAuthenticatedUser({
      token: "valid",
      channelId: "channel_1",
      verifyToken: async () => ({
        iss: "https://access.line.me",
        aud: "channel_1",
        exp: Math.floor(Date.now() / 1000) + 60,
        sub: "line_a",
      }),
      findUserByLineUserId: async () => ({
        id: "user_a",
        lineUserId: "line_a",
        displayName: "A",
        notifyEnabled: true,
      }),
    });

    expect(user.id).toBe("user_a");
  });

  it("rejects a token with the wrong audience", async () => {
    await expect(
      resolveAuthenticatedUser({
        token: "valid",
        channelId: "channel_1",
        verifyToken: async () => ({
          iss: "https://access.line.me",
          aud: "other_channel",
          exp: Math.floor(Date.now() / 1000) + 60,
          sub: "line_a",
        }),
        findUserByLineUserId: async () => null,
      }),
    ).rejects.toMatchObject(new AuthError(401, "invalid_audience", "Invalid LIFF token audience"));
  });

  it("rejects an expired token with 401", async () => {
    await expect(
      resolveAuthenticatedUser({
        token: "expired",
        channelId: "channel_1",
        verifyToken: async () => ({
          iss: "https://access.line.me",
          aud: "channel_1",
          exp: Math.floor(Date.now() / 1000) - 1,
          sub: "line_a",
        }),
        findUserByLineUserId: async () => null,
      }),
    ).rejects.toMatchObject(new AuthError(401, "expired_token", "Expired LIFF token"));
  });

  it("rejects an unmapped LINE user with 403", async () => {
    await expect(
      resolveAuthenticatedUser({
        token: "valid",
        channelId: "channel_1",
        verifyToken: async () => ({
          iss: "https://access.line.me",
          aud: "channel_1",
          exp: Math.floor(Date.now() / 1000) + 60,
          sub: "line_unknown",
        }),
        findUserByLineUserId: async () => null,
      }),
    ).rejects.toMatchObject(new AuthError(403, "user_not_allowed", "LIFF user is not allowed"));
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test apps/api/src/auth/liff-token.test.ts`

Expected: FAIL because `./liff-token` does not exist.

- [ ] **Step 3: Implement auth boundary**

Create `apps/api/package.json`. Do not add `@hono/node-server` in this task because the API targets Cloudflare Workers and the current app shell does not need a Node server runtime:

```json
{
  "name": "@shared-expense/api",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@shared-expense/shared": "workspace:*",
    "hono": "^4.8.0"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Create `apps/api/src/auth/liff-token.ts`:

```ts
import type { User } from "@shared-expense/shared";

export type LiffTokenClaims = {
  iss: string;
  aud: string;
  exp: number;
  sub: string;
};

export type ResolveAuthenticatedUserInput = {
  token: string;
  channelId: string;
  verifyToken: (token: string) => Promise<LiffTokenClaims>;
  findUserByLineUserId: (lineUserId: string) => Promise<User | null>;
};

export class AuthError extends Error {
  constructor(
    readonly status: 401 | 403,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function resolveAuthenticatedUser(input: ResolveAuthenticatedUserInput): Promise<User> {
  const claims = await input.verifyToken(input.token);
  const now = Math.floor(Date.now() / 1000);

  if (claims.iss !== "https://access.line.me") {
    throw new AuthError(401, "invalid_issuer", "Invalid LIFF token issuer");
  }

  if (claims.aud !== input.channelId) {
    throw new AuthError(401, "invalid_audience", "Invalid LIFF token audience");
  }

  if (claims.exp <= now) {
    throw new AuthError(401, "expired_token", "Expired LIFF token");
  }

  const user = await input.findUserByLineUserId(claims.sub);
  if (user === null) {
    throw new AuthError(403, "user_not_allowed", "LIFF user is not allowed");
  }

  return user;
}
```

Create `apps/api/src/app.ts`:

```ts
import { Hono } from "hono";

export function createApp(): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  return app;
}
```

Create `apps/api/src/index.ts`:

```ts
import { createApp } from "./app";

export default createApp();
```

- [ ] **Step 4: Run tests**

Run: `pnpm test apps/api/src/auth/liff-token.test.ts`

Expected: PASS.

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: add api auth boundary"
```

---

### Task 7: Inventory Existing Repositories Before Porting Business Logic

**Files:**
- Create: `docs/migration/existing-inventory.md`
- Modify: `.codex/tasks/todo.md`

- [ ] **Step 1: Clone or locate old repositories**

Run one of these commands depending on local availability:

```bash
git clone https://github.com/genki-sano/mm-server ../temp/mm-server
git clone https://github.com/genki-sano/mm-client ../temp/mm-client
git clone https://github.com/genki-sano/mm-gas ../temp/mm-gas
```

Expected: repositories are available under `../temp/`.

- [ ] **Step 2: Search old code for inventory facts**

Run:

```bash
rg -n "router|app\\.|fetch|Spreadsheet|Sheet|LINE|line|cron|trigger|settle|精算|notify|通知" ../temp/mm-server ../temp/mm-client ../temp/mm-gas
```

Expected: relevant old API, Spreadsheet, GAS, LINE, and settlement references are found.

- [ ] **Step 3: Write inventory with only observed facts**

Create `docs/migration/existing-inventory.md` with concrete facts from Step 2. Use section headings only after at least one fact is observed for that section. Do not commit the file if it contains angle-bracket markers or empty tables.

```md
# Existing MM Inventory

## Source Repositories

- `mm-server`: available at `../temp/mm-server`
- `mm-client`: available at `../temp/mm-client`
- `mm-gas`: available at `../temp/mm-gas`
```

For each API endpoint found, add a bullet with method, path, source file, request fields, response fields, and error behavior.

For each Spreadsheet sheet found, add a bullet with sheet name, source file, columns, required columns, and compatibility notes.

For each GAS job found, add a bullet with job name, schedule, sheets read, sheets written, notification behavior, and failure behavior.

For each LINE notification found, add a bullet with trigger, recipient rule, message text, and deduplication behavior.

For each settlement rule found, add a bullet with source file, formula, rounding behavior, and target-month handling.

- [ ] **Step 4: Commit**

```bash
git add docs/migration/existing-inventory.md .codex/tasks/todo.md
git commit -m "docs: inventory existing mm behavior"
```

## Self-Review Notes

- Spec coverage: this first implementation plan covers monorepo scaffolding, shared settlement calculation, notification deduplication rules, OpenAPI expansion, Spreadsheet mapping, LIFF auth boundary, and old repository inventory.
- Follow-up implementation plans are required for API Expense/Settlement routes, real Spreadsheet repositories, LINE adapter, Workers Cron, LIFF UI, Cloudflare deployment config, and cutover rehearsal.
- Placeholder scan: no immediate implementation step uses unresolved implementation placeholders. Task 7 requires observed facts from old repositories before the inventory file is committed.
- Type consistency: `Expense.version`, `Idempotency-Key`, `NotificationHistory.deliveryStatus`, `MonthlySettlementSummary`, and LIFF token subject mapping match the approved design spec.
