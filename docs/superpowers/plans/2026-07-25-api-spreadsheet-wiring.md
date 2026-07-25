# API Spreadsheet Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the API Expense list route to the Spreadsheet-backed repository when Spreadsheet environment variables are present.

**Architecture:** Add a fetch-based Google Sheets values client in `packages/integrations`, then add `createAppFromEnv` in `apps/api` to choose `SpreadsheetExpenseRepository` with `user_type` mapping `1 -> woman` and `2 -> man`. Keep Google access-token issuance out of this slice.

**Tech Stack:** TypeScript, Hono, Vitest, Google Sheets REST values API, pnpm workspaces.

---

## Tasks

- [x] Write failing tests for `FetchGoogleSheetsValuesClient`.
- [x] Implement `FetchGoogleSheetsValuesClient` and export it.
- [x] Write failing tests for `createAppFromEnv`.
- [x] Implement API env wiring for Spreadsheet repository.
- [x] Verify targeted tests, `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- [x] Commit the completed slice.
