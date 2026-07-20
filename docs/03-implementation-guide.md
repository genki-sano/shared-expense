# MM 実装ガイド（Hono x Cloudflare / LINE-LIFF 前提）

## 1. モノレポ構成

```text
.
├── apps/
│   ├── web/                # LIFF frontend
│   ├── api/                # Hono on Workers
│   └── jobs/               # Workers Cron handlers
├── packages/
│   ├── shared/             # shared types / schemas
│   ├── api-contract/       # OpenAPI source and generated types
│   └── integrations/       # Spreadsheet / LINE adapters
└── docs/
```

## 2. API 契約（OpenAPI）

- `packages/api-contract/openapi.yaml` を正本とする。
- `apps/api` は契約に一致したレスポンスを返す。
- `apps/web` は生成型を利用して API クライアントを実装する。

### 2.1 エラー形式

```json
{
  "message": "string",
  "details": {}
}
```

## 3. ドメインモデル（初期）

- `Expense`
  - `id`
  - `userId`
  - `date` (YYYY-MM-DD)
  - `price` (integer)
  - `category`
  - `memo`
  - `version`
- `User`
  - `id`
  - `lineUserId`
  - `displayName`
  - `notifyEnabled`
- `NotificationHistory`
  - `id`
  - `eventType`
  - `eventId`
  - `sentToUserId`
  - `sentAt`
  - `deliveryStatus` (`success` | `failed` | `skipped`)
  - `providerMessageId` (nullable)
  - `errorReason` (nullable)

初期リリースでは `Settlement` を永続モデルとして作り込まず、対象月の `Expense` から精算額と内訳を都度計算する。重複通知防止と再送判断に必要な情報のみ `NotificationHistory` として永続化する。

### 3.1 将来拡張ドメイン（第2フェーズ）

- `Settlement`
  - `id`
  - `fromUserId`
  - `toUserId`
  - `targetMonth` (YYYY-MM)
  - `amount` (integer)
  - `status` (`pending` | `notified` | `completed`)
  - `completedAt` (ISO datetime, nullable)
  - `createdAt` (ISO datetime)
  - `updatedAt` (ISO datetime)
- `SettlementNotificationHistory`
  - `id`
  - `settlementId`
  - `type` (`monthly_reminder` | `manual_reminder` | `completed_notice`)
  - `sentToUserId`
  - `sentAt` (ISO datetime)
  - `deliveryStatus` (`success` | `failed`)
  - `providerMessageId` (nullable)
  - `errorReason` (nullable)

### 3.2 Settlement 状態遷移

この節は第2フェーズ以降の参考設計であり、初期リリースの実装対象ではない。

- `pending`:
  - 精算レコード作成直後
- `notified`:
  - 月次通知または手動通知を送信済み
- `completed`:
  - 精算完了操作後
  - `completedAt` を必須で記録

## 4. 主要 API

- `GET /api/expenses?date=YYYY-MM`
  - 指定月の支払い一覧を返す
- `POST /api/expenses`
  - 支払い作成
  - 成功時に `ExpenseCreated` イベントを発行
- `PUT /api/expenses/{id}`
  - 支払い更新
  - 成功時に `ExpenseUpdated` イベントを発行
- `DELETE /api/expenses/{id}`
  - 支払い削除
  - 成功時に `ExpenseDeleted` イベントを発行
- `GET /api/settlements?month=YYYY-MM`
  - 対象月の精算額と内訳サマリを返す

### 4.1 認証と操作主体

- API は `Authorization: Bearer <LIFF ID token>` を必須とする。
- API は LIFF ID token の issuer、audience/channel ID、expiration、subject を検証する。
- 操作主体は検証済み token の subject から解決した `User` とする。
- 作成リクエストでは `userId` を基本的に受け取らない。既存互換で受け取る場合も、認証済みユーザーと一致しなければ拒否する。
- 変更系APIは `Idempotency-Key` header による冪等性を持つ。
- 更新は `version` による楽観ロックを行い、競合時は `409` を返す。

## 5. Spreadsheet アクセス設計

## 5.1 ルール

- API から直接 Spreadsheet SDK を呼ばない。
- `ExpenseRepository` / `UserRepository` 経由でアクセスする。
- すべての書き込みに冪等キーを付与する。

## 5.2 例インターフェース

```ts
export interface ExpenseRepository {
  findByMonth(month: string): Promise<Expense[]>
  create(input: CreateExpenseInput): Promise<Expense>
  update(id: string, input: UpdateExpenseInput): Promise<Expense>
  delete(id: string): Promise<void>
}

export interface NotificationHistoryRepository {
  findSuccessfulDelivery(
    eventType: string,
    eventId: string,
    sentToUserId: string,
  ): Promise<NotificationHistory | null>
  record(input: CreateNotificationHistoryInput): Promise<void>
}
```

## 6. LINE/LIFF ライフサイクル設計

1. ユーザーは LINE リッチメニューから LIFF を開く。
2. LIFF 起動時に `lineUserId` を取得する。
3. `lineUserId` と業務ユーザーを紐づける。
4. ユーザーがデータを更新する。
5. 変更イベントに対して対象ユーザーへ通知を送る。

## 7. 通知設計（業務通知）

## 7.1 通知トリガー

- 支払い作成
- 支払い更新
- 支払い削除
- 毎月5日 19:00 の先月精算通知

### 将来追加予定トリガー（第2フェーズ）

- 精算完了時の相手ユーザー通知
- 精算額の手動リマインド通知

## 7.2 通知対象

- 変更イベントに紐づく対象ユーザーのみ
- 全体配信は禁止（誤通知防止）

## 7.3 通知実装インターフェース

```ts
export interface NotificationService {
  notifyExpenseCreated(event: ExpenseCreatedEvent): Promise<void>
  notifyExpenseUpdated(event: ExpenseUpdatedEvent): Promise<void>
  notifyExpenseDeleted(event: ExpenseDeletedEvent): Promise<void>
  notifyMonthlySettlementReminder(
    event: MonthlySettlementReminderEvent,
  ): Promise<void>
}
```

## 7.4 品質要件

- 同一イベントの重複送信を防ぐ。
- 送信失敗を記録し、再送可能にする。
- 送信ログは監査用に保持する。

## 8. Cron ジョブ設計

- GAS 置換対象を `apps/jobs` に移植する。
- ジョブごとに以下を定義する:
  - 実行スケジュール
  - 入出力
  - 失敗時再試行方針
  - 通知有無
- 月次通知ジョブを定義する:
  - 実行: 毎月5日 19:00（JST）
  - Cron: `0 10 5 * *`（UTC、Cloudflare Workers Cron）
  - 内容: 先月の精算対象ユーザーへ通知

## 9. セキュリティ・設定

- 機密値（LINE チャネルシークレット等）は Workers Secrets に保存する。
- 環境ごとの設定は `wrangler` の環境分離を使う。
- ログに個人情報を出力しない。

## 10. テスト戦略

- 契約テスト: OpenAPI 準拠検証
- 単体テスト: Repository / Service（通知対象決定を重点）
- 統合テスト: API ↔ Spreadsheet ↔ Notification
- E2E: LIFF 主要導線（更新まで）

## 11. 受け入れ基準（Definition of Done）

- 支払い CRUD と月次一覧が新 API で稼働する。
- LINE リッチメニュー起点の LIFF 導線が維持される。
- データ更新時に対象ユーザーへ通知される。
- 誤通知・重複通知の防止が確認できる。
- 切替ランブックで 30 分以内の一括移行が可能。
