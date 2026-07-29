# Task: shared-expense monorepo replacement design

## Task: Fix API Wrangler Config Syntax

### Checklist

- [x] Inspect Cloudflare deploy parse error
- [x] Fix API Wrangler config JSON syntax
- [x] Keep only public production Worker vars
- [x] Update deploy config test to parse the Wrangler config
- [x] Verify targeted deploy config test passes
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Run API Wrangler dry-run
- [x] Commit changes

### Progress Log

- 2026-07-29 22:50 JST: Cloudflare deploy failed with `PropertyNameExpected` at `apps/api/wrangler.jsonc:11`, caused by a missing closing brace and trailing comma in the Worker config.
- 2026-07-29 22:50 JST: Fixed the config as valid JSON and changed the deploy config test to parse the file so syntax errors fail locally.
- 2026-07-29 22:52 JST: Removed `GOOGLE_SPREADSHEET_ID` and `LINE_LOGIN_CHANNEL_ID` from committed Worker vars so those identifiers stay in Cloudflare secrets/settings only.

### Verification Log

- 2026-07-29 22:47 JST: `pnpm test apps/api/src/deploy-config.test.ts` passed with 2 tests.
- 2026-07-29 22:47 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 22:48 JST: `pnpm build` passed for 6 workspace projects; Next.js generated `/` and `/_not-found` as static pages.
- 2026-07-29 22:48 JST: `pnpm --filter @shared-expense/api dry-run` passed and showed only public Worker vars in bindings.

## Task: Add Public Production API Worker Vars

### Checklist

- [x] Inspect pending API Wrangler vars
- [x] Remove Spreadsheet and LINE Login identifiers from committed Worker vars
- [x] Update deploy config test expectations
- [x] Verify targeted deploy config test passes
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 22:45 JST: User asked to keep the pending `apps/api/wrangler.jsonc` production vars.
- 2026-07-29 22:45 JST: User clarified `GOOGLE_SPREADSHEET_ID` and `LINE_LOGIN_CHANNEL_ID` should not be committed, so only public frontend origins and notification detail base URL remain in Worker vars.

### Verification Log

- 2026-07-29 22:40 JST: `pnpm test apps/api/src/deploy-config.test.ts` passed with 2 tests.
- 2026-07-29 22:41 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 22:41 JST: `pnpm build` passed for 6 workspace projects; Next.js generated `/` and `/_not-found` as static pages.

## Task: Log Authentication Failure Causes

### Checklist

- [x] Inspect current authentication failure handling
- [x] Add server-side authentication failure logging without tokens or secrets
- [x] Add focused tests for authentication failure logs
- [x] Verify targeted auth tests pass
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 22:25 JST: User hit `AUTH_UNAVAILABLE` in production and needs API logs to identify whether the cause is LINE verification, users sheet access, or auth configuration.
- 2026-07-29 22:25 JST: Found `authenticateRequest` returned categorized responses but did not log the underlying authentication error cause.

### Verification Log

- 2026-07-29 22:37 JST: `pnpm test apps/api/src/core/auth/request-auth.test.ts apps/api/src/core/auth/line-id-token.test.ts apps/api/src/app.test.ts` passed with 30 tests and confirmed authentication failure log output.
- 2026-07-29 22:37 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 22:38 JST: `pnpm build` passed for 6 workspace projects; Next.js generated `/` and `/_not-found` as static pages.

## Task: Split Authentication Error Responses

### Checklist

- [x] Inspect current authentication error handling
- [x] Add typed authentication errors
- [x] Split missing token, invalid token, unregistered user, and unavailable auth responses
- [x] Update frontend error display to use API `details.action`
- [x] Update OpenAPI auth error responses
- [x] Verify targeted auth/API/web tests pass
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 22:15 JST: User asked to distinguish authentication failure patterns instead of collapsing everything into one unauthorized message.
- 2026-07-29 22:15 JST: Current route authentication returned `null` for missing headers, invalid tokens, unknown LINE users, and authentication infrastructure errors.
- 2026-07-29 22:18 JST: Added typed authentication errors and split API responses into `AUTH_REQUIRED`, `AUTH_INVALID`, `USER_NOT_REGISTERED`, and `AUTH_UNAVAILABLE`.

### Verification Log

- 2026-07-29 22:18 JST: `pnpm test apps/api/src/app.test.ts apps/api/src/core/auth/line-id-token.test.ts packages/integrations/src/line/id-token-verifier.test.ts apps/web/src/features/expenses/api.test.ts` passed with 43 tests.
- 2026-07-29 22:18 JST: Initial `pnpm typecheck` failed because some test user fixtures did not satisfy the two-user `HouseholdUsers` tuple type.
- 2026-07-29 22:18 JST: Re-ran `pnpm test apps/api/src/app.test.ts apps/api/src/core/auth/line-id-token.test.ts packages/integrations/src/line/id-token-verifier.test.ts apps/web/src/features/expenses/api.test.ts`; it passed with 43 tests.
- 2026-07-29 22:18 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 22:19 JST: `pnpm build` passed for 6 workspace projects; Next.js generated `/` and `/_not-found` as static pages.

## Task: Improve Unauthorized Error Message

### Checklist

- [x] Inspect current API error handling
- [x] Convert monthly fetch errors to structured API errors
- [x] Map 401 responses to a user-facing login message
- [x] Update API 401 response body with an actionable next step
- [x] Update OpenAPI unauthorized response example
- [x] Verify targeted API and web tests pass
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 21:50 JST: User reported the raw unauthorized response was not actionable enough.
- 2026-07-29 21:50 JST: Found mutation failures preserved API status/body, but monthly fetch failures only surfaced generic `Failed to fetch ...: 401` errors.
- 2026-07-29 22:05 JST: User clarified the API response itself should be actionable, so API 401 responses now include `details.code` and `details.action`.

### Verification Log

- 2026-07-29 22:05 JST: `pnpm test apps/api/src/app.test.ts apps/web/src/features/expenses/api.test.ts apps/web/src/features/expenses/page-data.test.ts` passed with 34 tests.
- 2026-07-29 22:05 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 22:06 JST: `pnpm build` passed for 6 workspace projects; Next.js generated `/` and `/_not-found` as static pages.

## Task: Fix API CORS for Cloudflare Pages Origin

### Checklist

- [x] Inspect API CORS implementation and deployment config
- [x] Add the Cloudflare Pages origin to API Worker vars
- [x] Update deployment docs for the production Pages origin
- [x] Verify targeted deployment tests pass
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 21:35 JST: Production Pages frontend was blocked by API Worker CORS because `https://shared-expense.pages.dev` was not included in the allowed origins.
- 2026-07-29 21:35 JST: Confirmed API CORS only returns `Access-Control-Allow-Origin` when the request origin exactly matches `API_ALLOWED_ORIGINS`.

### Verification Log

- 2026-07-29 21:44 JST: `pnpm test apps/api/src/deploy-config.test.ts apps/api/src/worker-entrypoint.test.ts apps/api/src/app.test.ts` passed with 22 tests.
- 2026-07-29 21:44 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 21:45 JST: `pnpm build` passed for 6 workspace projects; Next.js generated `/` and `/_not-found` as static pages.

## Task: Switch Web to Cloudflare Pages Static Export

### Checklist

- [x] Inspect Cloudflare Pages output validation failure
- [x] Remove OpenNext Cloudflare dependencies and Worker config
- [x] Switch Next.js output to static export
- [x] Move URL query handling to client component
- [x] Load API data from the client after LIFF/dev token is available
- [x] Add Cloudflare Pages deployment docs
- [x] Update web configuration tests
- [x] Verify targeted tests pass
- [x] Run web Pages build
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 21:20 JST: User chose Cloudflare Pages deployment, which requires static export instead of the OpenNext Worker bundle.
- 2026-07-29 21:20 JST: Removed OpenNext/Wrangler from the web app, changed Next.js output to `export`, moved page query parsing into a client component, and added client-side initial API loading.

### Verification Log

- 2026-07-29 21:27 JST: `pnpm test apps/web-dev-config.test.ts apps/web/src/features/expenses/api.test.ts apps/web/src/features/expenses/page-data.test.ts` passed with 29 tests.
- 2026-07-29 21:27 JST: Initial `pnpm --filter @shared-expense/web run pages:build` failed because the dashboard error logger operation type did not include the new client-side `load` operation.
- 2026-07-29 21:28 JST: Re-ran `pnpm --filter @shared-expense/web run pages:build`; it passed and generated static routes under `out`.
- 2026-07-29 21:29 JST: `pnpm test` passed with 122 tests across 24 files.
- 2026-07-29 21:29 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 21:30 JST: `pnpm build` passed for 6 workspace projects; Next.js generated `/` and `/_not-found` as static pages.

## Task: Clarify OpenNext Web Worker Deployment

### Checklist

- [x] Inspect Cloudflare Pages build log failure
- [x] Rename web deployment docs from Pages to Workers
- [x] Add preferred `worker:*` web scripts
- [x] Update root web deploy script
- [x] Update web config tests and docs
- [x] Verify targeted tests pass
- [x] Run web OpenNext build
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 21:15 JST: Cloudflare Pages build completed OpenNext but then failed validating `.open-next` as a static output directory.
- 2026-07-29 21:15 JST: OpenNext Cloudflare output is a Worker bundle plus assets, so the dynamic web app should be deployed as a Cloudflare Worker rather than as a static Pages output directory.
- 2026-07-29 21:16 JST: Renamed deployment guidance to Workers Web, added preferred `worker:*` scripts, and kept `pages:*` as compatibility aliases.

### Verification Log

- 2026-07-29 21:11 JST: `pnpm test apps/web-dev-config.test.ts` passed with 14 tests.
- 2026-07-29 21:12 JST: `pnpm --filter @shared-expense/web run worker:build` passed and generated `.open-next/worker.js` successfully.
- 2026-07-29 21:12 JST: `pnpm test` passed with 122 tests across 24 files.
- 2026-07-29 21:12 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 21:12 JST: `pnpm build` passed for 6 workspace projects; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Add OpenNext Cloudflare Web Adapter

### Checklist

- [x] Inspect current web build and Next config
- [x] Check OpenNext Cloudflare setup docs
- [x] Add OpenNext Cloudflare dependencies
- [x] Align Next.js version with adapter peer dependency
- [x] Configure Next standalone output
- [x] Add OpenNext Cloudflare config and scripts
- [x] Add Web Wrangler config for OpenNext output
- [x] Document web deployment commands
- [x] Update web configuration tests
- [x] Verify targeted tests pass
- [x] Run web OpenNext build
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 20:35 JST: Started OpenNext Cloudflare adapter support for the web app.
- 2026-07-29 20:35 JST: Confirmed OpenNext Cloudflare requires `output: "standalone"` and uses `opennextjs-cloudflare build` to adapt Next.js output for Cloudflare.
- 2026-07-29 20:36 JST: Added `@opennextjs/cloudflare`, `wrangler`, upgraded Next.js to satisfy the adapter peer dependency, and added web build/deploy/preview scripts plus deployment docs.
- 2026-07-29 21:05 JST: Initial OpenNext build failed because `apps/web` did not have a Wrangler config; added `apps/web/wrangler.jsonc` pointing to `.open-next/worker.js` and `.open-next/assets`.

