# Cloudflare Workers Cron Deployment

## Monthly Settlement Reminder

- Worker: `shared-expense-jobs`
- Entrypoint: `apps/jobs/src/index.ts`
- Schedule: `0 10 5 * *` UTC
- Local time: every month on the 5th at 19:00 JST

## Required Bindings

Set these values on the `shared-expense-jobs` Worker before deploying:

```sh
pnpm --filter @shared-expense/jobs exec wrangler secret put GOOGLE_SPREADSHEET_ID
pnpm --filter @shared-expense/jobs exec wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
pnpm --filter @shared-expense/jobs exec wrangler secret put GOOGLE_PRIVATE_KEY
pnpm --filter @shared-expense/jobs exec wrangler secret put LINE_LIFF_ID
pnpm --filter @shared-expense/jobs exec wrangler secret put LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
```

Notification detail links are generated as `https://liff.line.me/${LINE_LIFF_ID}`.

`LINE_LOGIN_CHANNEL_ID` and `LINE_MESSAGING_CHANNEL_SECRET` are not required for
this Jobs Worker. They are used by the API Worker for LIFF ID token verification
and LINE webhook signature verification.

## Deploy

For Cloudflare's build command, use:

```sh
pnpm build:jobs
```

```sh
pnpm --filter @shared-expense/jobs dry-run
pnpm deploy:jobs
```

When running the package deploy script directly, use `run deploy`:

```sh
pnpm --filter @shared-expense/jobs run deploy
```

## Local Scheduled Test

```sh
pnpm --filter @shared-expense/jobs dev
```

The Jobs dev script loads the repository root `.env.local` via
`--env-file ../../.env.local`. Keep the local Jobs values there; do not commit
that file.

Then trigger the scheduled handler from the local Wrangler server:

```sh
curl "http://localhost:8787/__scheduled?cron=0+10+5+*+*"
```

Before enabling this Worker in production, confirm the old GAS trigger is disabled or scheduled so it cannot send the same monthly settlement reminder twice.
