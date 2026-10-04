# Lessons

- 2026-07-25: When wiring frontend to real API data, make root local development start every required service and ensure `.env.local` points the web app at the local API. Do not rely on silent sample fallback as the default verification path.
- 2026-07-27: When adding frontend mutations, never use bare `catch` blocks that only show a generic UI message. Preserve the thrown error, log it with operation context, and include API response status/body details in the user-visible failure message where safe.
- 2026-07-27: Local development authentication must return domain user ids that are accepted by downstream repositories. For Spreadsheet-backed expense mutations, do not use placeholder actor ids like `local-dev`; use `woman` or `man` so `userIdToUserType` can write legacy rows.
- 2026-07-27: When a referenced Google Sheet initially returns 403, retry connector metadata/range reads after the user updates sharing before locking in assumptions about the sheet shape.
- 2026-07-28: Month navigation that fetches server data must provide immediate client-side feedback. Update the visible selection and pending style on tap, then sync with server props when the navigation completes.
- 2026-07-28: Notification deep links should take the user directly to the relevant detail state when possible. Avoid relying on subtle row highlight badges for edit/delete context on mobile.
- 2026-07-28: When a notification deep link opens an item in a long mobile list, also scroll that item into view so the destination is visible immediately.
- 2026-07-29: When an API error response is itself confusing to users, improve the API contract and response body before only masking it in the frontend. Include an actionable next step in `details.action`.
- 2026-07-29: For Wrangler JSON/JSONC configuration changes, tests must parse the config instead of only checking string snippets so missing braces and trailing commas are caught before deployment.
- 2026-08-01: When production auth reports missing configuration even though Worker secrets exist, verify the application env wiring path before assuming the Cloudflare value is absent. Add tests that exercise `createAppFromEnv(env)` without injected auth dependencies.
- 2026-08-01: When an auth failure log names a specific API method such as `GET /api/expenses`, fix the token lifecycle at the token acquisition boundary, not only mutation callers. Expired LIFF ID tokens must be prevented before any API request.
- 2026-08-01: Do not label post-token user lookup or Spreadsheet failures as if LINE login itself failed. User-facing auth errors must distinguish invalid LINE credentials from unavailable household user data.
- 2026-08-01: When LINE Messaging API returns a generic `Failed to send messages` error, validate the message object before assuming Provider or user-id mismatch. Log validation details without exposing tokens or recipient ids.
- 2026-08-01: Notification detail deep links must use the LIFF ID, not the LINE Login channel ID. Server-side API/Jobs env should be `LINE_LIFF_ID`; keep it separate from web's public `NEXT_PUBLIC_LIFF_ID`.
- 2026-08-02: Detail-page deep links exposed to users should prefer path-based URLs such as `/expense/:id`; confirm the public URL shape before settling for query-only routing.
- 2026-08-02: When adding restore/undo flows, verify notification behavior explicitly alongside create/update/delete. Restore is a mutation and must not silently skip partner notifications.
- 2026-08-02: For static-exported Next.js pages, verify the actual `out/` file path before writing Cloudflare Pages `_redirects`; `/route` may emit `route.html`, not `route/index.html`.
- 2026-09-26: When the user asks for a LINE friend-add onboarding flow, do not assume it belongs inside LIFF. Clarify whether the desired primary surface is LINE talk via Messaging API webhooks (`follow`, `message`, `postback`) before adding LIFF UI.
- 2026-09-26: Do not let one feature route import another feature route's repository contract just because the type is nearby. Put shared domain/application contracts under `apps/api/src/core/**` so features such as LINE webhook and Expenses routes depend inward.
- 2026-09-27: 支出登録通知の変更では、LIFF/API経由の `ExpenseMutationNotifier` だけでなく、LINE Webhook経由の独自通知処理も同時に確認する。登録導線が複数ある場合は、それぞれの通知先テストを更新する。

## 2026-10-03: Verify entry navigation, not only route existence
- User correction: plus/expense rows must navigate to canonical new/detail pages; legacy compatibility is unnecessary before production use.
- A route being directly accessible does not establish the intended user flow. When adding pages, update the existing entry controls and test their actual clicks and destination URLs.
- Do not let inferred compatibility override explicitly requested page-based navigation. Keep legacy URLs only when there is an actual requirement, and update notification producers with consumers.

## 2026-10-03: Place feature composition components consistently
- User noted HomeClient sits outside components although it composes React feature UI. Keep feature React components, including composition/auth wrappers, under the existing components directory; app owns route files.

## 2026-10-03: Separate React boundaries from plain infrastructure
- User pointed out TSX providers/auth screens remaining under lib. Keep common React providers and rendering boundaries in components; lib owns React-independent LIFF/HTTP/auth functions and types. Classify by responsibility rather than technical topic alone.

## 2026-10-03: Keep conventions actionable and remove confirmed dead code
- User requested ordered responsibility-based placement rules and explicit prohibited dependencies. Separate normative rules from existing exceptions; verify unused code references before removing it.
- For every apps/web change, consult scoped AGENTS and review README impact; update documentation when responsibilities, structure, routes or verification commands change.

## 2026-10-03: Review archived states alongside expense form design
- When proposing create/edit form layouts, include the existing archived/deleted and restored states in design review. Show retained content, disabled editing, and the restore action explicitly.
- Expense form design uses the user's preferred currency notation: ¥ before the grouped amount, consistently across create, edit and archived states.
- Expense detail screen keeps the heading 支出詳細 even when editing is available or after an archived expense is restored.

## 2026-10-03: Account for native mobile date styling
- Shared date-input visual review must include iOS's internal ::-webkit-date-and-time-value alignment. Explicitly align both the input and native value element; desktop/mobile viewport emulation alone does not verify actual iOS native controls.

## 2026-10-03: Identify the missing notification before attributing failure
- Clarify recipient and whether the chat message or device notification is missing. An empty partner push target is a separate defect and does not explain actor delivery when sends are isolated by Promise.allSettled. Do not infer initial-login timing as the cause without response logs.

## 2026-10-04: Match webhook reliability scope to the requested fix
- Early acknowledgment and waitUntil do not require persistent state. Do not add D1/deduplication infrastructure to a timeout-and-logging fix without agreement on its extra operational responsibility.
