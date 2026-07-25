# Google Service Account Auth Plan

## Goal

Use `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` to read Google Sheets data without manually rotating `GOOGLE_ACCESS_TOKEN`.

## Checklist

- [x] Add a failing service account access token provider test
- [x] Implement service account JWT signing and OAuth token exchange
- [x] Change Google Sheets values client to use an access token provider
- [x] Wire API env to service account credentials
- [x] Update env templates
- [x] Run targeted tests
- [x] Run full verification
- [x] Commit changes

## Notes

- Keep the scope to read-only Google Sheets access.
- Accept private keys stored with escaped `\n` characters in env files.
- Avoid adding dependencies; use Web Crypto APIs available in Workers.
