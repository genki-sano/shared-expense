# Task: shared-expense monorepo replacement design

## Checklist

- [x] Explore current workspace instructions and existing docs
- [x] Confirm monorepo replacement direction
- [x] Confirm initial scope: full replacement before feature additions
- [x] Confirm Spreadsheet migration stance
- [x] Confirm authentication stance
- [x] Confirm update notification recipient rule
- [x] Clarify initial LIFF UI information architecture
- [x] Clarify monthly settlement reminder content
- [x] Clarify existing code migration policy
- [x] Propose implementation approaches and recommendation
- [x] Present design for approval
- [x] Write approved spec
- [x] Self-review spec
- [x] Ask user to review spec before implementation planning
- [x] Receive user approval for the written spec
- [x] Draft implementation plan for first replacement slice
- [x] Review implementation plan
- [x] Commit implementation plan

## Notes

- Workspace is not currently a Git repository.
- Existing docs already favor TypeScript monorepo with Hono on Cloudflare Workers, LIFF frontend, Workers Cron, Spreadsheet continuity, and LINE Messaging API notifications.
- User confirmed monorepo direction.
- User chose initial release strategy A: complete replacement before feature additions.
- User chose Spreadsheet strategy B: maintain compatibility while adding necessary columns/sheets.
- User chose authentication strategy A: require LIFF ID token verification.
- User chose notification strategy C: notify the spouse/partner except the actor, while respecting `notifyEnabled`.
- User chose initial LIFF information architecture B: monthly list first.
- User chose monthly settlement reminder content B: settlement amount plus summary breakdown.
- User chose existing code migration policy B: read existing code and port only necessary business logic.
- User approved approach 1: contract-first migration.

## Verification Log

- Read `AGENTS.md`.
- Read `docs/01-architecture.md`.
- Read `docs/02-migration-plan.md`.
- Read `docs/03-implementation-guide.md`.
- Read `packages/api-contract/openapi.yaml`.
- Wrote `docs/superpowers/specs/2026-07-20-shared-expense-replacement-design.md`.
- Ran placeholder/scope scan with `rg`.
- Used a subagent design review and addressed findings around OpenAPI mismatch, initial Settlement scope, idempotency, version conflicts, notification event IDs, monthly reminder recipients, LIFF token validation, and cutover ordering.
- Initialized Git repository because the workspace did not have `.git`.
- Created initial design commit.
- User approved the written spec.
- Drafted `docs/superpowers/plans/2026-07-20-shared-expense-replacement-implementation.md`.
- Reviewed the plan with a subagent and fixed execution order, OpenAPI validation, idempotency scope, notification skipped handling, settlement rounding dependency, Spreadsheet mapping dependency, auth error status handling, workspace package exports, and production URL placeholder handling.
- Created implementation plan commit.

## Task 1: Monorepo Tooling Baseline

### Checklist

- [x] Create root package and workspace config
- [x] Create base TypeScript and Vitest config
- [x] Create shared package skeleton
- [x] Run `pnpm install`
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Commit monorepo tooling baseline

### Progress Log

- 2026-07-20 13:01 JST: Started Task 1 in `.worktrees/implementation`.
- 2026-07-20 13:01 JST: Created monorepo tooling baseline files.
- 2026-07-20 13:08 JST: Installed dependencies and ran baseline checks.
- 2026-07-20 13:09 JST: Committed monorepo tooling baseline.

### Verification Log

- 2026-07-20 13:01 JST: `pnpm install` failed because `pnpm` was not found (`zsh: command not found: pnpm`).
- 2026-07-20 13:01 JST: `command -v pnpm` exited 1 with no path.
- 2026-07-20 13:04 JST: Re-ran `pnpm install` after correcting file placement; it failed again with `zsh: command not found: pnpm`.
- 2026-07-20 13:07 JST: `pnpm install` initially failed with sandbox EPERM creating `/Users/genki.sano/.cache/node/corepack/v1`; reran with approval and succeeded.
- 2026-07-20 13:08 JST: `pnpm test` succeeded; Vitest reported no test files found and exited 0.
- 2026-07-20 13:08 JST: `pnpm typecheck` succeeded for `@shared-expense/shared`.

## Task 7: Inventory Existing Repositories Before Porting Business Logic

### Checklist

- [x] Confirm required old repository directories
- [x] Clone missing old repositories into `../temp`
- [x] Run required `rg` inventory search
- [x] Read relevant old source files
- [x] Create `docs/migration/existing-inventory.md`
- [x] Run inventory placeholder scan
- [x] Commit existing MM inventory

### Progress Log

- 2026-07-20 13:17 JST: Started Task 7 in `.worktrees/implementation` before Tasks 2, 4, and 5.
- 2026-07-20 13:17 JST: Confirmed `../temp/mm-server`, `../temp/mm-client`, and `../temp/mm-gas` were absent.
- 2026-07-20 13:17 JST: Cloned all three required repositories into `../temp`.
- 2026-07-20 13:17 JST: Ran the required cross-repository `rg` search and read relevant API, Spreadsheet, GAS, LINE, and settlement source files.
- 2026-07-20 13:17 JST: Created `docs/migration/existing-inventory.md` from observed source facts only.
- 2026-07-20 13:17 JST: Prepared commit `docs: inventory existing mm behavior`.
- 2026-07-20 13:25 JST: Addressed CHANGES_REQUIRED by adding compatibility risks for old Spreadsheet columns, mapper conversion, date conversion, and GAS/Cron cutover.

### Verification Log

- 2026-07-20 13:17 JST: `git clone https://github.com/genki-sano/mm-server ../temp/mm-server` first failed in the sandbox with `Could not resolve host: github.com`; reran with network approval and succeeded.
- 2026-07-20 13:17 JST: `git clone https://github.com/genki-sano/mm-client ../temp/mm-client` first failed in the sandbox with `Could not resolve host: github.com`; reran with network approval and succeeded.
- 2026-07-20 13:17 JST: `git clone https://github.com/genki-sano/mm-gas ../temp/mm-gas` first failed in the sandbox with `Could not resolve host: github.com`; reran with network approval and succeeded.
- 2026-07-20 13:17 JST: `rg -n "router|app\\.|fetch|Spreadsheet|Sheet|LINE|line|cron|trigger|settle|精算|notify|通知" ../temp/mm-server ../temp/mm-client ../temp/mm-gas` succeeded and returned matches across API, client, Spreadsheet, LINE, and GAS code.
- 2026-07-20 13:17 JST: `rg -n "<[^>]+>|TBD|TODO|Describe|空|未確認" docs/migration/existing-inventory.md` exited 1 with no output, matching the expected no-match result.
