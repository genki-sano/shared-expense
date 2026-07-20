# Existing MM Inventory

## Source Repositories

- `mm-server`: available at `../temp/mm-server`
- `mm-client`: available at `../temp/mm-client`
- `mm-gas`: available at `../temp/mm-gas`

## API Endpoints

### `GET /health`

- Source file: `../temp/mm-server/cmd/http/route/route.go`
- Request fields: none.
- Response fields: `healthCheck`.
- Success behavior: returns HTTP 200 with `{"healthCheck":"ok"}`.

### `GET /api/auth/verify`

- Source files: `../temp/mm-server/cmd/http/controller/auth/verify.go`, `../temp/mm-server/internal/usecase/auth/verify.go`, `../temp/mm-server/internal/presenter/auth/verify.go`, `../temp/mm-client/src/lib/api/auth.ts`
- Request fields: query `token`.
- Response fields: `token`.
- Success behavior: verifies the LINE access token via `/oauth2/v2.1/verify`, checks `ClientID` against `LINE_LOGIN_CHANNEL_ID`, gets the LINE profile via `/v2/profile`, verifies the profile `UserID` exists in the `users` sheet, then returns a Firebase custom token.
- Error behavior: missing or invalid `token`, LINE verification failure, LINE profile failure, unauthorized LINE user, or Firebase token creation failure returns HTTP 400 with `{"error": "..."}` from the controller path.

### `GET /api/payments`

- Source files: `../temp/mm-server/cmd/http/controller/payment/list.go`, `../temp/mm-server/internal/usecase/payment/list.go`, `../temp/mm-server/internal/presenter/payment/list.go`, `../temp/mm-client/src/lib/api/payment.ts`
- Request fields: query `date` formatted as `yyyy-MM`.
- Response fields: `payments[].id`, `payments[].user_id`, `payments[].date`, `payments[].price`, `payments[].category`, `payments[].memo`.
- Success behavior: reads the monthly sheet named by `date` and returns payment dates formatted as `yyyy/MM/dd`.
- Error behavior: missing or invalid `date`, Spreadsheet read failure, or presenter failure returns HTTP 400 for controller/usecase errors or HTTP 500 for presenter marshal errors.

### `POST /api/payments`

- Source files: `../temp/mm-server/cmd/http/controller/payment/create.go`, `../temp/mm-server/internal/usecase/payment/create.go`, `../temp/mm-client/src/lib/api/payment.ts`
- Request content type used by client: `application/x-www-form-urlencoded`.
- Request fields: form `userType`, `category`, `price`, `date`, `memo`.
- Response fields: none.
- Success behavior: inserts the payment, recalculates monthly totals for woman and man, sends a Flex Message to both users, then returns HTTP 204.
- Error behavior: invalid `userType`, `category`, `price`, or `date`; insert failure; user loading failure; invalid user setup; Flex Message creation failure; or LINE push failure returns HTTP 400 with `{"error": "..."}`.

### `GET /api/users`

- Source files: `../temp/mm-server/cmd/http/controller/user/list.go`, `../temp/mm-server/internal/usecase/user/list.go`, `../temp/mm-server/internal/presenter/user/list.go`, `../temp/mm-client/src/lib/api/user.ts`
- Request fields: none.
- Response fields: `users[].type`, `users[].name`, `users[].auth_user_id`.
- Success behavior: reads the `users` sheet and returns each user's type, name, and LINE user ID as `auth_user_id`.
- Error behavior: user loading failure returns HTTP 400 with `{"error": "..."}`; presenter marshal failure returns HTTP 500.

## Spreadsheet Sheets

### `payments`

- Source files: `../temp/mm-server/internal/gateway/spreadsheet/payment.go`, `../temp/mm-server/internal/gateway/spreadsheet/service.go`
- Columns written on insert: A `id`, B `userType`, C `category`, D `price`, E `date`, F `memo`, G `userType`, H `userType`, I `createdAt`, J `updatedAt`, K `dateSerialFormula`.
- Required columns for server insert: `payments!A:A` is read to compute `lastRow`; append range is `payments!A:J`; the row data includes K as `=DATEVALUE(E{row})`.
- Compatibility notes: new monthly sheets are derived from `payments!A2:K` with `QUERY` selecting A through J where K is within the target month, ordered by K descending. `createdAt` and `updatedAt` are formatted as `yyyy/MM/dd HH:mm:ss` in Asia/Tokyo.

### Monthly payment sheets named `yyyy-MM`

- Source files: `../temp/mm-server/internal/gateway/spreadsheet/payment.go`, `../temp/mm-gas/src/interfaces/gateways/spreadsheet/payment.ts`
- Columns read by server and GAS: A `id`, B `userType`, C `category`, D `price`, E `date`, F `memo`.
- Required columns: server `GetByDate` reads `yyyy-MM!A:J` and parses A, B, D, E, C, F; GAS reads display values from row 1, column 1 through the sheet's last row and last column, then maps A, B, E, D, C, F.
- Compatibility notes: server creates a monthly sheet on first insert for that month at sheet index 2 and writes a `QUERY` formula into `yyyy-MM!A1`.

### `users`