### Verification Log

- 2026-07-29 21:04 JST: `pnpm test apps/web-dev-config.test.ts` passed with 14 tests.
- 2026-07-29 21:05 JST: Initial `pnpm --filter @shared-expense/web run pages:build` failed because OpenNext requires a local `wrangler.(toml|json|jsonc)` config file.
- 2026-07-29 21:05 JST: Re-ran `pnpm test apps/web-dev-config.test.ts`; it passed with 14 tests.
- 2026-07-29 21:05 JST: Re-ran `pnpm --filter @shared-expense/web run pages:build`; OpenNext built the Next.js app and generated `.open-next/worker.js` successfully.
- 2026-07-29 21:06 JST: `pnpm test` passed with 122 tests across 24 files.
- 2026-07-29 21:06 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 21:06 JST: `pnpm build` passed for 6 workspace projects; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Fix Cloudflare deploy script invocation

### Checklist

- [x] Inspect Cloudflare build log failure
- [x] Change root deploy scripts to use `pnpm --filter ... run deploy`
- [x] Update deployment docs
- [x] Update deploy config tests
- [x] Verify targeted tests pass
- [x] Run API Wrangler dry-run
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 20:26 JST: Cloudflare deploy failed because `pnpm --filter @shared-expense/api deploy` invoked pnpm's built-in `deploy` command instead of the package script.
- 2026-07-29 20:26 JST: Updated root API and Jobs deploy scripts to explicitly call `run deploy` and documented the direct package command.

### Verification Log

- 2026-07-29 20:27 JST: `pnpm test apps/api/src/deploy-config.test.ts apps/jobs/src/deploy-config.test.ts` passed with 5 tests.
- 2026-07-29 20:27 JST: `pnpm --filter @shared-expense/api dry-run` passed with Wrangler 4.115.0 and bundled the API Worker successfully.
- 2026-07-29 20:27 JST: `pnpm test` passed with 122 tests across 24 files.
- 2026-07-29 20:28 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 20:28 JST: `pnpm build` passed for 6 workspace projects; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Cloudflare API Deploy Configuration

### Checklist

- [x] Inspect current API Worker entrypoint and local dev server
- [x] Add Wrangler dependency and API scripts
- [x] Add API `wrangler.jsonc`
- [x] Change Worker entrypoint to use Cloudflare env
- [x] Add production CORS origin env
- [x] Document Cloudflare API secret and deploy commands
- [x] Add deployment config and Worker entrypoint tests
- [x] Verify targeted tests pass
- [x] Run API Wrangler dry-run
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 20:05 JST: Started API Cloudflare Workers deployment configuration.
- 2026-07-29 20:05 JST: Found `apps/api/src/index.ts` still exported `createApp()` with default dependencies, so production Worker would not read env-backed Spreadsheet/auth/LINE dependencies.
- 2026-07-29 20:07 JST: Added API Wrangler scripts/config, changed the Worker entrypoint to `createAppFromEnv(env)`, added `API_ALLOWED_ORIGINS`, and documented API Worker deployment commands.

### Verification Log

- 2026-07-29 20:15 JST: `pnpm test apps/api/src/deploy-config.test.ts apps/api/src/worker-entrypoint.test.ts apps/api/src/app.test.ts apps/api/src/app-env.test.ts` passed with 26 tests.
- 2026-07-29 20:16 JST: `pnpm --filter @shared-expense/api dry-run` passed with Wrangler 4.115.0 and bundled the API Worker successfully.
- 2026-07-29 20:16 JST: `pnpm test` passed with 121 tests across 24 files.
- 2026-07-29 20:16 JST: Initial `pnpm typecheck` failed on exact optional `allowedOrigins` handling and the Worker `fetch` return type.
- 2026-07-29 20:17 JST: Re-ran targeted API tests after type fixes; they passed with 26 tests.
- 2026-07-29 20:17 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 20:17 JST: Re-ran `pnpm test`; it passed with 121 tests across 24 files.
- 2026-07-29 20:17 JST: `pnpm build` passed for 6 workspace projects; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Cloudflare Jobs Deploy Configuration

### Checklist

- [x] Check current Wrangler Cron configuration docs
- [x] Add Wrangler dependency and jobs scripts
- [x] Add jobs `wrangler.jsonc` with monthly Cron trigger
- [x] Document Cloudflare secret and deploy commands
- [x] Add deployment config tests
- [x] Verify targeted tests pass
- [x] Run jobs Wrangler dry-run
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 20:00 JST: Started Cloudflare Workers / Cron deployment configuration.
- 2026-07-29 20:00 JST: Confirmed current Wrangler Cron syntax uses `triggers.crons` and scheduled handlers receive `scheduled(controller, env, ctx)`.
- 2026-07-29 20:00 JST: Added Wrangler scripts, `apps/jobs/wrangler.jsonc`, deployment documentation, and source tests for the Cron/deploy configuration.

### Verification Log

- 2026-07-29 20:00 JST: `pnpm test apps/jobs/src/deploy-config.test.ts apps/jobs/src/monthly-settlement-reminder.test.ts` failed because the new deploy config test read root files instead of `apps/jobs` files.
- 2026-07-29 20:01 JST: `pnpm test apps/jobs/src/deploy-config.test.ts apps/jobs/src/monthly-settlement-reminder.test.ts` passed with 5 tests.
- 2026-07-29 20:01 JST: Initial `pnpm --filter @shared-expense/jobs dry-run` failed in sandbox because Wrangler writes logs under `~/Library/Preferences/.wrangler`.
- 2026-07-29 20:01 JST: Re-ran `pnpm --filter @shared-expense/jobs dry-run` with filesystem approval; Wrangler 4.115.0 bundled the Worker successfully and exited dry-run.
- 2026-07-29 20:02 JST: `pnpm test` passed with 118 tests across 22 files.
- 2026-07-29 20:02 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 20:02 JST: `pnpm build` passed for 6 workspace projects; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Monthly settlement reminder Cron

### Checklist

- [x] Inspect current settlement, notification, and env wiring
- [x] Add `apps/jobs` workspace package
- [x] Implement monthly settlement reminder service
- [x] Add Cloudflare Workers scheduled entrypoint
- [x] Add tests for target month and Flex notification payload
- [x] Update env documentation
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-29 00:00 JST: Started monthly settlement reminder Cron implementation.
- 2026-07-29 00:00 JST: Confirmed existing docs target `apps/jobs`, schedule `0 10 5 * *` UTC, and monthly notification content with settlement amount plus user total breakdown.
- 2026-07-29 00:00 JST: Current mutation notifications do not persist notification history yet, so this task will add the Cron sender and leave durable dedupe storage as the next task.
- 2026-07-29 19:54 JST: Added `@shared-expense/jobs` with a scheduled Worker entrypoint, monthly settlement reminder service, Flex Message payload, JST previous-month calculation, and env sample updates.

### Verification Log

- 2026-07-29 19:54 JST: `pnpm test apps/jobs/src/monthly-settlement-reminder.test.ts` failed because the new `@shared-expense/jobs` workspace package was not linked in `node_modules` yet.
- 2026-07-29 19:54 JST: Re-run targeted test failed because the test expected one users sheet read, while `SpreadsheetExpenseRepository.listByMonth` also reads users to resolve `userName`.
- 2026-07-29 19:55 JST: `pnpm test apps/jobs/src/monthly-settlement-reminder.test.ts` passed with 3 tests.
- 2026-07-29 19:55 JST: `pnpm test` passed with 116 tests across 21 files.
- 2026-07-29 19:55 JST: `pnpm typecheck` passed for 6 workspace projects; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-29 19:55 JST: `pnpm build` passed for 6 workspace projects; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Scroll notified expense into view

### Checklist

- [x] Inspect current notification detail auto-open behavior
- [x] Add selected expense scroll target
- [x] Update tests
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 23:07 JST: User requested that notification detail links also scroll the opened expense into the first viewport.
- 2026-07-28 23:08 JST: Added element refs for expense rows and scroll the selected notification target to the top of the viewport after the detail form opens.

### Verification Log

- 2026-07-28 23:06 JST: `pnpm test apps/web-dev-config.test.ts apps/web/src/features/expenses/page-data.test.ts` passed with 17 tests.
- 2026-07-28 23:06 JST: `pnpm test` passed with 113 tests across 20 files.
- 2026-07-28 23:06 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 23:07 JST: `pnpm build` passed; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Open notified expense details

### Checklist

- [x] Inspect current selected expense highlight behavior
- [x] Open matching expense details from notification links
- [x] Remove selected row badge/outline styles
- [x] Update tests
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 23:00 JST: User found the selected row highlight hard to understand and suggested opening details directly.
- 2026-07-28 23:03 JST: Changed notification detail handling to auto-open the matching expense form when the linked expense is present in the monthly list, and removed the selected row pill/outline.

### Verification Log

- 2026-07-28 23:03 JST: `pnpm test apps/web-dev-config.test.ts apps/web/src/features/expenses/page-data.test.ts apps/api/src/core/notifications/expense-mutation-notifier.test.ts apps/api/src/app-env.test.ts` passed with 23 tests.
- 2026-07-28 23:04 JST: `pnpm test` passed with 113 tests across 20 files.
- 2026-07-28 23:04 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 23:04 JST: `pnpm build` passed; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Highlight notified expense details

### Checklist

- [x] Inspect current notification detail URL and monthly list UI
- [x] Add expense ID to notification detail links
- [x] Read `expenseId` query on the web page
- [x] Highlight the matching expense row
- [x] Update tests and styles
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 23:00 JST: User noted that after edit/delete notifications, opening only the monthly list may not make it clear which expense changed.
- 2026-07-28 23:00 JST: Added `expenseId` to notification detail links and made the web monthly list highlight the matching expense row with a `通知対象` pill.
- 2026-07-28 23:00 JST: Preserved the committed `apps/web/next-env.d.ts` dev types import after `next build`.
- 2026-07-28 23:00 JST: Prepared commit for highlighting notified expenses in the monthly list.

### Verification Log

