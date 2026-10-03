# Webのディレクトリ構成と配置基準

このドキュメントは、`apps/web` にファイルを追加・移動するときの判断基準を定める。

ファイルの種類や拡張子ではなく、主に次の順序で配置を判断する。

1. Next.jsのルーティングに関する責務か
2. 特定のfeatureに依存するか
3. UI・React固有の責務を持つか
4. アプリケーション共通の技術基盤か

## アプリケーションの前提

- TypeScript、Next.js App Router、React、LIFFを使用する。
- `next.config.ts` の `output: "export"` により静的ファイルを生成し、Cloudflare Pagesで配信する。
- 認証とBackend APIへのアクセスはブラウザで実行する。Backend APIは別のCloudflare Workersで動作する。
- Next.jsにBFF、Route Handler、Server Actions、実行時のサーバーデータ取得を追加しない。
- API contractの正本はリポジトリルートの `packages/api-contract/openapi.yaml` とする。

## ディレクトリ構成

テストは原則として対象コードの近くに置く。下のツリーでは省略する。

```text
apps/web/
├── AGENTS.md
├── README.md
├── package.json
├── next.config.ts
├── eslint.config.mjs
├── tsconfig.json
├── next-env.d.ts
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── robots.ts
    │   └── expenses/
    │       ├── page.tsx
    │       ├── new/page.tsx
    │       └── detail/page.tsx
    ├── features/
    │   └── expenses/
    │       ├── components/
    │       │   ├── home-client.tsx
    │       │   ├── expense-dashboard.tsx
    │       │   ├── expense-new-client.tsx
    │       │   ├── expense-detail-client.tsx
    │       │   └── expense-form.tsx
    │       ├── queries/
    │       │   └── expense-queries.ts
    │       ├── api.ts
    │       ├── amount-input.ts
    │       ├── month.ts
    │       └── error-message.ts
    ├── components/
    │   ├── query-provider.tsx
    │   ├── query-boundary.tsx
    │   ├── api-session.tsx
    │   └── liff-primary-redirect-gate.tsx
    └── lib/
        ├── http-client.ts
        ├── api-auth.ts
        ├── liff-client.ts
        └── api-schema.d.ts
```

## 配置基準

| 配置先 | 責務 | 例 |
| --- | --- | --- |
| `src/app/` | URL、page、layout、metadataなど、Next.js固有のルーティングと画面の接続 | `expenses/detail/page.tsx` |
| `src/features/<feature>/components/` | 特定featureに依存する画面・フォーム・UI | `expense-form.tsx` |
| `src/features/<feature>/queries/` | Server Stateのquery key、query options、Mutation、キャッシュ無効化方針 | `expense-queries.ts` |
| `src/features/<feature>/` | feature固有のAPI通信、計算、変換などの関数 | `api.ts`、`month.ts` |
| `src/components/` | featureに依存しない共通UI、Provider、Boundary | `query-provider.tsx`、`api-session.tsx` |
| `src/lib/` | Reactに依存しないアプリ共通の技術基盤と型 | `http-client.ts`、`liff-client.ts`、`api-auth.ts` |

### `app/` はルーティングと画面の接続だけを担当する

`page.tsx` はfeatureの画面コンポーネントを配置し、必要なSuspenseやError Boundaryを設ける。

支出の通信、Mutation、フォームstate、精算などのfeature固有の処理は `app/` に置かない。

公開URLは次の形式とする。

```text
/expenses
/expenses/new
/expenses/detail?id=<expenseId>
```

Static Exportを前提とするため、実行時に決定するIDを動的path parameterとして扱わない。

`/` はLIFFの入口として一覧ページを再利用する。

URLを変更するときは、画面だけでなく一覧からのリンク、戻る操作、LINE通知などのURL生成箇所も更新する。

### featureに依存するものはfeature内へ置く

支出という概念を知っているコードは、原則として `features/expenses/` に置く。

対象には次のようなものを含む。

