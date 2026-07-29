# Cloudflare Workers Web Deployment

## Web App

- App: `@shared-expense/web`
- Source: `apps/web`
- Adapter: `@opennextjs/cloudflare`
- Next.js output mode: `standalone`
- Worker name: `shared-expense-web`

OpenNext Cloudflare adapts the Next.js build output for the Cloudflare runtime. Use this path because the monthly expense page is dynamic and reads API data at request time.

This deployment must use Cloudflare Workers, not a static Cloudflare Pages output directory. The OpenNext output contains a Worker bundle plus assets, so pointing Cloudflare Pages at `.open-next` can fail with inaccessible link validation errors.

## Required Environment Variables

Set these build/runtime environment variables for the web deployment:

```text
NEXT_PUBLIC_API_BASE_URL=https://<shared-expense-api-worker-url>
NEXT_PUBLIC_LIFF_ID=<production-liff-id>
```

Do not set `NEXT_PUBLIC_DEV_ID_TOKEN` in production.

## Build

Cloudflare build command:

```sh
pnpm --filter @shared-expense/web run worker:build
```

OpenNext writes the Cloudflare runtime bundle to:

```text
apps/web/.open-next
```

The install command can stay as Cloudflare's default:

```sh
pnpm install --frozen-lockfile
```

## Deploy

If deploying from this repository via command:

```sh
pnpm deploy:web
```

When running the package deploy script directly, use:

```sh
pnpm --filter @shared-expense/web run worker:deploy
```

## Preview

```sh
pnpm --filter @shared-expense/web run worker:preview
```

The older `pages:*` scripts are kept as aliases, but `worker:*` is the preferred naming because OpenNext Cloudflare deploys this dynamic Next.js app as a Worker.
