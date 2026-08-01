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