- 2026-07-28 23:00 JST: `pnpm test apps/api/src/core/notifications/expense-mutation-notifier.test.ts apps/api/src/app-env.test.ts apps/api/src/app.test.ts apps/web-dev-config.test.ts apps/web/src/features/expenses/page-data.test.ts` passed with 42 tests.
- 2026-07-28 23:00 JST: `pnpm test` passed with 113 tests across 20 files.
- 2026-07-28 23:00 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 23:00 JST: `pnpm build` passed; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Move API notifications under core

### Checklist

- [x] Inspect current notification module placement
- [x] Move notification service under `apps/api/src/core/notifications`
- [x] Update imports and tests
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 22:00 JST: User questioned whether `apps/api/src/notifications` should live under `apps/api/src/core`.
- 2026-07-28 22:00 JST: Expense mutation notifications are a cross-cutting API concern used by feature routes, so they align better with `core/auth` and `core/users` than as a top-level feature sibling.
- 2026-07-28 22:50 JST: Moved expense mutation notification service and tests under `apps/api/src/core/notifications`, and updated app/expense route imports.
- 2026-07-28 22:51 JST: Preserved the committed `apps/web/next-env.d.ts` dev types import after `next build`.
- 2026-07-28 22:51 JST: Prepared commit for moving API notifications under core.

### Verification Log

- 2026-07-28 22:50 JST: `pnpm test apps/api/src/core/notifications/expense-mutation-notifier.test.ts apps/api/src/app.test.ts apps/api/src/app-env.test.ts` passed with 25 tests.
- 2026-07-28 22:50 JST: `pnpm test` passed with 112 tests across 20 files.
- 2026-07-28 22:50 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 22:51 JST: `pnpm build` passed; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Match Flex notification footer background

### Checklist

- [x] Inspect current Flex body/footer styles
- [x] Set footer background to match body
- [x] Update notification test
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 22:00 JST: User requested Flex notification body and footer background colors to match.
- 2026-07-28 22:46 JST: Added a Flex footer style with the same `#F6F7F4` background color as the body.
- 2026-07-28 22:47 JST: Preserved the committed `apps/web/next-env.d.ts` dev types import after `next build`.
- 2026-07-28 22:47 JST: Prepared commit for matching Flex notification footer background.

### Verification Log

- 2026-07-28 22:46 JST: `pnpm test apps/api/src/notifications/expense-mutation-notifier.test.ts` passed with 2 tests.
- 2026-07-28 22:46 JST: `pnpm test` passed with 112 tests across 20 files.
- 2026-07-28 22:46 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 22:47 JST: `pnpm build` passed; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Replace notification ID with detail footer

### Checklist

- [x] Inspect current Flex notification payload
- [x] Add Flex button/action types
- [x] Remove user-facing notification ID from expense notifications
- [x] Add detail footer button with configured URL
- [x] Update env docs/tests
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 22:00 JST: User noted notification IDs are not useful in LINE notifications and requested a footer path to view details instead.
- 2026-07-28 22:00 JST: Added `LINE_NOTIFICATION_DETAIL_BASE_URL` as the API-side base URL used by Flex footer buttons. Expense month is appended as `month=YYYY-MM`.
- 2026-07-28 22:34 JST: Removed notification ID from the Flex body and added an optional footer button labeled `詳細を確認`.
- 2026-07-28 22:35 JST: Preserved the committed `apps/web/next-env.d.ts` dev types import after `next build`.
- 2026-07-28 22:35 JST: Prepared commit for replacing notification ID with a detail footer button.

### Verification Log

- 2026-07-28 22:34 JST: `pnpm test apps/api/src/notifications/expense-mutation-notifier.test.ts apps/api/src/app-env.test.ts apps/api/src/app.test.ts packages/integrations/src/line/messaging-client.test.ts apps/web-dev-config.test.ts` passed with 40 tests.
- 2026-07-28 22:34 JST: `pnpm test` passed with 112 tests across 20 files.
- 2026-07-28 22:34 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 22:35 JST: `pnpm build` passed; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Use Flex Messages for expense notifications

### Checklist

- [x] Inspect current text notification payload
- [x] Expand LINE Messaging client types for Flex messages
- [x] Replace expense notification text with a Flex bubble
- [x] Update notification and integration tests
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 22:00 JST: User requested LINE expense notifications to use Flex Message instead of plain text.
- 2026-07-28 22:00 JST: LINE official docs confirm Flex messages are sent as `type: "flex"` messages with `altText` and `contents`, inside the same push message request body.
- 2026-07-28 22:18 JST: Expanded LINE message types to include Flex bubbles and changed expense mutation notifications to send a structured Flex message with operation, title, amount, date, payer, and notification ID.
- 2026-07-28 22:19 JST: Preserved the committed `apps/web/next-env.d.ts` dev types import after `next build`.
- 2026-07-28 22:19 JST: Prepared commit for Flex Message expense notifications.

### Verification Log

- 2026-07-28 22:18 JST: `pnpm test packages/integrations/src/line/messaging-client.test.ts apps/api/src/notifications/expense-mutation-notifier.test.ts apps/api/src/app-env.test.ts apps/api/src/app.test.ts` passed with 27 tests.
- 2026-07-28 22:18 JST: `pnpm test` passed with 112 tests across 20 files.
- 2026-07-28 22:18 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 22:19 JST: `pnpm build` passed; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Send LINE notifications for expense mutations

### Checklist

- [x] Inspect expense mutation and notification boundaries
- [x] Add LINE Messaging API push adapter in integrations
- [x] Add API expense mutation notification service
- [x] Wire create/update/delete routes to notify the partner
- [x] Wire env-based LINE Messaging channel access token
- [x] Update env docs/tests
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 22:00 JST: User selected LINE notifications as the next task.
- 2026-07-28 22:00 JST: LINE official Messaging API docs confirm push messages use `POST https://api.line.me/v2/bot/message/push` with `Content-Type: application/json`, `Authorization: Bearer {channel access token}`, `to`, and `messages`.
- 2026-07-28 22:00 JST: Current Expense routes persist create/update/delete but do not publish notifications. Shared domain already has partner user and notification dedupe primitives.
- 2026-07-28 22:13 JST: Added a LINE push adapter, expense mutation notifier, env wiring via `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`, and route notifications after create/update/delete. Notification failures are logged without failing already-persisted mutations.
- 2026-07-28 22:14 JST: Fixed optional notifier wiring for `exactOptionalPropertyTypes` and preserved the committed `apps/web/next-env.d.ts` dev types import after `next build`.
- 2026-07-28 22:15 JST: Prepared commit for LINE expense mutation notifications.

### Verification Log

- 2026-07-28 22:13 JST: `pnpm test packages/integrations/src/line/messaging-client.test.ts apps/api/src/notifications/expense-mutation-notifier.test.ts apps/api/src/app.test.ts apps/api/src/app-env.test.ts packages/integrations/src/spreadsheet/expense-repository.test.ts apps/web-dev-config.test.ts` passed with 49 tests.
- 2026-07-28 22:14 JST: `pnpm test` passed with 112 tests across 20 files.
- 2026-07-28 22:14 JST: `pnpm typecheck` initially failed because an optional notifier was passed as explicit `undefined`; fixed by omitting the optional property when absent.
- 2026-07-28 22:14 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 22:14 JST: `pnpm build` passed; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Improve monthly navigation feedback

### Checklist

- [x] Inspect current month navigation delay
- [x] Add client-side month navigation with pending state
- [x] Sync dashboard state when month props change
- [x] Add loading feedback styles/tests
- [x] Update lessons for navigation feedback
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 22:00 JST: User reported a visible delay after tapping month navigation before the new month appears.
- 2026-07-28 22:00 JST: Next.js App Router docs confirm `useRouter` from `next/navigation` can update search params from Client Components, and pending UI can be driven with React transitions.
- 2026-07-28 22:03 JST: Replaced server-only month anchors with client-side month navigation, immediate visible-month updates, pending styles, and prop-to-state synchronization after navigation completes.
- 2026-07-28 22:04 JST: Preserved the committed `apps/web/next-env.d.ts` dev types import after `next build`.
- 2026-07-28 22:04 JST: Prepared commit for monthly navigation loading feedback.

### Verification Log

- 2026-07-28 22:03 JST: `pnpm test apps/web-dev-config.test.ts apps/web/src/features/expenses/month.test.ts apps/web/src/features/expenses/page-data.test.ts` passed with 21 tests.
- 2026-07-28 22:03 JST: `pnpm test` passed with 105 tests across 18 files.
- 2026-07-28 22:03 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 22:04 JST: `pnpm build` passed; Next.js built `/` as dynamic and Redocly reported the same existing warnings.

## Task: Add monthly navigation UI

### Checklist

- [x] Inspect current fixed month flow
- [x] Add shared web month helpers
- [x] Read `month` query on the Next page
- [x] Add mobile-friendly month navigation controls
- [x] Update source/unit tests
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 22:00 JST: User selected monthly navigation UI as the next task.
- 2026-07-28 22:00 JST: Current web page uses a fixed `2026-07` month in `apps/web/src/app/page.tsx`; the dashboard renders a static `2026年7月` label.
- 2026-07-28 22:00 JST: Added JST current-month fallback, query month normalization, and mobile month navigation with previous/current/next links plus a native month input.
- 2026-07-28 22:01 JST: Preserved the committed `apps/web/next-env.d.ts` dev types import after `next build`.
- 2026-07-28 22:01 JST: Prepared commit for monthly navigation UI.

### Verification Log

- 2026-07-28 22:00 JST: `pnpm test apps/web-dev-config.test.ts apps/web/src/features/expenses/month.test.ts apps/web/src/features/expenses/page-data.test.ts` passed with 21 tests.
- 2026-07-28 22:01 JST: `pnpm test` passed with 105 tests across 18 files.
- 2026-07-28 22:01 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 22:01 JST: `pnpm build` passed; Next.js built `/` as dynamic because the page now reads search params, and Redocly reported the same existing warnings.

## Task: Initialize LIFF frontend ID token

### Checklist

- [x] Inspect current web token flow
- [x] Add LIFF SDK dependency
- [x] Add client-side LIFF ID token initialization
- [x] Re-fetch expenses and settlement after LIFF token is available
- [x] Preserve local dev token fallback
- [x] Update env docs/tests
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 21:00 JST: User selected LIFF frontend productionization.
- 2026-07-28 21:00 JST: Context7 LINE LIFF docs confirm `liff.init({ liffId })`, `liff.isLoggedIn()`, `liff.login()`, and `liff.getIDToken()` flow; ID token requires `openid` scope and is valid for one hour.
- 2026-07-28 21:00 JST: Added `@line/liff` to `@shared-expense/web`.
- 2026-07-28 21:47 JST: Added client-side LIFF token initialization, post-auth expense/settlement refetch, local dev token fallback, and `NEXT_PUBLIC_LIFF_ID` env documentation.
- 2026-07-28 21:48 JST: Fixed LIFF initialization narrowing for TypeScript and preserved the committed `apps/web/next-env.d.ts` dev types import after `next build`.
- 2026-07-28 21:49 JST: Prepared commit for LIFF frontend ID token initialization.

