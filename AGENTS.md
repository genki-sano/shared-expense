# AGENTS.md

## Workflow

- 非自明タスクは Plan → Execute → Verify → Report の順で進行
- 途中で前提崩れが起きたら停止して再計画
- 完了報告前に必ず検証結果を提示

## Task Management

- 計画は .codex/tasks/todo.md にチェックリスト化
- 進捗と検証ログを同ファイルに追記
- ユーザー修正が入ったら .codex/tasks/lessons.md に再発防止策を追記

## Editing Rules

- 影響範囲は最小化
- 無関係ファイルを変更しない
- 既存規約/命名に合わせる

## Core Principles

- **シンプルさを第一に**: すべての変更を可能な限りシンプルにします。コードへの影響は最小限にします。
- **怠惰を許さない**: 根本原因を特定します。一時的な修正は行いません。上級開発者の基準に従います。
- **影響を最小限にする**: 変更は必要なものだけにします。バグの発生を防ぎます。

## Verification

- 可能な限り再現コマンドを実行
- 成否ログを要約して報告
- 高リスク変更は差分意図を明記

## Communication

- 作業前に短い方針を共有
- 長時間作業は途中報告を入れる
- 不確実な点は推測で進めず明示する

## Project Context

- このプロジェクトは夫婦向け家計簿アプリのリプレイス用モノレポ。
- 置き換え対象は `genki-sano/mm-server`、`genki-sano/mm-client`、`genki-sano/mm-gas`。
- 初期リリースは機能追加より既存機能の完全リプレイスを優先する。
- 技術方針は TypeScript monorepo、Next.js LIFF frontend、Hono on Cloudflare Workers API、Cloudflare Workers Cron、Google Spreadsheet 継続、LINE Messaging API。
- API は OpenAPI ファーストで設計し、`packages/api-contract/openapi.yaml` を正本とする。
- Spreadsheet は既存構造を維持しつつ、信頼性のために必要な列/シートだけ追加する。
- API 認証は LIFF ID token 検証を必須とし、操作主体は検証済み `lineUserId` から解決する。
- 初期LIFF UIは月次一覧ファースト。
- 更新通知は操作本人以外の夫婦相手を候補にし、受信者の `notifyEnabled` を尊重する。
- 毎月5日19:00 JSTの先月精算通知は、精算額と内訳サマリをLINE通知する。
- 既存リポジトリのコードは丸ごと統合せず、Spreadsheet列マッピング、精算計算、通知文言など必要な業務ロジックだけ移植する。
