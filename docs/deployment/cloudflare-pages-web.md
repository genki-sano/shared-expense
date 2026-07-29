# Cloudflare Web Deployment

## Web App

- App: `@shared-expense/web`
- Source: `apps/web`
- Adapter: `@opennextjs/cloudflare`
- Next.js output mode: `standalone`
- Worker name: `shared-expense-web`

OpenNext Cloudflare adapts the Next.js build output for the Cloudflare runtime. Use this path because the monthly expense page is dynamic and reads API data at request time.

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
pnpm --filter @shared-expense/web run pages:build
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
pnpm --filter @shared-expense/web run pages:deploy
```

## Preview

```sh
pnpm --filter @shared-expense/web run pages:preview
```