### Verification Log

- 2026-07-28 21:47 JST: `pnpm test apps/web-dev-config.test.ts apps/web/src/features/expenses/api.test.ts apps/web/src/features/expenses/page-data.test.ts` passed with 27 tests.
- 2026-07-28 21:48 JST: `pnpm typecheck` initially failed because the narrowed LIFF ID type was not preserved inside the async initializer; fixed by assigning checked values to local constants.
- 2026-07-28 21:48 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 21:48 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.
- 2026-07-28 21:48 JST: `pnpm test` passed with 99 tests across 17 files.

## Task: Move API auth and users under core

### Checklist

- [x] Inspect current API source layout
- [x] Move `auth` to `core/auth`
- [x] Move `users` to `core/users`
- [x] Update imports and tests
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 21:00 JST: User noted `apps/api/src/auth` and `apps/api/src/users` feel odd as siblings of feature modules `expenses` and `settlements`.
- 2026-07-28 21:00 JST: Decided to move cross-cutting API auth and household user dependency boundaries under `apps/api/src/core`.
- 2026-07-28 21:35 JST: Moved API auth and household user repository files under `apps/api/src/core`, and updated route/app imports.
- 2026-07-28 21:36 JST: Prepared commit for moving API auth and users under core.

### Verification Log

- 2026-07-28 21:35 JST: `pnpm test apps/api/src/core/auth/line-id-token.test.ts apps/api/src/app.test.ts apps/api/src/app-env.test.ts` passed with 22 tests.
- 2026-07-28 21:35 JST: `pnpm test` passed with 98 tests across 17 files.
- 2026-07-28 21:35 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 21:36 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Decouple settlements from expense repository module

### Checklist

- [x] Inspect settlement to expense dependency
- [x] Add settlement-local monthly expense reader interface
- [x] Update settlement routes to depend on the reader interface
- [x] Wire app dependencies without importing expenses from settlements
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 21:00 JST: User pointed out `apps/api/src/settlements` still imports from `apps/api/src/expenses`.
- 2026-07-28 21:00 JST: Current settlement route only needs monthly expense reads, so it should depend on a small settlement-facing reader interface rather than the full expense CRUD repository module.
- 2026-07-28 21:26 JST: Added settlement-local `MonthlySettlementExpenseReader`, rewired settlement routes to use it, and removed `apps/api/src/settlements` imports from `apps/api/src/expenses`.
- 2026-07-28 21:27 JST: Prepared commit for decoupling settlements from the expense repository module.

### Verification Log

- 2026-07-28 21:26 JST: `pnpm test apps/api/src/app.test.ts apps/api/src/app-env.test.ts` passed with 20 tests.
- 2026-07-28 21:27 JST: `pnpm test` passed with 98 tests across 17 files.
- 2026-07-28 21:27 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 21:27 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Separate user repository from expense repository

### Checklist

- [x] Inspect auth/expense dependency direction
- [x] Add `HouseholdUserRepository`
- [x] Remove user reads from `ExpenseRepository`
- [x] Wire app dependencies with separate expense/user repositories
- [x] Update auth and settlement routes
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 21:00 JST: User pointed out `apps/api/src/auth` depending on `apps/api/src/expenses` is suspicious.
- 2026-07-28 21:00 JST: Current `auth/line-id-token.ts` imports `ExpenseRepository` only to call `listHouseholdUsers()`, which is a user/household concern, not an expense concern.
- 2026-07-28 21:23 JST: Added `HouseholdUserRepository`, removed `listHouseholdUsers()` from `ExpenseRepository`, and rewired auth/settlements to depend on user repository separately.
- 2026-07-28 21:24 JST: Prepared commit for separating user repository from expense repository.

### Verification Log

- 2026-07-28 21:23 JST: `pnpm test apps/api/src/app.test.ts apps/api/src/app-env.test.ts apps/api/src/auth/line-id-token.test.ts` passed with 22 tests.
- 2026-07-28 21:23 JST: `pnpm test` passed with 98 tests across 17 files.
- 2026-07-28 21:24 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 21:24 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Remove stale LIFF auth naming

### Checklist

- [x] Inspect remaining `liff` files and references
- [x] Remove unused `apps/api/src/auth/liff-token.*`
- [x] Rename local dev token env to avoid LIFF-specific API naming
- [x] Update tests and docs for current LINE ID token naming
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 21:00 JST: User asked whether remaining `liff` filenames are appropriate after moving LINE verification to integrations.
- 2026-07-28 21:00 JST: Found `apps/api/src/auth/liff-token.*` is unused and overlaps with current `line-id-token` auth. Also found local dev env naming still uses `NEXT_PUBLIC_DEV_LIFF_ID_TOKEN`.
- 2026-07-28 21:16 JST: Removed stale `apps/api/src/auth/liff-token.*`, renamed local dev env to `NEXT_PUBLIC_DEV_ID_TOKEN`, and updated tests/comments to current LINE ID token naming.
- 2026-07-28 21:17 JST: Prepared commit for removing stale LIFF auth naming.

### Verification Log

- 2026-07-28 21:16 JST: `pnpm test apps/web-dev-config.test.ts apps/web/src/features/expenses/api.test.ts apps/web/src/features/expenses/page-data.test.ts apps/api/src/auth/line-id-token.test.ts apps/api/src/app-env.test.ts packages/integrations/src/line/id-token-verifier.test.ts` passed with 35 tests.
- 2026-07-28 21:16 JST: `pnpm test` passed with 98 tests across 17 files.
- 2026-07-28 21:17 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 21:17 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Move LINE ID token verification to integrations package

### Checklist

- [x] Inspect current LINE auth placement
- [x] Move LINE verify client to `packages/integrations`
- [x] Keep API user resolution in `apps/api`
- [x] Split tests by responsibility
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 20:00 JST: User pointed out LINE external dependencies may belong under `packages`.
- 2026-07-28 20:00 JST: Decided to keep LINE external API verification in `packages/integrations`, while API-specific `sub` to household user resolution remains in `apps/api`.
- 2026-07-28 21:10 JST: Moved LINE ID token verify client and tests to `packages/integrations/src/line`, and kept API auth focused on household user resolution.
- 2026-07-28 21:11 JST: Prepared commit for moving LINE verification into integrations.

### Verification Log

- 2026-07-28 21:10 JST: `pnpm test packages/integrations/src/line/id-token-verifier.test.ts apps/api/src/auth/line-id-token.test.ts apps/api/src/app-env.test.ts` passed with 9 tests.
- 2026-07-28 21:10 JST: `pnpm test` passed with 104 tests across 18 files.
- 2026-07-28 21:10 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 21:11 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Implement production LIFF ID token authentication

### Checklist

- [x] Inspect current dev auth and user resolution
- [x] Add LINE ID token verifier
- [x] Resolve verified `sub` to Spreadsheet household user
- [x] Wire env-based production auth
- [x] Update env docs/tests
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 20:00 JST: User selected LIFF production authentication as the next task.
- 2026-07-28 20:00 JST: LINE official docs say LIFF ID tokens should be verified on the server via `POST https://api.line.me/oauth2/v2.1/verify` with `id_token` and `client_id`, or by signature validation. This implementation will use the official verify endpoint.
- 2026-07-28 20:41 JST: Added LINE ID token verification, Spreadsheet household user resolution by `lineUserId`, env-based `LINE_LOGIN_CHANNEL_ID` wiring, and env template docs.
- 2026-07-28 20:42 JST: Prepared commit for production LIFF ID token authentication.

### Verification Log

- 2026-07-28 20:41 JST: `pnpm test apps/api/src/auth/line-id-token.test.ts apps/api/src/app-env.test.ts apps/web-dev-config.test.ts` passed with 19 tests.
- 2026-07-28 20:41 JST: `pnpm test` passed with 103 tests across 17 files.
- 2026-07-28 20:42 JST: `pnpm typecheck` initially failed because an optional `fetcher` was passed as explicit `undefined`; changed the call to omit it when absent.
- 2026-07-28 20:42 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 20:42 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Connect monthly settlement summary API and UI

### Checklist

- [x] Inspect settlement domain, API, and UI flow
- [x] Add household users support to repositories
- [x] Implement `GET /api/settlements`
- [x] Fetch settlement page data in the web app
- [x] Replace fixed settlement UI with calculated summary
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-28 00:00 JST: User asked to connect the monthly settlement summary API/UI.
- 2026-07-28 00:00 JST: Existing shared domain has `calculateMonthlySettlement`, OpenAPI defines `GET /api/settlements`, but API route is not implemented and web summary shows fixed `4270`.
- 2026-07-28 20:34 JST: Added household user reads to repositories, implemented `GET /api/settlements`, added web settlement fetch/page data, and replaced the fixed dashboard amount with calculated settlement summary.
- 2026-07-28 20:35 JST: Prepared commit for monthly settlement summary API/UI connection.

### Verification Log

- 2026-07-28 20:34 JST: `pnpm test apps/api/src/app.test.ts apps/web/src/features/expenses/api.test.ts apps/web/src/features/expenses/page-data.test.ts apps/web-dev-config.test.ts packages/integrations/src/spreadsheet/expense-repository.test.ts` passed with 52 tests.
- 2026-07-28 20:34 JST: `pnpm test` passed with 97 tests across 16 files.
- 2026-07-28 20:35 JST: `pnpm typecheck` initially failed because Spreadsheet users array indexing was not narrowed to a two-user tuple; added an explicit tuple guard.
- 2026-07-28 20:35 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-28 20:35 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Add undo for deleted expenses

### Checklist

- [x] Inspect current delete flow and contracts
- [x] Add repository restore support for `deleted_at`
- [x] Add API restore endpoint
- [x] Add frontend undo action to delete status
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-27 22:30 JST: User asked to show an `元に戻す` link next to `支出を削除しました`, restoring the most recently deleted row by clearing `deleted_at`.
- 2026-07-27 22:30 JST: Current delete flow removes the item from local state and shows a plain status message; API only exposes DELETE, and Spreadsheet repository writes `payments!L{row}` for logical delete.
- 2026-07-27 22:38 JST: Added `restore` to expense repositories, `POST /api/expenses/{id}/restore`, frontend `restoreExpense`, and a status-link undo action that restores the most recently deleted expense.
- 2026-07-27 22:39 JST: Prepared commit for deleted expense undo.

### Verification Log

