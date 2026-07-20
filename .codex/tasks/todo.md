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

## Task 2: Shared Domain Models and Settlement Calculation

### Checklist

- [x] Write failing settlement tests
- [x] Verify RED with `pnpm test packages/shared/src/domain/settlement.test.ts`
- [x] Implement Expense, User, HouseholdUsers, partner lookup, and settlement domain
- [x] Export shared settlement domain APIs
- [x] Verify GREEN with targeted settlement test
- [x] Run `pnpm typecheck`
- [x] Commit shared settlement domain

### Progress Log

- 2026-07-20 13:29 JST: Started Task 2 in `.worktrees/implementation`.
- 2026-07-20 13:29 JST: Confirmed inventory states monthly settlement uses `Math.ceil(Math.abs(womanPrice - manPrice) / 2)`.
- 2026-07-20 13:29 JST: Added settlement tests before implementation.
- 2026-07-20 13:31 JST: Implemented shared expense/user/settlement domain types and exports.
- 2026-07-20 13:32 JST: Committed shared settlement domain.

### Verification Log

- 2026-07-20 13:30 JST: `pnpm test packages/shared/src/domain/settlement.test.ts` failed as expected because `./settlement` did not exist.
- 2026-07-20 13:31 JST: `pnpm test packages/shared/src/domain/settlement.test.ts` passed with 3 tests.
- 2026-07-20 13:31 JST: `pnpm typecheck` failed because `users.map` widened tuple totals to an array, making destructured entries possibly undefined.
- 2026-07-20 13:31 JST: Re-ran `pnpm test packages/shared/src/domain/settlement.test.ts`; it passed with 3 tests.
- 2026-07-20 13:31 JST: Re-ran `pnpm typecheck`; it passed for `@shared-expense/shared`.
- 2026-07-20 13:32 JST: Final pre-commit `pnpm test packages/shared/src/domain/settlement.test.ts` passed with 3 tests.
- 2026-07-20 13:32 JST: Final pre-commit `pnpm typecheck` passed for `@shared-expense/shared`.
- 2026-07-20 13:32 JST: `git commit -m "feat: add shared settlement domain"` created the Task 2 commit.

## Task 2 Quality Review Fix: Partner Lookup Membership Guard

### Checklist

- [x] Add failing `findPartnerUser` tests
- [x] Verify RED with `pnpm test packages/shared/src/domain/user.test.ts`
- [x] Fix `findPartnerUser` to return `null` for non-household actors
- [x] Verify GREEN with user and settlement domain tests
- [x] Run `pnpm typecheck`
- [x] Amend Task 2 commit

### Progress Log

- 2026-07-20 13:34 JST: Started CHANGES_REQUIRED fix for `findPartnerUser` membership handling.
- 2026-07-20 13:34 JST: Added user domain tests before changing implementation.
- 2026-07-20 13:38 JST: Updated `findPartnerUser` to check actor membership before returning a partner.
- 2026-07-20 13:39 JST: Prepared Task 2 amend with the quality review fix.

### Verification Log

- 2026-07-20 13:37 JST: `pnpm test packages/shared/src/domain/user.test.ts` failed as expected; non-household `user_x` returned `user_a` instead of `null`.
- 2026-07-20 13:38 JST: `pnpm test packages/shared/src/domain/user.test.ts packages/shared/src/domain/settlement.test.ts` passed with 6 tests across 2 files.
- 2026-07-20 13:38 JST: `pnpm typecheck` passed for `@shared-expense/shared`.

## Task 3: Notification Event and Deduplication Domain

### Checklist

- [x] Write failing notification tests
- [x] Verify RED with `pnpm test packages/shared/src/domain/notification.test.ts`
- [x] Implement notification event ID and deduplication domain
- [x] Export shared notification domain APIs
- [x] Verify GREEN with targeted notification test
- [x] Run `pnpm typecheck`
- [x] Commit notification domain rules

### Progress Log

- 2026-07-20 13:41 JST: Started Task 3 in `.worktrees/implementation`.
- 2026-07-20 13:42 JST: Added notification domain tests before implementation.
- 2026-07-20 13:42 JST: Implemented notification event ID builders, delivery deduplication rule, and shared exports.
- 2026-07-20 13:43 JST: Prepared commit `feat: add notification domain rules`.

