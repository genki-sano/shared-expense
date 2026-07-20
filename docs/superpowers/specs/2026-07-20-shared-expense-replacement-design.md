# Shared Expense Replacement Design

## Purpose

Replace the current three-repository household expense system with a TypeScript monorepo while preserving the existing production behavior before adding new features.

Current repositories to replace:

- `genki-sano/mm-server`
- `genki-sano/mm-client`
- `genki-sano/mm-gas`

The initial release prioritizes complete replacement over feature expansion. Existing code should be inspected and only necessary business logic should be ported, especially Spreadsheet column mapping, settlement calculation, scheduled job behavior, and LINE notification text.

## Approved Decisions

- Use a TypeScript monorepo.
- Use contract-first implementation with OpenAPI as the API source of truth.
- Keep Google Spreadsheet as the initial data store.
- Preserve the existing Spreadsheet structure where possible, but add necessary columns and sheets for reliability.
- Require LIFF ID token verification for API access.
- Use a monthly-list-first LIFF UI.
- Notify the spouse/partner other than the actor, while respecting the recipient user's `notifyEnabled` setting.
- Send monthly settlement reminders with settlement amount and summary breakdown.
- Cut over in one maintenance window, targeting completion within 30 minutes.

## Initial Scope

The initial release must provide:

- Expense CRUD.
- Monthly expense list.
- Monthly settlement summary.
- LINE rich-menu to LIFF entry flow.
- Data update notifications.
- Monthly settlement reminder at 19:00 JST on the 5th of each month.
- Notification deduplication and failure recording.
- Rollback path to the old API and GAS jobs.

The initial release must not include:

- Full migration from Spreadsheet to Supabase, D1, or another database.
- Broad feature redesign beyond the replacement scope.
- General broadcast notifications.
- Settlement completion workflows unless already required by existing behavior.

## Repository Structure

```text
.
├── apps/
│   ├── web/                # Next.js LIFF frontend
│   ├── api/                # Hono on Cloudflare Workers
│   └── jobs/               # Cloudflare Workers Cron handlers
├── packages/
│   ├── api-contract/       # OpenAPI source and generated types
│   ├── shared/             # domain types, schemas, utilities
│   └── integrations/       # Spreadsheet and LINE adapters
└── docs/
```

## Architecture

`apps/web` hosts the LIFF application. It obtains a LIFF ID token, calls the Workers API, and presents the household expense workflow.

`apps/api` exposes Hono routes on Cloudflare Workers. It verifies the LIFF ID token, resolves the authenticated LINE user to an internal `User`, validates requests, calls domain services, and persists data through repository interfaces.

`apps/jobs` contains scheduled Workers handlers. The initial job runs monthly settlement reminders.

`packages/api-contract` owns `openapi.yaml` and generated client/server types. API behavior must match this contract.

`packages/shared` owns domain types, validation schemas, date helpers, money helpers, and settlement calculation.

`packages/integrations` owns external system adapters. Application code must not call Spreadsheet or LINE SDKs directly.

## Data Model

### User

- `id`
- `lineUserId`
- `displayName`
- `notifyEnabled`

The initial deployment assumes one household with two active users. The spouse/partner recipient is resolved as the other active user in the household. If existing Spreadsheet data already represents household relationships differently, the repository mapping must preserve that behavior and expose the same relationship through a small `Household` or `UserRelationship` abstraction.

### Expense

- `id`
- `userId`
- `date`
- `price`
- `category`
- `memo`
- `version`

### NotificationHistory

- `id`
- `eventType`
- `eventId`
- `sentToUserId`
- `sentAt`
- `deliveryStatus` (`success`, `failed`, or `skipped`)
- `providerMessageId`
- `errorReason`

Monthly settlement does not need to be a heavily persisted model in the initial release. The system calculates settlement amount and summary breakdown from `Expense` records for the target month. Notification history is persisted to prevent duplicate settlement reminders.

## Spreadsheet Design

Existing sheets and columns should be preserved where possible. The replacement may add:

- `notifyEnabled` to user data if it does not already exist.
- `version` to expense data for optimistic update detection.
- A dedicated notification history sheet.

Request idempotency should use an `Idempotency-Key` HTTP header for mutating API calls rather than storing a request field in the public `Expense` model. Spreadsheet storage may persist that key in a backing column if needed.

The notification history sheet must support deduplication by `eventType + eventId + sentToUserId`. The `eventId` must be unique per mutation, not only per expense. A valid initial format is:

- create: `expense.created:{expenseId}:v{version}`
- update: `expense.updated:{expenseId}:v{version}`
- delete: `expense.deleted:{expenseId}:v{deletedVersion}`
- monthly reminder: `settlement.monthly:{targetMonth}`

Repository interfaces isolate Spreadsheet access. API routes, jobs, and domain services must depend on repositories rather than direct Spreadsheet calls.

## API Design

OpenAPI is the source of truth. The initial API surface is:

- `GET /api/expenses?date=YYYY-MM`
- `POST /api/expenses`
- `PUT /api/expenses/{id}`
- `DELETE /api/expenses/{id}`
- `GET /api/settlements?month=YYYY-MM`

A settlement reminder trigger endpoint may exist only for local verification or tightly controlled administration:

- `POST /api/notifications/settlement-reminders`

The current `packages/api-contract/openapi.yaml` covers only Expense CRUD. Before implementation, it must be updated to include settlement summary and any approved notification verification endpoint.

`CreateExpenseRequest` should not require `userId`. The server derives `Expense.userId` from the authenticated LIFF user. If compatibility with an existing client requires accepting `userId`, it must match the authenticated user; otherwise the API returns `403`.