- 2026-07-27 22:38 JST: `pnpm test packages/integrations/src/spreadsheet/expense-repository.test.ts` passed with 8 tests.
- 2026-07-27 22:38 JST: `pnpm test apps/api/src/app.test.ts apps/web/src/features/expenses/api.test.ts apps/web-dev-config.test.ts` passed with 34 tests.
- 2026-07-27 22:38 JST: `pnpm test` passed with 89 tests across 16 files.
- 2026-07-27 22:39 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 22:39 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Change Spreadsheet expense delete to logical delete

### Checklist

- [x] Try to inspect referenced Spreadsheet
- [x] Add failing repository logical delete tests
- [x] Read payments rows with deletion marker columns
- [x] Filter logically deleted rows from monthly list
- [x] Change delete to update deleted marker columns
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-27 22:00 JST: User asked to change delete from physical delete to logical delete and provided Spreadsheet `1Xg_yFKm1dIlYKpZYMAq80uy1JImzRLDr4CHsuZriMSM`.
- 2026-07-27 22:00 JST: Google Sheets connector metadata read returned `403 PERMISSION_DENIED`, so implementation proceeds with the conservative assumption that existing `payments!A:K` stays intact and logical delete markers are added as `L:deleted_at` and `M:deleted_by`.
- 2026-07-27 22:27 JST: User updated Spreadsheet permissions. Confirmed gid `30835585` is `payments`, with 12 columns and `L:deleted_at`.
- 2026-07-27 22:27 JST: Changed expense repository to read `payments!A2:L`, filter rows with non-empty `deleted_at`, and update only `payments!L{row}` on delete.
- 2026-07-27 22:29 JST: Prepared commit for logical delete changes.

### Verification Log

- 2026-07-27 22:27 JST: `pnpm test packages/integrations/src/spreadsheet/expense-repository.test.ts` passed with 7 tests.
- 2026-07-27 22:28 JST: `pnpm test` initially failed because `apps/api/src/app-env.test.ts` still expected `payments!A2:K`; updated the expectation to `payments!A2:L`.
- 2026-07-27 22:28 JST: `pnpm test` passed with 85 tests across 16 files.
- 2026-07-27 22:28 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 22:29 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Simplify expense form fields

### Checklist

- [x] Inspect current expense form fields
- [x] Add failing form simplification test
- [x] Remove category input from the form
- [x] Rename memo label to payment content
- [x] Keep API-compatible default category payload
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-27 22:00 JST: User asked to remove category from forms and rename memo to `支払内容`.
- 2026-07-27 22:18 JST: Removed the category field from create/edit forms, renamed the memo label to `支払内容`, and kept API compatibility by sending `DEFAULT_EXPENSE_CATEGORY`.
- 2026-07-27 22:19 JST: Committed changes as `feat: simplify expense form fields`.

### Verification Log

- 2026-07-27 22:18 JST: `pnpm test apps/web-dev-config.test.ts` failed as expected because the form still showed `カテゴリ` and `メモ`.
- 2026-07-27 22:18 JST: `pnpm test apps/web-dev-config.test.ts` passed with 11 tests.
- 2026-07-27 22:18 JST: `pnpm test` passed with 85 tests across 16 files.
- 2026-07-27 22:18 JST: `pnpm typecheck` initially failed because `.next/types/cache-life.d.ts` was missing before Next regenerated `.next/types`; `pnpm build` regenerated it.
- 2026-07-27 22:18 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 22:19 JST: `pnpm typecheck` passed after `.next/types` was regenerated; Redocly reported the same existing warnings.

## Task: Improve mobile edit/delete affordance

### Checklist

- [x] Inspect current row action markup and styles
- [x] Add failing mobile action affordance test
- [x] Implement row tap-to-edit and move delete into edit form
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Verify local dev markup
- [x] Commit changes

### Progress Log

- 2026-07-27 22:00 JST: User reported edit/delete affordance feels PC-oriented and hard to tap on smartphones. Current UI uses small always-visible text buttons per row.
- 2026-07-27 22:09 JST: Changed each expense row into a large tap target for editing and moved delete into the expanded edit form as a full-width action.
- 2026-07-27 22:10 JST: Committed changes as `feat: improve mobile expense actions`.

### Verification Log

- 2026-07-27 22:08 JST: `pnpm test apps/web-dev-config.test.ts` failed as expected because `.expenseTapTarget` and mobile-oriented delete affordance did not exist.
- 2026-07-27 22:09 JST: `pnpm test apps/web-dev-config.test.ts` passed with 10 tests.
- 2026-07-27 22:09 JST: `pnpm test` passed with 84 tests across 16 files.
- 2026-07-27 22:09 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 22:09 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.
- 2026-07-27 22:10 JST: With `pnpm dev` running, `curl -sL http://localhost:3000 | rg -o 'expenseTapTarget|rowActions|deleteButton'` returned `expenseTapTarget` entries and no `rowActions`, confirming the row-level tap target is rendered.

## Task: Use writable Google Sheets OAuth scope

### Checklist

- [x] Identify append 403 root cause
- [x] Add failing writable scope test
- [x] Change service account default scope to writable Sheets scope
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-27 22:00 JST: User reported `Failed to append Google Sheets values: 403`. Root cause: service account token provider defaulted to `https://www.googleapis.com/auth/spreadsheets.readonly`, which can read but cannot append/update/clear values.
- 2026-07-27 22:03 JST: Changed service account default scope to `https://www.googleapis.com/auth/spreadsheets` for read/write Sheets values access.
- 2026-07-27 22:04 JST: Committed changes as `fix: use writable sheets scope`.

### Verification Log

- 2026-07-27 22:03 JST: `pnpm test packages/integrations/src/google/service-account-auth-provider.test.ts` failed as expected because the JWT payload still used `https://www.googleapis.com/auth/spreadsheets.readonly`.
- 2026-07-27 22:03 JST: `pnpm test packages/integrations/src/google/service-account-auth-provider.test.ts` passed with 2 tests.
- 2026-07-27 22:03 JST: `pnpm test` passed with 83 tests across 16 files.
- 2026-07-27 22:03 JST: `pnpm typecheck` initially failed because `packages/integrations/src/index.ts` still exported `GOOGLE_SHEETS_READONLY_SCOPE`; updated it to export `GOOGLE_SHEETS_SCOPE`.
- 2026-07-27 22:03 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 22:03 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Surface API create repository failures

### Checklist

- [x] Identify generic create 500 response
- [x] Add failing API create failure response test
- [x] Return structured create failure details
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-27 22:00 JST: User still received `ExpenseApiError: Failed to create expense: 500 Internal Server Error`. Root cause for observability: `POST /api/expenses` did not catch repository exceptions, so Hono returned a generic plain-text 500 and hid the underlying Spreadsheet error.
- 2026-07-27 22:00 JST: Added structured JSON response and server-side `console.error` logging for create repository failures.
- 2026-07-27 22:02 JST: Committed changes as `fix: return create failure details`.

### Verification Log

- 2026-07-27 22:00 JST: `pnpm test apps/api/src/app.test.ts` failed as expected because create repository failures returned plain text `Internal Server Error` instead of JSON details.
- 2026-07-27 22:00 JST: `pnpm test apps/api/src/app.test.ts` passed with 12 tests; expected stderr showed `Expense create failed Error: Failed to append Google Sheets values: 403`.
- 2026-07-27 22:01 JST: `pnpm test` passed with 83 tests across 16 files.
- 2026-07-27 22:01 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 22:01 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Use Spreadsheet-mappable local dev actor

### Checklist

- [x] Identify create 500 root cause
- [x] Add failing local dev actor test
- [x] Change local dev actor to a Spreadsheet-mappable user id
- [x] Verify targeted tests pass
- [x] Verify local dev create validation path
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-27 22:00 JST: User reported `ExpenseApiError: Failed to create expense: 500 Internal Server Error` after body forwarding was fixed. Root cause: local dev authentication returned actor id `local-dev`, but Spreadsheet mutations require actor ids that map back to existing user types (`woman` -> `1`, `man` -> `2`).
- 2026-07-27 21:55 JST: Added `authenticateLocalDevToken` helper and changed local dev actor id to `man` while keeping `lineUserId: "local-dev"` for the dev bearer token.
- 2026-07-27 21:57 JST: Committed changes as `fix: use mappable local dev actor`.

### Verification Log

- 2026-07-27 21:55 JST: `pnpm test apps/api/src/dev-auth.test.ts` failed as expected because `./dev-auth` did not exist.
- 2026-07-27 21:55 JST: `pnpm test apps/api/src/dev-auth.test.ts` passed with 1 test.
- 2026-07-27 21:56 JST: With `pnpm dev` running, `curl -sL -i -X POST http://localhost:8787/api/expenses ... --data '{"date":"bad-date","price":1200,"category":"食費","memo":"actor check"}'` returned `400` with `details.field: "date"` instead of `500`, confirming the local dev actor no longer crashes Spreadsheet mutation mapping.
- 2026-07-27 21:56 JST: `pnpm test` passed with 82 tests across 16 files.
- 2026-07-27 21:56 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 21:57 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Preserve request bodies in API dev server

### Checklist

- [x] Identify create body parsing failure
- [x] Add failing Node request conversion test
- [x] Implement dev server request body forwarding
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Verify local dev POST body forwarding
- [x] Commit changes

### Progress Log

- 2026-07-27 22:00 JST: User reported `ExpenseApiError: Failed to create expense: 400 {"message":"Invalid request","details":{"field":"body","reason":"must be a JSON object"}}`. Root cause: local API dev server converted `IncomingMessage` to Fetch `Request` without forwarding the request body, so POST/PUT bodies arrived empty.
- 2026-07-27 21:49 JST: Added `createNodeRequest` helper and changed the local API dev server to forward non-GET/HEAD request streams with Node fetch `duplex: "half"`.
- 2026-07-27 21:53 JST: Committed changes as `fix: forward api dev request bodies`.

### Verification Log

- 2026-07-27 21:48 JST: `pnpm test apps/api/src/dev-request.test.ts` failed as expected because `./dev-request` did not exist and POST body forwarding was not implemented.
- 2026-07-27 21:48 JST: `pnpm test apps/api/src/dev-request.test.ts` passed with 2 tests.
- 2026-07-27 21:51 JST: With `pnpm dev` running, `curl -sL -i -X POST http://localhost:8787/api/expenses ... --data '{"date":"bad-date","price":1200,"category":"食費","memo":"body check"}'` returned `400` with `details.field: "date"`, confirming the JSON object body reached the API; before the fix the failure was `details.field: "body"`.
- 2026-07-27 21:51 JST: `pnpm test` passed with 81 tests across 15 files.
- 2026-07-27 21:52 JST: `pnpm typecheck` initially failed because `BodyInit` was not available in the API TypeScript lib and then because `RequestInit["body"]` included `undefined`; changed the cast to `NonNullable<RequestInit["body"]>`.
- 2026-07-27 21:52 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 21:52 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Fix local API CORS for frontend mutations