## Task 3 Quality Review Fix: Notification Deduplication Key

### Checklist

- [x] Add failing exact-key and mismatch-key notification tests
- [x] Verify RED with `pnpm test packages/shared/src/domain/notification.test.ts`
- [x] Add `NotificationDeduplicationKey` and require it in `shouldSendNotification`
- [x] Filter histories by exact `eventType`, `eventId`, and `sentToUserId`
- [x] Export `NotificationDeduplicationKey`
- [x] Verify GREEN with targeted notification test
- [x] Run `pnpm typecheck`
- [x] Amend Task 3 commit

### Progress Log

- 2026-07-20 13:47 JST: Started CHANGES_REQUIRED fix for notification deduplication key handling.
- 2026-07-20 13:47 JST: Added tests for exact-key success/skipped suppression and mismatch-key success history ignoring.
- 2026-07-20 13:47 JST: Updated `shouldSendNotification` to require a deduplication key and consider only exact matching histories.

### Verification Log

- 2026-07-20 13:41 JST: Baseline `pnpm test packages/shared/src/domain/settlement.test.ts` passed with 3 tests.
- 2026-07-20 13:42 JST: `pnpm test packages/shared/src/domain/notification.test.ts` failed as expected because `./notification` did not exist.
- 2026-07-20 13:42 JST: `pnpm test packages/shared/src/domain/notification.test.ts` passed with 7 tests.
- 2026-07-20 13:42 JST: `pnpm typecheck` passed for `@shared-expense/shared`.
- 2026-07-20 13:42 JST: Final pre-commit `pnpm test packages/shared/src/domain/notification.test.ts` passed with 7 tests.
- 2026-07-20 13:42 JST: Final pre-commit `pnpm typecheck` passed for `@shared-expense/shared`.
- 2026-07-20 13:47 JST: `pnpm test packages/shared/src/domain/notification.test.ts` failed as expected with 3 failing mismatch-key cases: different `eventId`, `sentToUserId`, and `eventType` success histories returned false instead of true.
- 2026-07-20 13:47 JST: `pnpm test packages/shared/src/domain/notification.test.ts` passed with 12 tests.
- 2026-07-20 13:48 JST: `pnpm typecheck` passed for `@shared-expense/shared`.
- 2026-07-20 13:48 JST: Final pre-amend `pnpm test packages/shared/src/domain/notification.test.ts` passed with 12 tests.
- 2026-07-20 13:48 JST: Final pre-amend `pnpm typecheck` passed for `@shared-expense/shared`.

## Task 4: OpenAPI Contract Update

### Checklist

- [x] Create `packages/api-contract/package.json`
- [x] Run `pnpm install` to update `pnpm-lock.yaml`
- [x] Remove production placeholder server from OpenAPI
- [x] Remove `userId` from `CreateExpenseRequest`
- [x] Add expense `version`, mutation idempotency headers, update conflict response, and settlement API schemas
- [x] Verify contract grep, OpenAPI lint, and root typecheck
- [x] Commit OpenAPI contract update

### Progress Log

- 2026-07-20 13:51 JST: Started Task 4 in `.worktrees/implementation`.
- 2026-07-20 13:51 JST: Confirmed `@shared-expense/api-contract` package did not exist yet.
- 2026-07-20 13:51 JST: Created contract package and updated `openapi.yaml` for local-only server, actor-derived create requests, expense versioning, idempotent mutations, conflict response, and monthly settlements.
- 2026-07-20 13:52 JST: Updated `pnpm-lock.yaml` with `@redocly/cli`.

### Verification Log

