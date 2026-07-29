# Cloudflare Workers API Deployment

## API Worker

- Worker: `shared-expense-api`
- Entrypoint: `apps/api/src/index.ts`
- Local Node dev server: `pnpm --filter @shared-expense/api dev`
- Worker dev server: `pnpm --filter @shared-expense/api dev:worker`

## Required Secrets

Set these values on the `shared-expense-api` Worker before deploying:

```sh
pnpm --filter @shared-expense/api exec wrangler secret put GOOGLE_SPREADSHEET_ID
pnpm --filter @shared-expense/api exec wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
pnpm --filter @shared-expense/api exec wrangler secret put GOOGLE_PRIVATE_KEY
pnpm --filter @shared-expense/api exec wrangler secret put LINE_LOGIN_CHANNEL_ID
pnpm --filter @shared-expense/api exec wrangler secret put LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
pnpm --filter @shared-expense/api exec wrangler secret put LINE_NOTIFICATION_DETAIL_BASE_URL
```

## Required Variables

`API_ALLOWED_ORIGINS` is a comma-separated list of allowed frontend origins. It is not a secret and is configured in `apps/api/wrangler.jsonc`.

Production currently allows the Cloudflare Pages frontend and local dev origins:

```text
https://shared-expense.pages.dev,http://localhost:3000,http://localhost:3001
```

## Deploy

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
