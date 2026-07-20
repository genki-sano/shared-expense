# Task: shared-expense monorepo replacement design

## Checklist

- [x] Explore current workspace instructions and existing docs
- [x] Confirm monorepo replacement direction
- [x] Confirm initial scope: full replacement before feature additions
- [x] Confirm Spreadsheet migration stance
- [x] Confirm authentication stance
- [x] Confirm update notification recipient rule
- [x] Clarify initial LIFF UI information architecture
- [x] Clarify monthly settlement reminder content
- [x] Clarify existing code migration policy
- [x] Propose implementation approaches and recommendation
- [x] Present design for approval
- [x] Write approved spec
- [x] Self-review spec
- [x] Ask user to review spec before implementation planning

## Notes

- Workspace is not currently a Git repository.
- Existing docs already favor TypeScript monorepo with Hono on Cloudflare Workers, LIFF frontend, Workers Cron, Spreadsheet continuity, and LINE Messaging API notifications.
- User confirmed monorepo direction.
- User chose initial release strategy A: complete replacement before feature additions.
- User chose Spreadsheet strategy B: maintain compatibility while adding necessary columns/sheets.
- User chose authentication strategy A: require LIFF ID token verification.
- User chose notification strategy C: notify the spouse/partner except the actor, while respecting `notifyEnabled`.
- User chose initial LIFF information architecture B: monthly list first.
- User chose monthly settlement reminder content B: settlement amount plus summary breakdown.
- User chose existing code migration policy B: read existing code and port only necessary business logic.
- User approved approach 1: contract-first migration.

## Verification Log

- Read `AGENTS.md`.
- Read `docs/01-architecture.md`.
- Read `docs/02-migration-plan.md`.
- Read `docs/03-implementation-guide.md`.
- Read `packages/api-contract/openapi.yaml`.
- Wrote `docs/superpowers/specs/2026-07-20-shared-expense-replacement-design.md`.
- Ran placeholder/scope scan with `rg`.
- Used a subagent design review and addressed findings around OpenAPI mismatch, initial Settlement scope, idempotency, version conflicts, notification event IDs, monthly reminder recipients, LIFF token validation, and cutover ordering.
- Initialized Git repository because the workspace did not have `.git`.
- Created initial design commit.
