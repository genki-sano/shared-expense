# Cloudflare Pages Web Deployment

## Web App

- App: `@shared-expense/web`
- Source: `apps/web`
- Next.js output mode: `export`
- Output directory: `apps/web/out`

The web app is deployed as a static Cloudflare Pages site. Runtime data is fetched from the API Worker in the browser after LIFF authentication.

## Required Environment Variables

Set these build environment variables for the Pages project:

```text
NEXT_PUBLIC_API_BASE_URL=https://<shared-expense-api-worker-url>
NEXT_PUBLIC_LIFF_ID=<production-liff-id>
```

Do not set `NEXT_PUBLIC_DEV_ID_TOKEN` in production.

## Cloudflare Pages Settings

If the Pages project root directory is the repository root:

```text
Build command: pnpm build:web
Build output directory: apps/web/out
```

If the Pages project root directory is `apps/web`:

```text
Build command: pnpm run build
Build output directory: out
```

The install command can stay as Cloudflare's default:

```sh
pnpm install --frozen-lockfile
```
