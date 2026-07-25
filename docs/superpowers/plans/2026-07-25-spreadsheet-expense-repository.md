# Spreadsheet Expense Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read real Expense rows from the existing Google Spreadsheet `payments` sheet through a repository adapter.

**Architecture:** Keep Google Sheets access inside `packages/integrations`. The repository depends on a small `GoogleSheetsValuesClient` interface, reads `payments!A2:K`, converts rows through the existing legacy mapper, filters by month, and returns newest-first Expenses.

**Tech Stack:** TypeScript, Vitest, Google Sheets values API shape, pnpm workspaces.

---

## Tasks

- [x] Write failing tests for the Spreadsheet Expense repository.
- [x] Implement `GoogleSheetsValuesClient` and `SpreadsheetExpenseRepository`.
- [x] Export the repository from `packages/integrations`.
- [x] Verify targeted tests, `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- [x] Commit the completed slice.