- 2026-07-20 13:51 JST: Baseline `pnpm --filter @shared-expense/api-contract lint` exited with "No projects matched the filters", confirming the contract package was missing before this task.
- 2026-07-20 13:52 JST: Initial `CI=true pnpm install --no-frozen-lockfile` failed in sandbox with `getaddrinfo ENOTFOUND registry.npmjs.org`; reran with network approval and succeeded.
- 2026-07-20 13:52 JST: `rg -n "settlements|Idempotency-Key|409|version|userId|api.example.com" packages/api-contract/openapi.yaml` showed `settlements`, `Idempotency-Key`, `409`, and `version`; it showed no `api.example.com`.
- 2026-07-20 13:52 JST: `pnpm --filter @shared-expense/api-contract lint` succeeded; Redocly reported a valid OpenAPI document with warnings for missing `info.license` and localhost server URL.
- 2026-07-20 13:52 JST: Checked `CreateExpenseRequest` block directly and confirmed `userId` is absent from both `required` and `properties`.
- 2026-07-20 13:52 JST: `pnpm typecheck` succeeded for `@shared-expense/api-contract` and `@shared-expense/shared`; Redocly repeated the same two warnings.

## Task 4 Spec Review Fix: Household Forbidden Response

### Checklist

- [x] Add `components.responses.Forbidden`
- [x] Add `403` response to all Expense operations
- [x] Add `403` response to Settlement summary operation
- [x] Verify OpenAPI grep, contract lint, and root typecheck
- [x] Amend Task 4 commit

### Progress Log

- 2026-07-20 13:59 JST: Started CHANGES_REQUIRED fix for missing `403 Forbidden` response when a valid token does not resolve to a household user.
- 2026-07-20 13:59 JST: Added shared `Forbidden` response and referenced it from all Expense and Settlement operations.

### Verification Log

- 2026-07-20 13:59 JST: Baseline `rg -n "Forbidden|403|Unauthorized|/api/expenses|/api/settlements" packages/api-contract/openapi.yaml` showed `401` responses but no `403` or `Forbidden`.
- 2026-07-20 13:59 JST: `rg -n "403|Forbidden" packages/api-contract/openapi.yaml` succeeded and showed 5 operation-level `403` responses plus `components.responses.Forbidden`.
- 2026-07-20 13:59 JST: `pnpm --filter @shared-expense/api-contract lint` succeeded; Redocly reported a valid OpenAPI document with the existing warnings for missing `info.license` and localhost server URL.
- 2026-07-20 13:59 JST: `pnpm typecheck` succeeded for `@shared-expense/api-contract` and `@shared-expense/shared`; Redocly repeated the same two warnings.

## Task 4 Quality Review Fix: Required Idempotency and No-op Update Guard

### Checklist

- [x] Make `components.parameters.IdempotencyKey` required
- [x] Change `UpdateExpenseRequest.minProperties` to 2
- [x] Verify OpenAPI grep, contract lint, and root typecheck
- [x] Amend Task 4 commit

### Progress Log

- 2026-07-20 14:04 JST: Started CHANGES_REQUIRED fix for required mutation idempotency and no-op update prevention.
- 2026-07-20 14:04 JST: Updated `Idempotency-Key` to be required for POST/PUT/DELETE references and changed `UpdateExpenseRequest.minProperties` to 2 because `version` alone is not a meaningful update.

### Verification Log

- 2026-07-20 14:04 JST: Baseline `rg -n "IdempotencyKey|required: false|required: true|minProperties" packages/api-contract/openapi.yaml` showed `components.parameters.IdempotencyKey.required: false` and `UpdateExpenseRequest.minProperties: 1`.
- 2026-07-20 14:04 JST: `rg -n "IdempotencyKey|required: true|minProperties: 2" packages/api-contract/openapi.yaml` succeeded and showed `IdempotencyKey.required: true` plus `UpdateExpenseRequest.minProperties: 2`.
- 2026-07-20 14:04 JST: `pnpm --filter @shared-expense/api-contract lint` succeeded; Redocly reported a valid OpenAPI document with the existing warnings for missing `info.license` and localhost server URL.
- 2026-07-20 14:04 JST: `pnpm typecheck` succeeded for `@shared-expense/api-contract` and `@shared-expense/shared`; Redocly repeated the same two warnings.

## Task 5: Spreadsheet Repository Interfaces and Row Mapping

### Checklist

