# Lessons

- 2026-07-25: When wiring frontend to real API data, make root local development start every required service and ensure `.env.local` points the web app at the local API. Do not rely on silent sample fallback as the default verification path.
- 2026-07-27: When adding frontend mutations, never use bare `catch` blocks that only show a generic UI message. Preserve the thrown error, log it with operation context, and include API response status/body details in the user-visible failure message where safe.
- 2026-07-27: Local development authentication must return domain user ids that are accepted by downstream repositories. For Spreadsheet-backed expense mutations, do not use placeholder actor ids like `local-dev`; use `woman` or `man` so `userIdToUserType` can write legacy rows.
- 2026-07-27: When a referenced Google Sheet initially returns 403, retry connector metadata/range reads after the user updates sharing before locking in assumptions about the sheet shape.
- 2026-07-28: Month navigation that fetches server data must provide immediate client-side feedback. Update the visible selection and pending style on tap, then sync with server props when the navigation completes.
- 2026-07-28: Notification deep links should take the user directly to the relevant detail state when possible. Avoid relying on subtle row highlight badges for edit/delete context on mobile.