- 支出画面
- 支出フォーム
- 支出API
- 支出のQuery / Mutation
- 支出固有の表示変換
- 支出固有の計算

複数画面で利用するという理由だけで共通 `components/` や `lib/` へ移動しない。

**再利用されることと、feature非依存であることは別である。**

### 支出の新規作成と詳細は同じ入力フォームを利用する

新規作成・詳細編集・アーカイブ済み表示の金額・支払者・日付・支払内容は、`features/expenses/components/expense-form.tsx` の `ExpenseForm` で管理する。
入力欄、入力中のstate、バリデーション、送信値への変換、フォームのレイアウトはこのコンポーネントを唯一の実装とする。
両画面の入力デザインを変更する場合は、このコンポーネントと共通の `.expenseForm` / `.expenseFormCard` / `.field` スタイルを変更する。
画面別の入力コンポーネントや、詳細だけに適用するフォームのCSS上書きを追加しない。

画面側は初期値、処理中のdisabled、送信ボタンの文言、実際の操作に必要なcallbackを渡す。
新規作成は追加・キャンセル、詳細は保存・削除・復元を扱い、API通信・Mutation・画面遷移はそれぞれの画面側に残す。
詳細の保存成功後は支出IDとversionを使ったkeyでフォームを再作成し、再取得した値を初期値として反映する。
金額は `¥` とカンマ区切りで表示し、入力の整形はReact非依存の `amount-input.ts` に置く。
アーカイブ済みでも同じフォームを表示し、入力を無効化して保存・削除を復元操作に置き換える。
フォームのメンバーと操作本人は認証付き `/api/expenses/form-options` をQueryで取得する。支払者は登録済みメンバーから選び、操作本人とは分離する。

### 共通UI・Provider・Boundaryは `components/` へ置く

特定featureに依存せず、React上でUIやアプリケーション境界を構成するものは `components/` に置く。

例えば次のようなものを対象とする。

- Provider
- Error Boundary
- Loading Boundary
- 認証状態を表示するコンポーネント
- LIFFとReact UIを接続するコンポーネント

技術基盤に関係しているという理由だけで、Reactコンポーネントを `lib/` に置かない。

一方で、Reactを利用しているという理由だけで `components/` に置くわけでもない。
特定featureに依存するReactコンポーネントはfeature側へ置く。

### `lib/` はReact非依存の技術基盤に限定する

`lib/` には、featureに依存せずReactからも独立して利用できる技術基盤を置く。

例えば次のようなものを対象とする。

- HTTP Client
- LIFF Client
- 認証tokenの取得
- API schema
- アプリケーション共通の非Reactユーティリティ

React ComponentやHookから利用することはできるが、`lib` 自身はReact Componentやfeatureに依存しない。

認証については、処理とReactとの接続を分離する。

| 処理 | Reactとの接続 |
| --- | --- |
| `lib/api-auth.ts`: token解決、認証確認、`ApiSession` 型 | `components/api-session.tsx`: 認証待ち・失敗・再試行・認証済み画面との接続 |
| `lib/liff-client.ts`: LIFF初期化、token取得、リダイレクトパラメータ判定 | `components/liff-primary-redirect-gate.tsx`: LIFF初期リダイレクト中の表示 |

Reactに依存しない型をReactコンポーネント経由でimportしない。
例えば `ApiSession` 型は `lib/api-auth.ts` から直接importする。

### 小さなfeatureは無理に階層化しない

ディレクトリ構造そのものを目的にしない。

現在は通信を `api.ts`、月の処理を `month.ts` にまとめる規模で十分なため、`api/`、`model/`、`hooks/` などを機械的に作らない。

複数ファイルをまとめる具体的な必要が生じた時点でディレクトリへ分割する。

Custom Hookについても同様で、React固有の振る舞いを実際に再利用するときだけ作る。
plain function、query options、component、event handlerで表現できるものを機械的にHookへ変換しない。