### Checklist

- [x] Identify browser preflight failure
- [x] Add failing API CORS preflight test
- [x] Implement API CORS headers for local web origins
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Verify local CORS preflight
- [x] Commit changes

### Progress Log

- 2026-07-27 22:00 JST: User reported browser CORS failure for `POST http://localhost:8787/api/expenses` from `http://localhost:3000`. Root cause: API did not return CORS headers for mutation preflight requests with `Authorization`, `Content-Type`, and `Idempotency-Key`.
- 2026-07-27 21:44 JST: Added API CORS middleware for local web origins `http://localhost:3000` and `http://localhost:3001`, allowing `Authorization`, `Content-Type`, and `Idempotency-Key`.
- 2026-07-27 21:46 JST: Committed changes as `fix: allow local expense api cors`.

### Verification Log

- 2026-07-27 21:44 JST: `pnpm test apps/api/src/app.test.ts` failed as expected because `OPTIONS /api/expenses` returned 404 without CORS headers.
- 2026-07-27 21:44 JST: `pnpm test apps/api/src/app.test.ts` passed with 11 tests.
- 2026-07-27 21:44 JST: `pnpm test` passed with 79 tests across 14 files.
- 2026-07-27 21:44 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 21:44 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.
- 2026-07-27 21:45 JST: With `pnpm dev` running, `curl -i -X OPTIONS http://localhost:8787/api/expenses -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: authorization,content-type,idempotency-key'` returned `204 No Content` with `access-control-allow-origin: http://localhost:3000`, `access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS`, and `access-control-allow-headers: Authorization,Content-Type,Idempotency-Key`.

## Task: Surface Expense mutation failures

### Checklist

- [x] Identify swallowed frontend mutation errors
- [x] Add failing API error detail tests
- [x] Implement detailed API mutation errors
- [x] Log dashboard mutation failures
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-27 22:00 JST: User reported create failure only showed `支出を追加できませんでした` and no logs. Root cause: dashboard mutation handlers used bare `catch` blocks and the API client threw status-only errors without reading response bodies.
- 2026-07-27 22:01 JST: Added `ExpenseApiError` with operation, status, and response body, plus dashboard `console.error` logging and user-visible API error details.
- 2026-07-27 21:42 JST: Committed changes as `fix: surface expense mutation errors`.

### Verification Log

- 2026-07-27 21:40 JST: `pnpm test apps/web/src/features/expenses/api.test.ts` failed as expected because mutation errors only included status and `ExpenseApiError` did not exist.
- 2026-07-27 21:41 JST: `pnpm test apps/web/src/features/expenses/api.test.ts` passed with 8 tests.
- 2026-07-27 21:41 JST: `pnpm test apps/web/src/features/expenses/api.test.ts apps/web-dev-config.test.ts` passed with 17 tests across 2 files.
- 2026-07-27 21:41 JST: `pnpm test` passed with 77 tests across 14 files.
- 2026-07-27 21:41 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 21:41 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Connect frontend to Expense CRUD API

### Checklist

- [x] Inspect current web expense data flow
- [x] Add failing web API mutation tests
- [x] Add failing UI structure tests
- [x] Implement expense mutation API client
- [x] Implement mobile-first create/edit/delete UI
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Verify local dev startup
- [x] Commit changes

### Progress Log

- 2026-07-27 00:00 JST: Started frontend CRUD API connection work. Current web app only loads monthly expenses and has no mutation client or operation UI.
- 2026-07-27 21:28 JST: Added tests for web mutation API calls and dashboard create/edit/delete controls.
- 2026-07-27 21:30 JST: Added `createExpense`, `updateExpense`, and `deleteExpense` web API client functions.
- 2026-07-27 21:31 JST: Split the monthly screen into `ExpenseDashboard` and added mobile-first add/edit/delete flows with local state updates.
- 2026-07-27 21:33 JST: Committed changes as `feat: connect expense crud frontend`.

### Verification Log

- 2026-07-27 21:28 JST: `pnpm test apps/web/src/features/expenses/api.test.ts apps/web-dev-config.test.ts` failed as expected because mutation client functions and `expense-dashboard.tsx` did not exist.
- 2026-07-27 21:30 JST: `pnpm test apps/web/src/features/expenses/api.test.ts apps/web-dev-config.test.ts` passed with 16 tests across 2 files.
- 2026-07-27 21:31 JST: `pnpm typecheck` initially failed due `exactOptionalPropertyTypes` on `ExpenseDashboardProps.errorMessage`; changed the prop to accept explicit `undefined`.
- 2026-07-27 21:31 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-27 21:31 JST: `pnpm test` passed with 76 tests across 14 files.
- 2026-07-27 21:31 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.
- 2026-07-27 21:32 JST: `pnpm dev` initially failed inside the sandbox with `tsx` IPC pipe `EPERM`; reran outside the sandbox and API started at `http://localhost:8787`, web started at `http://localhost:3000`, `curl -sL http://localhost:8787/health` returned `{"ok":true}`, and `curl -sL http://localhost:3000` returned the monthly expense page with edit/delete controls.

## Task: Expense CRUD API

### Checklist

- [x] Confirm implementation design
- [x] Write implementation plan
- [x] Add failing Spreadsheet repository mutation tests
- [x] Implement Spreadsheet create/update/delete
- [x] Add failing API route mutation tests
- [x] Implement API create/update/delete routes
- [x] Wire Google Sheets mutation client
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-26 00:10 JST: User approved starting from Expense CRUD API.
- 2026-07-26 00:10 JST: Wrote implementation plan at `docs/superpowers/plans/2026-07-26-expense-crud-api.md`.
- 2026-07-26 19:52 JST: Implemented Spreadsheet-backed create/update/delete using legacy `payments` rows and Google Sheets values append/update/clear.
- 2026-07-26 19:54 JST: Implemented `POST /api/expenses`, `PUT /api/expenses/{id}`, and `DELETE /api/expenses/{id}` with auth, idempotency key validation, request validation, 404, and 409 handling.
- 2026-07-26 19:59 JST: Committed changes as `feat: add expense crud api`.

### Verification Log

- 2026-07-26 19:30 JST: `pnpm test packages/integrations/src/spreadsheet/expense-repository.test.ts` failed as expected because `repository.create/update/delete` did not exist.
- 2026-07-26 19:52 JST: `pnpm test packages/integrations/src/spreadsheet/google-sheets-values-client.test.ts` failed as expected because `appendValues` did not exist.
- 2026-07-26 19:53 JST: `pnpm test apps/api/src/app.test.ts` failed as expected because mutation routes returned 404.
- 2026-07-26 19:56 JST: `pnpm test apps/api/src/app.test.ts packages/integrations/src/spreadsheet/expense-repository.test.ts packages/integrations/src/spreadsheet/google-sheets-values-client.test.ts` passed with 19 tests across 3 files.
- 2026-07-26 19:59 JST: `pnpm test` passed with 71 tests across 14 files.
- 2026-07-26 19:58 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-26 19:59 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Remove category from expense row meta

### Checklist

- [x] Confirm display direction
- [x] Add failing web layout test
- [x] Verify RED with targeted test
- [x] Remove category from meta row
- [x] Verify targeted test passes
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-25 23:05 JST: User chose to stop showing category in the list meta line after adding payer pills.
- 2026-07-25 23:01 JST: Removed category from the expense meta row; category still appears as the main title when memo is missing.
- 2026-07-25 23:02 JST: Committed changes as `feat: simplify expense row meta`.

### Verification Log

- 2026-07-25 23:01 JST: `pnpm test apps/web-dev-config.test.ts` failed as expected because `expense.category` was still rendered before the payer pill.
- 2026-07-25 23:01 JST: `pnpm test apps/web-dev-config.test.ts` passed with 8 tests.
- 2026-07-25 23:01 JST: `pnpm test` passed with 61 tests across 14 files.
- 2026-07-25 23:02 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-25 23:02 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Improve payer visibility in expense list

### Checklist

- [x] Explore current list markup and styles
- [x] Present payer visibility options
- [x] Receive option A selection
- [x] Add failing web layout/style tests
- [x] Verify RED with targeted test
- [x] Implement left payer bar and payer pill
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-25 23:00 JST: User asked to improve visibility of who paid in the mobile expense list.
- 2026-07-25 23:00 JST: Created visual comparison mock for A/B/C payer display options; user chose option A, left color bar plus payer name pill.
- 2026-07-25 22:56 JST: Implemented option A with a payer-colored left border and payer name pill on each expense row.
- 2026-07-25 22:57 JST: Committed changes as `feat: highlight expense payers`.

### Verification Log

- 2026-07-25 22:55 JST: `pnpm test apps/web-dev-config.test.ts` failed as expected because the expense rows did not expose payer class names or payer pill styles.
- 2026-07-25 22:56 JST: `pnpm test apps/web-dev-config.test.ts` passed with 7 tests.
- 2026-07-25 22:56 JST: `pnpm test` passed with 60 tests across 14 files.
- 2026-07-25 22:56 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-25 22:57 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Display Spreadsheet user names

### Checklist

- [x] Inspect `users` sheet structure
- [x] Add failing repository/API/web tests for user names
- [x] Verify RED with targeted tests
- [x] Implement `users` sheet name resolution
- [x] Add `userName` to shared/API contract types
- [x] Render `userName` in web when available
- [x] Verify targeted tests pass
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-25 22:05 JST: Read `users!A1:F3`; columns are `type,name,line_user_id,firebase_id,created_at,updated_at` with `1 -> ひとみ`, `2 -> げんき`.
- 2026-07-25 22:05 JST: User approved resolving display names from the `users` sheet and falling back to `userId` when missing.
- 2026-07-25 22:48 JST: Implemented optional `Expense.userName`, users-sheet name lookup in `SpreadsheetExpenseRepository`, OpenAPI schema update, and web display fallback.
- 2026-07-25 22:49 JST: Committed changes as `feat: display spreadsheet user names`.

### Verification Log

- 2026-07-25 22:47 JST: `pnpm test packages/integrations/src/spreadsheet/expense-repository.test.ts apps/api/src/app-env.test.ts apps/web/src/features/expenses/api.test.ts` failed as expected because the repository did not read `users!A2:F` or return `userName`.
- 2026-07-25 22:48 JST: `pnpm test packages/integrations/src/spreadsheet/expense-repository.test.ts apps/api/src/app-env.test.ts apps/web/src/features/expenses/api.test.ts` passed with 9 tests across 3 files.
- 2026-07-25 22:48 JST: `pnpm test` passed with 59 tests across 14 files.
- 2026-07-25 22:48 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-25 22:48 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Run API and web together for local dev

### Checklist