- Source files: `../temp/mm-server/internal/gateway/spreadsheet/user.go`, `../temp/mm-gas/src/interfaces/gateways/spreadsheet/user.ts`
- Columns read: A `type`, B `name`, C `lineUserId`, D `firebaseUserId`.
- Required columns: server reads `users!A2:F`; GAS reads display values from row 1, column 1 through the sheet's last row and last column.
- Compatibility notes: user type `1` is woman and user type `2` is man. Server create notification requires exactly two users and validates that the users are ordered as type 1 then type 2.

## GAS Jobs

### `onTimeDriven`

- Source files: `../temp/mm-gas/src/index.ts`, `../temp/mm-gas/src/interfaces/controllers/onTimeDriven.ts`, `../temp/mm-gas/src/applications/usecases/onTimeDriven.ts`, `../temp/mm-gas/dist/appsscript.json`
- Job name: `onTimeDriven`.
- Schedule: no `ScriptApp` trigger creation code or schedule field is present in the files listed by `rg --files ../temp/mm-gas`; `dist/appsscript.json` sets `timeZone` to `Asia/Tokyo`.
- Sheets read: `users`; the previous month's `yyyy-MM` sheet.
- Sheets written: none.
- Notification behavior: builds one monthly settlement Flex Message and pushes it to `users.woman.lineUserId` and `users.man.lineUserId`.
- Failure behavior: top-level `global.onTimeDriven` catches thrown errors, logs error name, message, and stack to `console.error` for `Error` instances or `Logger.log` otherwise, then returns JSON `{"content":"post ok"}`.

## LINE Notifications

### Payment Created

- Source files: `../temp/mm-server/internal/usecase/payment/create.go`, `../temp/mm-server/internal/gateway/linebot/linebot.go`, `../temp/mm-server/internal/gateway/linebot/message.go`
- Trigger: successful payment insert through `POST /api/payments`.
- Recipient rule: sends to both LINE user IDs loaded from the `users` sheet, woman and man.
- Message text: alt text `支払い登録が完了したよ！`; Flex body includes `支出を入力したよ！`, the inserted price, date, category, memo, and the current woman/man monthly totals.
- Deduplication behavior: no notification history read or write is present on this path.
- Failure behavior: a LINE push error aborts the API request and is returned as HTTP 400 by the controller path.

### Monthly Settlement Report

- Source files: `../temp/mm-gas/src/applications/usecases/onTimeDriven.ts`, `../temp/mm-gas/src/domains/services/message.ts`, `../temp/mm-gas/src/infrastructures/line/client.ts`, `../temp/mm-gas/src/infrastructures/line/http.ts`
- Trigger: `onTimeDriven`.
- Recipient rule: sends the same message to `users.woman.lineUserId` and `users.man.lineUserId`.
- Message text: alt text `先月の精算をしてね！`; Flex body includes `FROM（支払う人）`, `TO（貰える人）`, `先月分の精算をしてね！`, settlement amount, woman total, and man total.
- Deduplication behavior: no notification history read or write is present on this path.
- Failure behavior: LINE HTTP response code other than 200 throws an error containing the LINE error message and a LINE Messaging API error reference URL.

## Settlement Rules

### Monthly settlement amount and direction

- Source files: `../temp/mm-gas/src/domains/services/aggregation.ts`, `../temp/mm-gas/src/domains/services/payment.ts`, `../temp/mm-gas/src/interfaces/gateways/spreadsheet/payment.ts`
- Formula: sum payment prices by matching `payment.name` to `users.woman.name` and `users.man.name`; calculate `diffPrice` as `Math.ceil(Math.abs(womanPrice - manPrice) / 2)`.
- Rounding behavior: fractional halves are rounded up with `Math.ceil`.
- Direction behavior: if `womanPrice < manPrice`, woman pays man; otherwise man pays woman. Equal totals fall into the `otherwise` branch with `diffPrice` equal to `0`.
- Target-month handling: monthly GAS uses `new Date(now.getFullYear(), now.getMonth() - beforeCnt, 1)` with `beforeCnt` set to `1`, formats it as `yyyy-MM`, and reads that sheet.

## Compatibility Risks vs New Spec

- The existing physical `payments` row order is A `id`, B `userType`, C `category`, D `price`, E `yyyy/MM/dd` date, F `memo`, G `userType`, H `userType`, I `createdAt`, J `updatedAt`, and K `DATEVALUE` formula.
- The provisional later-plan row mapper shape `id,userId,date,price,category,memo,version` does not match the existing row order, so it must not be adopted as-is for the compatible Spreadsheet mapper.
- Existing B `userType` values must be converted to the replacement system's internal `userId` through the `users` sheet relationship.
- Existing A-F/K columns and monthly `QUERY` dependency must be preserved. New `version` or idempotency storage columns should be added after K or in a separate sheet without breaking existing columns.
- Existing payment dates are displayed as `yyyy/MM/dd`; the new API ISO date `YYYY-MM-DD` needs boundary conversion at the API or mapper layer.
- The production GAS trigger schedule is not observable in this repository and may live in Apps Script external state. Before cutover, the real trigger setting must be checked and new Cron plus old GAS `二重送信` must be prevented.
