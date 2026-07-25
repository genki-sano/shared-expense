# Expense List API Web Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the mobile monthly list preview to a real `GET /api/expenses?date=YYYY-MM` API slice.

**Architecture:** Add an injectable Expense repository interface to `apps/api`, implement the list route against it, and keep real Spreadsheet access out of this slice. Add a small frontend fetch adapter that reads the API response and let the Next.js page render fetched data with a local fallback for preview environments.

**Tech Stack:** TypeScript, Hono, Vitest, Next.js App Router, pnpm workspaces.

---

## File Structure

- Create `apps/api/src/expenses/repository.ts`: `ExpenseRepository` interface and in-memory implementation for tests/local wiring.
- Create `apps/api/src/expenses/routes.ts`: Hono route registration for monthly Expense list.
- Create `apps/api/src/app.test.ts`: route tests for valid month, invalid month, and sorted monthly filtering.
- Modify `apps/api/src/app.ts`: accept injectable repositories and register Expense routes.
- Create `apps/web/src/features/expenses/api.ts`: frontend API client and sample fallback data.
- Create `apps/web/src/features/expenses/api.test.ts`: fetch adapter tests.
- Modify `apps/web/src/app/page.tsx`: render data from the API adapter.
- Modify `.codex/tasks/todo.md`: progress and verification log.

## Tasks

- [x] Write failing API route tests for `GET /api/expenses?date=YYYY-MM`.
- [x] Implement `ExpenseRepository`, in-memory list filtering, and Hono route registration.
- [x] Write failing frontend API adapter tests.
- [x] Implement frontend fetch adapter with fallback behavior.
- [x] Update `page.tsx` to render fetched monthly data.
- [x] Verify targeted tests, `pnpm test`, `pnpm typecheck`, and `pnpm build`.