feature名は既存の複数形 `expenses` に合わせる。

## 依存方向

基本の依存方向は次のとおり。

```text
app
  → feature
    → components / lib / shared packages

components
  → lib

lib
  → 外部SDK / Backend API
```

Server Stateを扱う場合の代表的な通信経路は次のとおり。

```text
appのpage
  → featureの画面コンポーネント
    → featureのquery / mutation
      → featureのAPI関数
        → libのHTTP client
          → Backend API
```

次の依存は禁止する。

```text
lib        → feature
lib        → React component
components → feature
feature A  → feature B
```

feature間で共有すべき業務ロジックが生じた場合は、既存の共有パッケージを利用するか、責務を確認したうえで共有場所を設計する。

支出・精算などの既存共有型と計算は `@shared-expense/shared` を利用する。
「共通で使う」という理由だけで業務ロジックを `lib` へ移さない。

## 状態管理

### Server State

Backend API由来のServer StateはTanStack Query v5で管理する。

query key、query options、Mutation、キャッシュ無効化方針はfeatureの `queries/` にまとめる。

Mutation後は必要なQueryをinvalidateし、React stateに保持したServer Stateを手動で同期しない。

取得中の表示は、適用可能な箇所では `useSuspenseQuery` とSuspenseへ任せる。
取得失敗と再試行は適切な表示境界で扱う。

### UI State

入力中のフォームや表示状態など、UIに閉じたstateはコンポーネント内で管理する。

propsや既存stateから導出できる値を、別のstateとして同期しない。

### Effect

`useEffect` をアプリケーションロジックの実行手段として使用しない。

ユーザー操作によって発生する処理は、イベントハンドラから直接実行する。

```tsx
const handleSubmit = () => {
  mutation.mutate(input);
};
```

API通信や導出値の同期を目的として `useEffect` を追加しない。

`useEffect` が必要な場合は、React外部のシステムとの同期であることを確認する。

## 命名・テスト・生成物

- ファイル名は既存のkebab-case、Reactコンポーネント名はPascalCaseに合わせる。
- `page.tsx`、`layout.tsx` などNext.jsの規約名は `app/` で使用する。
- `*-client.tsx` は画面入口で現在使用している命名であり、すべてのClient Componentに `client` を付ける必要はない。
- テストは原則として対象コードの隣の `*.test.ts` に置く。テスト配置のためだけに階層を増やさない。
- ルーティング・構成の検査はリポジトリルートの `apps/web-dev-config.test.ts` に置く。
- `lib/api-schema.d.ts` はOpenAPIから生成する。手編集せず、APIリクエスト・レスポンス型はここから参照する。
- `next-env.d.ts` はNext.jsの生成ファイル。ビルドによる不要な差分を含めない。
- `.next/`、`out/`、`node_modules/`、`.open-next/` は生成物または過去の配信方式による成果物であり、配置基準の対象にしない。

## 確認

リポジトリルートから次を実行する。

```sh
pnpm --filter @shared-expense/web generate:api-types
pnpm --filter @shared-expense/web typecheck
pnpm --filter @shared-expense/web lint
pnpm test apps/web apps/web-dev-config.test.ts
pnpm build:web
```

ページや導線を変更した場合は、URLへの直接アクセスに加えて次を確認する。

- プラスから新規作成への遷移
- 支出行から詳細への遷移
- 戻る操作
- 支出作成
- 作成後の一覧更新

Static Exportに関する変更では、生成された `out/` がNext.jsサーバーなしで動作することも確認する。

## 配置基準の更新

`apps/web` 配下を変更するときは、[AGENTS.md](AGENTS.md) に従い、このREADMEの更新が必要かを確認する。
構成や責務、公開URL、確認コマンドなど、記載内容に影響する変更ではREADMEも同じ作業で更新する。

例外的な配置が必要になった場合は、実装上の理由を明確にし、この配置基準自体を変更する必要がある場合はドキュメントも更新する。