Mutating requests should accept `Idempotency-Key`. Updates should use the current `version` to prevent lost updates. Version conflicts return `409`.

All errors use:

```json
{
  "message": "string",
  "details": {}
}
```

## Authentication

All API requests require `Authorization: Bearer <LIFF ID token>`. The API verifies the token and resolves `lineUserId` to an internal `User`.

The API must not trust client-provided `userId` as the actor. The authenticated user determines the actor for create, update, delete, and notification logic. If a request body needs `userId` for compatibility, the server must validate it against the authenticated user or derive it server-side.

Token validation must check issuer, audience/channel ID, expiration, and subject. The token subject is treated as the LINE user ID. Invalid or expired tokens return `401`. Valid tokens that do not map to an allowed household user return `403`. Validation failures return `400`. Missing expenses return `404`.

## LIFF UI

The LIFF frontend uses a monthly-list-first layout.

The initial screen shows:

- Current target month.
- Monthly expense list.
- Monthly total and per-user totals.
- Settlement direction and amount.
- Primary action for adding an expense.

Required workflows:

- Change month.
- Add expense.
- Edit expense.
- Delete expense.
- View settlement summary.

The input form contains:

- Date.
- Price.
- Category.
- Memo.

After successful create, update, or delete, the monthly list and summary update immediately.

## Notifications

Expense create, update, and delete emit domain events only after successful persistence.

For update notifications:

1. Determine the actor from the authenticated user.
2. Resolve the spouse/partner as the recipient candidate from the configured household user relationship.
3. Skip sending if the recipient has `notifyEnabled = false`.
4. Check `NotificationHistory` for `eventType + eventId + sentToUserId`.
5. Send via LINE Messaging API if no successful history exists.
6. Record success or failure.

Notification history status rules:

- `success`: do not resend the same event to the same recipient.
- `failed`: allow retry for the same event and recipient.
- `skipped`: do not resend automatically, even if the recipient later enables notifications.

If notification is skipped by user setting, record `deliveryStatus = skipped` unless the existing system inventory shows that skipped notifications should not be persisted.

General broadcast notifications are forbidden in the initial release.

## Monthly Settlement Reminder

The monthly settlement reminder runs at:

- JST: monthly on the 5th at 19:00.
- Cloudflare Cron: `0 10 5 * *` UTC.

The job calculates the previous month's summary from expenses and sends the reminder to both household users whose `notifyEnabled` is `true`. The message content is the same for both users and contains:

- Target month.
- Each user's payment total.
- Household total.
- Difference.
- Settlement direction.
- Settlement amount.
- LIFF link for detail confirmation.

The job must use notification history to avoid duplicate sends for the same target month and recipient.

## Migration Plan

1. Inventory existing behavior from `mm-server`, `mm-client`, and `mm-gas`.
2. Document existing API endpoints, GAS jobs, notification triggers, notification text, and Spreadsheet schema.
3. Update OpenAPI for the approved initial API surface.
4. Implement shared domain models and settlement calculation with tests.
5. Implement Spreadsheet repositories with compatibility mapping.
6. Implement API routes against repositories and domain services.
7. Implement LINE adapter and notification service with deduplication.
8. Implement monthly Cron job.
9. Implement LIFF monthly-list-first UI.
10. Run local and staging verification.
11. Rehearse the production cutover with production-like data.
12. Execute the 30-minute maintenance cutover.

Rollback:

1. Enter maintenance and stop writes to both old and new paths.
2. Take a Spreadsheet backup.
3. Deploy and smoke test the new API.
4. Point LIFF to the new API only after the new API passes smoke tests.
5. Enable the new Cron job only after LIFF cutover succeeds.
6. If rollback is needed, point LIFF back to the old API.
7. Stop writes to the new API.
8. Disable the new Cron job.
9. Re-enable the old GAS job.
10. Check and manually reconcile any writes made during the cutover window.

## Testing Strategy

Use TDD for implementation.

Priority test coverage:

- Settlement calculation.
- Date/month handling around JST boundaries.
- Spreadsheet repository mapping.
- Idempotency behavior.
- Optimistic update behavior.
- `409` version conflict behavior.
- Notification recipient selection.
- Notification deduplication.
- Monthly reminder job target-month selection.
- OpenAPI response compatibility.
- LIFF create, update, delete, and monthly list flows.

LINE delivery tests should use an adapter fake or mock. Tests must verify recipient, payload, deduplication, and failure recording without relying on real LINE delivery.

## Risks

### Spreadsheet schema drift

Mitigation: inventory old sheets before implementation, keep mapping explicit, and test repository behavior with representative rows.

### Duplicate or incorrect notifications

Mitigation: use recipient resolution, `notifyEnabled`, and `NotificationHistory` deduplication for all notification paths.

### LIFF identity mismatch

Mitigation: verify LIFF ID token server-side and derive actor identity from the verified token.

### Cutover failure

Mitigation: rehearse the cutover, keep old API/GAS rollback path, and reconcile writes made during the maintenance window.

## Acceptance Criteria

- Expense CRUD works through the new LIFF UI and API.
- Monthly expense list and settlement summary are correct.
- OpenAPI includes all initial API endpoints and matches the implementation.
- API requests require valid LIFF authentication.
- Update notifications are sent only to the correct enabled recipient.
- Monthly settlement reminder includes amount and breakdown.
- Duplicate notification sends are prevented.
- Spreadsheet compatibility is verified against existing schema.
- Cutover rehearsal completes within 30 minutes.
- Rollback procedure is documented and tested.