- [x] Write failing legacy payments row mapping tests
- [x] Verify RED with `pnpm test packages/integrations/src/spreadsheet/expense-row.test.ts`
- [x] Create integrations package skeleton
- [x] Implement legacy payments A-K row mapper
- [x] Export integrations APIs
- [x] Verify GREEN with targeted expense row test
- [x] Run `pnpm typecheck`
- [x] Commit spreadsheet expense row mapping

### Progress Log

- 2026-07-20 14:08 JST: Started Task 5 in `.worktrees/implementation`.
- 2026-07-20 14:08 JST: Confirmed plan Task 5's provisional mapper is superseded by inventory compatibility requirements for legacy `payments` A-K columns.
- 2026-07-20 14:08 JST: Added tests for legacy `payments` row to `Expense`, memo preservation, `Expense` to legacy row, and unknown `userId` rejection before implementation.
- 2026-07-20 14:09 JST: Created `@shared-expense/integrations` package skeleton and implemented legacy `payments` A-K mapper with injected user conversion functions.
- 2026-07-20 14:11 JST: Re-ran `pnpm install --force` with network approval after sandbox DNS failure to restore dependencies and workspace links for the new package.
- 2026-07-20 14:12 JST: Included `pnpm-lock.yaml` because the new workspace package adds a lockfile importer for `packages/integrations`.

### Verification Log

- 2026-07-20 14:08 JST: `pnpm test packages/integrations/src/spreadsheet/expense-row.test.ts` failed as expected because `./expense-row` did not exist.
- 2026-07-20 14:09 JST: `pnpm test packages/integrations/src/spreadsheet/expense-row.test.ts` passed with 4 tests.
- 2026-07-20 14:10 JST: Initial `pnpm typecheck` failed because the newly added workspace package did not yet have a local link for `@shared-expense/shared`.
- 2026-07-20 14:11 JST: `pnpm install --force` first failed in the sandbox with `getaddrinfo ENOTFOUND registry.npmjs.org`; reran with network approval and succeeded.
- 2026-07-20 14:11 JST: Re-ran `pnpm test packages/integrations/src/spreadsheet/expense-row.test.ts`; it passed with 4 tests.
- 2026-07-20 14:11 JST: Re-ran `pnpm typecheck`; it passed for `@shared-expense/api-contract`, `@shared-expense/shared`, and `@shared-expense/integrations`. Redocly repeated existing warnings for missing `info.license` and localhost server URL.

## Task 5 Quality Review Fix: Strict Legacy Row Validation

### Checklist

- [x] Add failing tests for unknown legacy userType, invalid price, invalid legacy date, and invalid ISO expense date
- [x] Verify RED with `pnpm test packages/integrations/src/spreadsheet/expense-row.test.ts`
- [x] Change `UserTypeToUserId` to return `string | null`
- [x] Reject unknown legacy userType in `expenseFromLegacyPaymentRow`
- [x] Reject non-integer or unsafe legacy payment prices
- [x] Reject non-date-only legacy and ISO date formats
- [x] Verify GREEN with targeted expense row test
- [x] Run `pnpm typecheck`
- [x] Amend Task 5 commit

### Progress Log

- 2026-07-20 14:18 JST: Started CHANGES_REQUIRED fix for strict boundary validation in the legacy Spreadsheet row mapper.
- 2026-07-20 14:18 JST: Added tests before implementation for unknown `userType`, invalid price strings, legacy date with timestamp, and ISO datetime input.
- 2026-07-20 14:19 JST: Updated mapper validation so unknown user mappings return errors instead of becoming normal data, prices must be digit-only safe integers, and dates must be date-only strings.

### Verification Log

- 2026-07-20 14:18 JST: `pnpm test packages/integrations/src/spreadsheet/expense-row.test.ts` failed as expected with 6 failing cases that did not throw before the fix.
- 2026-07-20 14:19 JST: `pnpm test packages/integrations/src/spreadsheet/expense-row.test.ts` passed with 10 tests.
- 2026-07-20 14:19 JST: `pnpm typecheck` passed for `@shared-expense/api-contract`, `@shared-expense/shared`, and `@shared-expense/integrations`. Redocly repeated existing warnings for missing `info.license` and localhost server URL.
