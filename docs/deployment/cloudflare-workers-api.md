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

## LINE Webhook processing and logs

After signature and request validation, the Worker registers processing with
`ctx.waitUntil()` and returns HTTP 200 without waiting for Spreadsheet or LINE API
calls. HTTP 200 acknowledges receipt, not successful expense registration. No D1
binding, migration or additional storage is required. The Node dev server explicitly
awaits processing because it has no Worker execution context.

Cloudflare Dashboard: `shared-expense-api` → Observability → Logs. Search application
logs for `line_webhook` and correlate by `webhookEventId`. The HTTP invocation log
alone does not describe registration or notification success. Processing, save,
reply and recipient push have start/completion logs; failures use `processing_failed`,
`save_failed`, `reply_failed` and `push_failed`. `push_skipped` explains disabled or
unregistered recipients. Logs omit message bodies, tokens and raw LINE identifiers.

```sh
pnpm --filter @shared-expense/api exec wrangler tail --format json
```

There is no persisted processing state, deduplication or automatic retry. Failed
notifications do not roll back saved expenses. A successful acknowledgment does not
cause LINE to retry failed background work. Duplicate/replayed events can register
and notify again; do not replay an entire event just to retry a notification.

For recovery, inspect the stage logs and Spreadsheet before manually correcting
registration or notification. If a save result is unknown, check for an existing
expense before adding one. No original payload or administrative replay endpoint
is retained. Physical Worker interruption can prevent a final application log.

`waitUntil()` provides up to 30 seconds of post-response processing and is best
effort, not durable execution. See the [Cloudflare execution-context documentation](https://developers.cloudflare.com/workers/runtime-apis/context/).
