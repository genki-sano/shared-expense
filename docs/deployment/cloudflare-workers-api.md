# Cloudflare Workers API Deployment

## API Worker

- Worker: `shared-expense-api`
- Entrypoint: `apps/api/src/index.ts`
- Local Node dev server: `pnpm --filter @shared-expense/api dev`

## Required Secrets

Set these values on the `shared-expense-api` Worker before deploying:

```sh
pnpm --filter @shared-expense/api exec wrangler secret put GOOGLE_SPREADSHEET_ID
pnpm --filter @shared-expense/api exec wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
pnpm --filter @shared-expense/api exec wrangler secret put GOOGLE_PRIVATE_KEY
pnpm --filter @shared-expense/api exec wrangler secret put LINE_LOGIN_CHANNEL_ID
pnpm --filter @shared-expense/api exec wrangler secret put LINE_LIFF_ID
pnpm --filter @shared-expense/api exec wrangler secret put LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
pnpm --filter @shared-expense/api exec wrangler secret put LINE_MESSAGING_CHANNEL_SECRET
```

Notification detail links are generated as `https://liff.line.me/${LINE_LIFF_ID}`.

Configure the LINE Messaging API webhook URL to:

```text
https://shared-expense-api.dev-sano-0512.workers.dev/api/line/webhook
```

## Required Variables

`API_ALLOWED_ORIGINS` is a comma-separated list of allowed frontend origins. It is not a secret and is configured in `apps/api/wrangler.jsonc`.

Production currently allows the Cloudflare Pages frontend and local dev origins:

```text
https://shared-expense.pages.dev,http://localhost:3000,http://localhost:3001
```

## Deploy

For Cloudflare's build command, use:

```sh
pnpm build:api
```

```sh
pnpm --filter @shared-expense/api dry-run
pnpm deploy:api
```

When running the package deploy script directly, use `run deploy`:

```sh
pnpm --filter @shared-expense/api run deploy
```

## Smoke Check

After deployment, check:

```sh
curl "https://<shared-expense-api-worker-url>/health"
```

Expected response:

```json
{"ok":true}
```

## LINE Webhook processing and D1 setup

The Worker validates the LINE signature and request, registers processing with
`ctx.waitUntil()`, then responds with HTTP 200 without waiting for Spreadsheet or
LINE API calls. HTTP 200 confirms receipt, not successful expense registration.

Before deploying this change, create the processing-state database:

```sh
pnpm --filter @shared-expense/api exec wrangler d1 create shared-expense-line-webhooks
```

Replace the placeholder `database_id` in `apps/api/wrangler.jsonc` with the returned
ID. Keep the binding name `LINE_WEBHOOK_DB`, then apply the migration and regenerate
binding types:

```sh
pnpm --filter @shared-expense/api exec wrangler d1 migrations apply shared-expense-line-webhooks --remote
pnpm --filter @shared-expense/api generate:worker-types
pnpm --filter @shared-expense/api dry-run
```

Local Wrangler development uses `d1 migrations apply shared-expense-line-webhooks
--local`. The Node dev server explicitly uses an in-memory event store and awaits
processing; it does not reproduce production persistence or early acknowledgment.
Missing production storage returns HTTP 503 before acknowledgment.

D1 records the webhook event ID, expense snapshot, reply completion, recipient
progress and a processing lease. Expense snapshots include amount and memo; restrict
D1 access like Spreadsheet access. Raw webhook payloads, reply tokens and recipient
LINE identifiers are not stored. Do not purge records while their events could be
replayed; deleting them removes deduplication protection.

Expenses created from LINE use `line_<webhookEventId>` as their ID. Existing numeric
Spreadsheet IDs remain supported. Completed events are skipped; unfinished events
can be claimed again after release or expiration of the two-minute lease. Saved
expenses and completed recipient deliveries are reused. Push requests use stable
LINE retry keys; uncertain delivery older than 24 hours is stopped for manual
verification because LINE retry keys expire.

There is no automatic retry or queue. `waitUntil()` has a limited post-response
execution window (30 seconds), and accepted events can still fail or be interrupted.
D1 and Spreadsheet do not share a transaction. If a save was started without a
recorded result, replay first looks for the deterministic expense ID. If it cannot
find the row, it stops rather than potentially creating a duplicate.

## Webhook logs and recovery

In Cloudflare Dashboard, open `shared-expense-api` → Observability → Logs. Search
application logs by `line_webhook` and correlate by `webhookEventId`; invocation logs
such as `POST /api/line/webhook` only describe the HTTP request. Successful receipt
is logged as `received`, then processing, save, reply and recipient push each have
start/completion logs. Failures use `processing_failed`, `save_failed`, `reply_failed`,
`push_failed` or `checkpoint_failed`. `push_skipped` explains disabled, unregistered
or already-notified recipients. Logs use internal household user IDs, not LINE IDs,
and omit message bodies and tokens.

For live inspection:

```sh
pnpm --filter @shared-expense/api exec wrangler tail --format json
```

On failure, inspect the event row in D1 and the `line_<webhookEventId>` row in
Spreadsheet before taking action. Checkpoints remain available even when the
background task is interrupted. A verified replay of the original event resumes
unfinished work; a successful 200 does not cause LINE to redeliver automatically,
and the original payload is not retained by this service. Manual replay requires
access to the original event and a valid LINE signature. An expired reply token can
fall back to the actor's enabled push notification.

Do not delete the event row or resend the expense as a new event to retry only a
notification. For an uncertain save with no row found, or an expired push retry key,
verify the original operation manually before deciding on recovery. There is no
administrative replay endpoint in this implementation.
