# Lessons

- 2026-07-25: When wiring frontend to real API data, make root local development start every required service and ensure `.env.local` points the web app at the local API. Do not rely on silent sample fallback as the default verification path.
- 2026-07-27: When adding frontend mutations, never use bare `catch` blocks that only show a generic UI message. Preserve the thrown error, log it with operation context, and include API response status/body details in the user-visible failure message where safe.