- [x] Investigate why sample data still renders
- [x] Present local dev design and receive approval
- [x] Add failing dev configuration tests
- [x] Verify RED with targeted test
- [x] Implement API local dev env loader and server
- [x] Update root/API dev scripts
- [x] Set ignored local web API URL
- [x] Verify targeted tests pass
- [x] Avoid sample fallback when configured API fails
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Verify local API/web dev behavior
- [x] Commit changes

### Progress Log

- 2026-07-25 21:45 JST: Root cause identified: web fell back to sample data because `NEXT_PUBLIC_API_BASE_URL` was empty and root `pnpm dev` only started the web app.
- 2026-07-25 21:46 JST: User approved adding a local API dev server and running API/web together from root `pnpm dev`.
- 2026-07-25 21:48 JST: Implemented local API env loader, Node HTTP Hono dev server, parallel root dev script, API dev script, and ignored `.env.local` API URL.
- 2026-07-25 21:50 JST: Switched API dev execution to `tsx src/dev.ts` after `node dist/dev.js` failed on extensionless ESM imports emitted by the current TypeScript config.
- 2026-07-25 21:53 JST: Changed page data loading so configured API failures show an error/empty state instead of falling back to sample expenses.
- 2026-07-25 21:55 JST: Updated root `pnpm dev` to pass web preview env directly because Next.js does not read the repo-root `.env.local` when started from `apps/web`.
- 2026-07-25 21:57 JST: Committed changes as `fix: run api in local dev`.

### Verification Log

- 2026-07-25 21:46 JST: `pnpm test apps/web-dev-config.test.ts apps/api/src/dev-env.test.ts` failed as expected because root `dev`, API `dev`, and `dev-env` did not exist yet.
- 2026-07-25 21:48 JST: `pnpm test apps/web-dev-config.test.ts apps/api/src/dev-env.test.ts` passed with 7 tests across 2 files.
- 2026-07-25 21:48 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-25 21:50 JST: `pnpm --filter @shared-expense/api dev` initially failed with `ERR_MODULE_NOT_FOUND` for `dist/app`, confirming the compiled dev entry could not run directly under Node ESM.
- 2026-07-25 21:52 JST: `curl -sL http://localhost:8787/health` returned `{"ok":true}` from the API dev server.
- 2026-07-25 21:52 JST: `curl -sL -H 'Authorization: Bearer local-dev' 'http://localhost:8787/api/expenses?date=2026-07'` returned `Internal Server Error`; API log showed `Failed to read Google Sheets values: 403`, indicating the service account still lacks Spreadsheet read access.
- 2026-07-25 21:52 JST: `pnpm test apps/web/src/features/expenses/page-data.test.ts` failed as expected because `./page-data` did not exist yet.
- 2026-07-25 21:54 JST: `pnpm test apps/web-dev-config.test.ts` failed as expected because root `dev` did not yet pass `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_DEV_LIFF_ID_TOKEN`.
- 2026-07-25 21:54 JST: `pnpm test apps/web-dev-config.test.ts apps/api/src/dev-env.test.ts apps/web/src/features/expenses/page-data.test.ts` passed with 9 tests across 3 files.
- 2026-07-25 21:55 JST: `pnpm test` passed with 58 tests across 14 files.
- 2026-07-25 21:55 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-25 21:55 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.
- 2026-07-25 21:56 JST: `pnpm dev` started API at `http://localhost:8787` and web at `http://localhost:3000`.
- 2026-07-25 21:56 JST: `curl -sL http://localhost:3000` returned HTML without the `Sample` badge or sample rows; it showed `APIから取得できません。APIの起動状態とSpreadsheet権限を確認してください` because the API still receives Google Sheets 403.

## Task: Switch Google Sheets auth to service account

### Checklist

- [x] Write implementation plan
- [x] Add failing service account access token provider test
- [x] Implement service account JWT signing and OAuth token exchange
- [x] Change Google Sheets values client to use an access token provider
- [x] Wire API env to service account credentials
- [x] Update env templates
- [x] Run targeted tests
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-25 17:30 JST: Started service account auth switch from manual `GOOGLE_ACCESS_TOKEN` to `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`.
- 2026-07-25 17:30 JST: Wrote focused implementation plan at `docs/superpowers/plans/2026-07-25-google-service-account-auth.md`.
- 2026-07-25 21:37 JST: Implemented service account JWT token exchange, provider-backed Sheets fetches, API env wiring, and env template updates.
- 2026-07-25 21:42 JST: Committed changes as `feat: use service account for sheets auth`.

### Verification Log

- 2026-07-25 21:35 JST: `pnpm test packages/integrations/src/google/service-account-access-token-provider.test.ts` failed as expected because `./service-account-access-token-provider` did not exist.
- 2026-07-25 21:40 JST: `pnpm test packages/integrations/src/google/service-account-auth-provider.test.ts packages/integrations/src/spreadsheet/google-sheets-values-client.test.ts apps/api/src/app-env.test.ts` passed with 6 tests across 3 files after renaming the provider file to avoid global ignored `*token*` paths.
- 2026-07-25 21:40 JST: `pnpm test` passed with 53 tests across 12 files.
- 2026-07-25 21:40 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-25 21:41 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Add env templates

### Checklist

- [x] Create committed `.env.example`
- [x] Create ignored local `.env.local`
- [x] Verify `.env.local` is ignored
- [x] Commit changes

### Progress Log

- 2026-07-25 17:15 JST: Added env template for Spreadsheet-backed API reads and web API preview connection.

### Verification Log

- 2026-07-25 17:15 JST: `git status --short` showed `.env.example` as untracked and did not show `.env.local`, confirming local env is ignored.

## Task: Wire API to Spreadsheet repository

### Checklist

- [x] Write implementation plan
- [x] Add failing Google Sheets values client tests
- [x] Verify values client RED with targeted test
- [x] Implement fetch-backed Google Sheets values client
- [x] Verify values client GREEN with targeted test
- [x] Add failing API env wiring tests
- [x] Verify API wiring RED with targeted test
- [x] Implement `createAppFromEnv` Spreadsheet wiring
- [x] Verify API wiring GREEN with targeted test
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-25 12:40 JST: Started API wiring slice for the real Spreadsheet repository using `user_type` mapping `1 -> woman`, `2 -> man`.
- 2026-07-25 12:40 JST: Wrote focused implementation plan at `docs/superpowers/plans/2026-07-25-api-spreadsheet-wiring.md`.
- 2026-07-25 12:54 JST: Added fetch-backed Google Sheets values client and `createAppFromEnv` Spreadsheet wiring.

### Verification Log

- 2026-07-25 12:53 JST: `pnpm test packages/integrations/src/spreadsheet/google-sheets-values-client.test.ts` failed as expected because `./google-sheets-values-client` did not exist.
- 2026-07-25 12:53 JST: `pnpm test apps/api/src/app-env.test.ts` failed as expected because `createAppFromEnv` was not implemented.
- 2026-07-25 12:54 JST: `pnpm test packages/integrations/src/spreadsheet/google-sheets-values-client.test.ts` passed with 2 tests.
- 2026-07-25 12:54 JST: `pnpm test apps/api/src/app-env.test.ts` initially failed because `@shared-expense/integrations` workspace link was not installed; `pnpm install --no-frozen-lockfile` refreshed the link and the targeted test passed with 2 tests.
- 2026-07-25 12:54 JST: `pnpm test` passed with 51 tests across 11 files.
- 2026-07-25 12:55 JST: `pnpm typecheck` initially failed because `fetcher: undefined` was explicitly passed under `exactOptionalPropertyTypes`; changed wiring to include `fetcher` only when present.
- 2026-07-25 12:55 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-25 12:55 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.
- 2026-07-25 17:05 JST: Pre-commit `pnpm test` passed with 51 tests across 11 files.
- 2026-07-25 17:05 JST: Pre-commit `pnpm typecheck` passed; Redocly reported the same existing OpenAPI warnings.
- 2026-07-25 17:05 JST: Pre-commit `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Spreadsheet Expense Repository

### Checklist

- [x] Write implementation plan
- [x] Add failing Spreadsheet repository tests
- [x] Verify RED with targeted test
- [x] Implement Google Sheets values-backed Expense repository
- [x] Export repository APIs
- [x] Verify GREEN with targeted test
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Commit changes

### Progress Log

- 2026-07-25 10:55 JST: Started Spreadsheet-backed Expense repository slice after user approved the design.
- 2026-07-25 10:55 JST: Wrote focused implementation plan at `docs/superpowers/plans/2026-07-25-spreadsheet-expense-repository.md`.
- 2026-07-25 12:26 JST: Implemented `SpreadsheetExpenseRepository` backed by a Google Sheets values client and existing legacy payments row mapper.

### Verification Log

- 2026-07-25 12:25 JST: `pnpm test packages/integrations/src/spreadsheet/expense-repository.test.ts` failed as expected because `./expense-repository` did not exist.
- 2026-07-25 12:25 JST: `pnpm test packages/integrations/src/spreadsheet/expense-repository.test.ts` passed with 3 tests.
- 2026-07-25 12:26 JST: `pnpm test` passed with 47 tests across 9 files.
- 2026-07-25 12:26 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-25 12:26 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.
- 2026-07-25 12:27 JST: Pre-commit `pnpm test` passed with 47 tests across 9 files.
- 2026-07-25 12:27 JST: Pre-commit `pnpm typecheck` passed; Redocly reported the same existing OpenAPI warnings.
- 2026-07-25 12:27 JST: Pre-commit `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Expense list API and frontend connection

### Checklist

