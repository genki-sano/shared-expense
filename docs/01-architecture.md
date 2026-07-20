# MM リプレイスアーキテクチャ設計

## 1. 背景と目的

- 現在は `mm-client` / `mm-server` / `mm-gas` を分離運用しており、個人利用としては保守コストが高い。
- LINE アカウント起点の利用（LIFF 含む）と、データ更新時の対象ユーザー通知は必須要件。
- 当面は Spreadsheet 運用を維持しつつ、実行基盤を Cloudflare 中心へ整理する。

## 2. スコープ

### 2.1 対象

- フロントエンド（LIFF 画面）
- API サーバー（Hono on Cloudflare Workers）
- 定期処理（Workers Cron、旧 GAS 機能置換）
- 通知配信（LINE Messaging API）

### 2.2 非対象（初期）

- DB を Supabase/D1 へ全面移行
- 監視用途の通知（今回の LINE 通知要件は業務通知のみ）

## 3. 要件整理

### 3.1 機能要件

- Expense CRUD
- 月次一覧取得
- データ更新イベント発生時の対象ユーザー通知
- 毎月5日 19:00 の先月精算通知
- LINE 起点導線の維持（リッチメニュー → LIFF 起動 → 利用）

### 3.2 非機能要件

- 一括移行（メンテナンス 30 分以内）
- 個人運用での低メンテナンス
- 失敗時に旧構成へ切り戻し可能

## 4. 技術選定

## 4.1 採用

- API: Hono + Cloudflare Workers
- ジョブ: Workers Cron
- データ: Google Spreadsheet（継続）
- API 契約: OpenAPI ファースト
- 通知: LINE Messaging API（業務イベント通知）

### 4.2 非採用（初期）

- Supabase: 将来候補（現時点は移行コスト優先で見送り）
- D1: 将来候補（Spreadsheet 継続方針のため初期は未採用）

## 5. 論理アーキテクチャ

1. LIFF クライアントが Workers API を呼び出す。
2. Workers API は Spreadsheet Repository 経由で読み書きする。
3. 更新 API は Domain Event を発行する。
4. Notification Service が対象ユーザーを解決し LINE 通知を送信する。
5. Cron Job は定期集計や補助処理を実行し、必要に応じて通知する。

## 6. コンポーネント責務

- `apps/web`: LIFF フロント。API への入出力を担当。
- `apps/api`: Hono ルーティング、業務ロジック、認証、イベント発行。
- `apps/jobs`: Cron ハンドラ。定期処理と再実行制御。
- `packages/shared`: 型、OpenAPI 生成物、共通ユーティリティ。
- `packages/integrations`: Spreadsheet / LINE 連携アダプタ。

## 7. 公開インターフェース方針

- OpenAPI を正本として API 契約を明文化する。
- 既存互換を優先し、破壊的変更は避ける。
- エラーレスポンスは `message` / `details` へ統一する。
- 日付・金額の型定義を厳格化し、クライアントとサーバーで共有する。

## 8. リスクと対策

- Spreadsheet 競合更新
  - 対策: 楽観ロック相当のバージョン列、再試行制御、冪等キー
- LINE 通知の重複/漏れ
  - 対策: 通知履歴管理、重複防止キー、失敗時再送
- 一括移行失敗
  - 対策: 当日ランブック、Go/No-Go 判定、ロールバック手順の事前検証

## 9. 将来拡張

- Spreadsheet から Supabase への移行を第2フェーズ候補として扱う。
- データアクセス層を Repository 抽象化し、移行時の影響範囲を最小化する。
- 通知ユースケース拡張を第2フェーズ候補として扱う。
  - 精算完了時に相手ユーザーへ通知する。
  - 精算額の再確認が必要なときに、手動通知を送信できるようにする。
