# Expense CRUD API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/expenses`, `PUT /api/expenses/{id}`, and `DELETE /api/expenses/{id}` through the Spreadsheet-backed repository.

**Architecture:** Extend the existing `ExpenseRepository` interface with mutation methods and keep HTTP validation in `apps/api/src/expenses/routes.ts`. Spreadsheet writes stay inside `packages/integrations/src/spreadsheet/expense-repository.ts`, using the existing legacy row mapper and `payments` sheet shape.

**Tech Stack:** TypeScript, Hono, Vitest, Google Sheets values API, pnpm workspace.

---

### Task 1: Repository Mutation Contract

**Files:**
- Modify: `apps/api/src/expenses/repository.ts`
- Modify: `packages/integrations/src/spreadsheet/expense-repository.ts`
- Modify tests: `packages/integrations/src/spreadsheet/expense-repository.test.ts`

- [ ] Add failing tests for create/update/delete against spreadsheet row operations.
- [ ] Extend repository input/output types for create, update, and delete.
- [ ] Add append/update/delete capabilities to the spreadsheet values client interface.
- [ ] Implement legacy row creation with actor-derived user type and timestamp.
- [ ] Implement update by finding the matching payment ID and writing the full row.
- [ ] Implement delete by clearing the matching payment row.

### Task 2: API Routes

**Files:**
- Modify: `apps/api/src/expenses/routes.ts`
- Modify tests: `apps/api/src/app.test.ts`

- [ ] Add failing route tests for create/update/delete success.
- [ ] Add failing route tests for missing `Idempotency-Key`, invalid JSON/body, not found, and version conflict.
- [ ] Implement request parsing and validation matching `packages/api-contract/openapi.yaml`.
- [ ] Return `201`, `200`, `204`, `400`, `404`, and `409` responses as appropriate.

### Task 3: Env Wiring And Verification

**Files:**
- Modify as needed: `apps/api/src/app-env.test.ts`
- Modify as needed: `packages/integrations/src/spreadsheet/google-sheets-values-client.ts`
- Modify as needed: `packages/integrations/src/spreadsheet/google-sheets-values-client.test.ts`

- [ ] Wire mutation methods through the fetch-backed Google Sheets values client.
- [ ] Verify targeted tests.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm build`.
- [ ] Commit the complete slice.