- [x] Write implementation plan
- [x] Add failing API route tests
- [x] Verify API RED with targeted test
- [x] Implement Expense repository and list route
- [x] Verify API GREEN with targeted test
- [x] Add failing frontend API adapter tests
- [x] Verify frontend RED with targeted test
- [x] Implement frontend API adapter and page connection
- [x] Verify frontend GREEN with targeted test
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`

### Progress Log

- 2026-07-25 10:45 JST: Started vertical slice for `GET /api/expenses?date=YYYY-MM` through mobile monthly list rendering.
- 2026-07-25 10:45 JST: Wrote focused implementation plan at `docs/superpowers/plans/2026-07-25-expense-list-api-web-connection.md`.
- 2026-07-25 10:45 JST: Added authenticated Expense list route with injectable repository and connected the web preview through a fetch adapter with sample fallback.

### Verification Log

- 2026-07-25 10:42 JST: `pnpm test apps/api/src/app.test.ts` failed as expected because `./expenses/repository` did not exist.
- 2026-07-25 10:42 JST: `pnpm test apps/api/src/app.test.ts` passed with 3 tests.
- 2026-07-25 10:43 JST: `pnpm test apps/web/src/features/expenses/api.test.ts` failed as expected because `./api` did not exist.
- 2026-07-25 10:44 JST: `pnpm test apps/web/src/features/expenses/api.test.ts` passed with 3 tests.
- 2026-07-25 10:44 JST: `pnpm test` passed with 44 tests across 8 files.
- 2026-07-25 10:44 JST: `pnpm typecheck` failed because `apps/web` imported `@shared-expense/shared` without declaring the workspace dependency.
- 2026-07-25 10:44 JST: Added `@shared-expense/shared` to `apps/web/package.json`; `pnpm install --lockfile-only` recreated `node_modules` and needed network-backed `pnpm install --no-frozen-lockfile` to restore dependencies.
- 2026-07-25 10:44 JST: `pnpm typecheck` failed because `Array.prototype.toSorted` is not available under the repo's ES2022 lib target.
- 2026-07-25 10:45 JST: Replaced `toSorted` with copy-plus-`sort`.
- 2026-07-25 10:45 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-25 10:45 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.
- 2026-07-25 10:47 JST: Final `pnpm test` passed with 44 tests across 8 files.
- 2026-07-25 10:47 JST: Final `pnpm typecheck` passed; Redocly reported the same existing OpenAPI warnings.
- 2026-07-25 10:47 JST: Final `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

## Task: Improve mobile monthly list preview

### Checklist

- [x] Add failing mobile layout and dark-mode guard tests
- [x] Verify RED with targeted test
- [x] Implement compact dashboard mobile layout
- [x] Add explicit light color-scheme and paired text/background colors
- [x] Verify targeted test passes
- [x] Run `pnpm test`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`

### Progress Log

- 2026-07-25 10:30 JST: Started mobile-first redesign after user chose visual option A and flagged dark-mode readability.
- 2026-07-25 10:35 JST: Replaced stacked summary cards with compact settlement-first dashboard panel and denser mobile expense rows.

### Verification Log

- 2026-07-25 10:34 JST: `pnpm test apps/web-dev-config.test.ts` failed as expected because the current UI still used `metric` cards and did not set `color-scheme: light`.
- 2026-07-25 10:35 JST: `pnpm test apps/web-dev-config.test.ts` passed with 4 tests.
- 2026-07-25 10:35 JST: `pnpm test` passed with 38 tests across 6 files.
- 2026-07-25 10:35 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-25 10:36 JST: `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.
- 2026-07-25 10:36 JST: Started a temporary Next.js dev server on port 3100 and `curl -sL http://localhost:3100` returned HTML containing `summaryPanel`, `summaryDetails`, and compact expense rows.

## Task: Enable local frontend preview with `pnpm dev`

### Checklist

- [x] Add failing workspace dev configuration test
- [x] Verify RED with targeted test
- [x] Add root `dev` script and minimal `apps/web` Next.js app
- [x] Install frontend dependencies
- [x] Verify targeted test passes
- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Start `pnpm dev` and confirm local URL

### Progress Log

- 2026-07-20 15:00 JST: Started task to make implemented screens confirmable with `pnpm dev`.
- 2026-07-20 16:11 JST: Added RED test for root `dev` delegation and `apps/web` Next.js scripts.
- 2026-07-20 16:14 JST: Added root `dev` script, minimal Next.js app under `apps/web`, and installed frontend dependencies.
- 2026-07-20 16:17 JST: Started `pnpm dev` with approval after sandbox port binding failed.

### Verification Log
- 2026-07-20 16:11 JST: `pnpm test apps/web-dev-config.test.ts` failed as expected because root `dev` was missing and `apps/web/package.json` did not exist.
- 2026-07-20 16:14 JST: `pnpm install --no-frozen-lockfile` failed in sandbox with `ENOTFOUND registry.npmjs.org`; reran with network approval and succeeded.
- 2026-07-20 16:16 JST: `pnpm test apps/web-dev-config.test.ts` passed with 2 tests.
- 2026-07-20 16:16 JST: `pnpm typecheck` passed; Redocly reported existing OpenAPI warnings for missing license and localhost server URL.
- 2026-07-20 16:16 JST: `pnpm build` passed; Next.js built `/` as static content and Redocly reported the same existing warnings.
- 2026-07-20 16:17 JST: `pnpm dev` failed in sandbox with `listen EPERM 0.0.0.0:3000`; reran with port binding approval and Next.js reported `Ready` at `http://localhost:3000`.
- 2026-07-20 16:17 JST: `curl -sL http://localhost:3000` returned the rendered page HTML containing `月次支出` and `明細`.
- 2026-07-20 16:18 JST: Final `pnpm test` passed with 36 tests across 6 files.
- 2026-07-20 16:18 JST: Final `pnpm typecheck` passed; Redocly reported the same existing OpenAPI warnings.
- 2026-07-20 16:18 JST: Final `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.
- 2026-07-20 16:18 JST: Final `curl -sL http://localhost:3000` returned the rendered page HTML containing `月次支出` and `明細`.
- 2026-07-25 10:23 JST: Pre-commit `pnpm test` passed with 36 tests across 6 files.
- 2026-07-25 10:23 JST: Pre-commit `pnpm typecheck` passed; Redocly reported the same existing OpenAPI warnings.
- 2026-07-25 10:23 JST: Pre-commit `pnpm build` passed; Next.js built `/` successfully and Redocly reported the same existing warnings.

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
- Executed first implementation slice in isolated worktree branch `implementation`.
- Completed Task 1 through Task 7 with subagent implementation plus spec and quality review loops.
- Updated implementation plan to remove obsolete `@hono/node-server` dependency from Task 6 because the API targets Cloudflare Workers.

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

## Task 6: API Application Skeleton and LIFF Auth Boundary

### Checklist

- [x] Write failing LIFF auth boundary tests
- [x] Verify RED with `pnpm test apps/api/src/auth/liff-token.test.ts`
- [x] Create API package and TypeScript config
- [x] Implement LIFF token auth boundary
- [x] Add minimal Hono app and default export
- [x] Run `pnpm install`
- [x] Verify GREEN with targeted auth test
- [x] Run `pnpm typecheck`
- [x] Commit API auth boundary

### Quality Review Fix Checklist

- [x] Change LIFF token test claims to a fresh factory
- [x] Add failing test for `verifyToken` non-AuthError normalization
- [x] Verify RED with `pnpm test apps/api/src/auth/liff-token.test.ts`
- [x] Convert `verifyToken` failures to `AuthError(401, "invalid_token", "Invalid LIFF token")`
- [x] Preserve existing `AuthError` failures from `verifyToken`
- [x] Verify GREEN with targeted auth test
- [x] Run `pnpm typecheck`
- [x] Amend Task 6 commit

### Progress Log

- 2026-07-20 14:23 JST: Started Task 6 in `.worktrees/implementation`.
- 2026-07-20 14:23 JST: Added LIFF auth boundary tests before implementation.
- 2026-07-20 14:24 JST: Created API package skeleton, LIFF auth boundary, minimal Hono app, and default app export.
- 2026-07-20 14:26 JST: Installed API dependencies and updated workspace lockfile.
- 2026-07-20 14:26 JST: Ran targeted auth test and root typecheck successfully.
- 2026-07-20 14:27 JST: Created commit `feat: add api auth boundary`; amended it to force-add auth files ignored by the global `**/*token*` rule.
- 2026-07-20 14:35 JST: Started CHANGES_REQUIRED fix for LIFF auth token verification error normalization and flaky fixed-exp test claims.
- 2026-07-20 14:35 JST: Changed `validClaims` to a factory and added a failing `verifyToken` throw normalization test before implementation.
- 2026-07-20 14:35 JST: Wrapped `verifyToken` in `try/catch`, preserving existing `AuthError` and converting other thrown errors to `invalid_token`.

### Verification Log

- 2026-07-20 14:23 JST: `pnpm test apps/api/src/auth/liff-token.test.ts` failed as expected because `./liff-token` did not exist.
- 2026-07-20 14:25 JST: `pnpm install` exited after showing an interactive node_modules reinstall prompt, so non-interactive install was required.
- 2026-07-20 14:25 JST: `CI=true pnpm install` failed with `ERR_PNPM_OUTDATED_LOCKFILE` because `apps/api/package.json` was not reflected in `pnpm-lock.yaml`.
- 2026-07-20 14:26 JST: `CI=true pnpm install --no-frozen-lockfile` failed in the sandbox with `getaddrinfo ENOTFOUND registry.npmjs.org`; reran with network approval and succeeded.
- 2026-07-20 14:26 JST: `pnpm test apps/api/src/auth/liff-token.test.ts` passed with 5 tests.
- 2026-07-20 14:26 JST: `pnpm typecheck` passed for `@shared-expense/api-contract`, `@shared-expense/shared`, `@shared-expense/integrations`, and `@shared-expense/api`; Redocly repeated existing warnings for missing `info.license` and localhost server URL.
- 2026-07-20 14:27 JST: Final pre-commit `pnpm test apps/api/src/auth/liff-token.test.ts` passed with 5 tests.
- 2026-07-20 14:27 JST: Final pre-commit `pnpm typecheck` passed for `@shared-expense/api-contract`, `@shared-expense/shared`, `@shared-expense/integrations`, and `@shared-expense/api`; Redocly repeated existing warnings for missing `info.license` and localhost server URL.
- 2026-07-20 14:28 JST: Post-amend `pnpm test apps/api/src/auth/liff-token.test.ts` passed with 5 tests.
- 2026-07-20 14:28 JST: Post-amend `pnpm typecheck` passed for `@shared-expense/api-contract`, `@shared-expense/shared`, `@shared-expense/integrations`, and `@shared-expense/api`; Redocly repeated existing warnings for missing `info.license` and localhost server URL.
- 2026-07-20 14:34 JST: `pnpm test apps/api/src/auth/liff-token.test.ts` failed as expected with 1 failing test; `Error: bad token` was not normalized to `AuthError(401, "invalid_token", "Invalid LIFF token")`.
- 2026-07-20 14:34 JST: `pnpm test apps/api/src/auth/liff-token.test.ts` passed with 6 tests.
- 2026-07-20 14:34 JST: `pnpm typecheck` passed for `@shared-expense/api-contract`, `@shared-expense/shared`, `@shared-expense/integrations`, and `@shared-expense/api`; Redocly repeated existing warnings for missing `info.license` and localhost server URL.
- 2026-07-20 14:35 JST: Final pre-amend `pnpm test apps/api/src/auth/liff-token.test.ts` passed with 6 tests.
- 2026-07-20 14:35 JST: Final pre-amend `pnpm typecheck` passed for `@shared-expense/api-contract`, `@shared-expense/shared`, `@shared-expense/integrations`, and `@shared-expense/api`; Redocly repeated existing warnings for missing `info.license` and localhost server URL.
