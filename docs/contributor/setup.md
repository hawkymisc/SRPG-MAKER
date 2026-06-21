# 環境構築

## 前提

| 項目 | バージョン |
|------|------------|
| Node.js | **22+**（`package.json` engines） |
| pnpm | 10+（`npm install -g pnpm` または `corepack enable pnpm`） |
| jq | フックが使用（`.claude/hooks/`） |
| Git | 通常の開発フロー |

## pnpm のインストール

Node.js 22+ に同梱の Corepack を使う方法が簡単です。

```bash
corepack enable pnpm
```

Windows で `EPERM` エラーが出る場合（Node.js が `C:\Program Files` にある場合）は、代わりに npm 経由でインストールしてください。

```bash
npm install -g pnpm
```

## クローンと依存

```bash
git clone <リポジトリURL>
cd SRPG-MAKER
pnpm install
```

## 開発サーバ

### エディタ（React + Vite）

```bash
pnpm dev:editor
# http://localhost:5173
```

### ランタイム単体（デバッグ用）

```bash
pnpm dev:runtime
# http://localhost:5174（フィルタ設定に依存）
```

### デスクトップエディタ（Electron）

ターミナル 1: `pnpm dev:editor`  
ターミナル 2: `pnpm dev:editor:electron`

詳細: [packages/editor-electron/README.md](../../packages/editor-electron/README.md)

## 品質ゲート（マージ前）

```bash
pnpm typecheck    # 全パッケージ型検査
pnpm lint         # ESLint（決定論・shared 境界含む）
pnpm test         # Vitest 単体
pnpm test:golden  # 戦闘ゴールデンマスター
```

E2E（UI 変更時は必須）:

```bash
npx playwright install chromium   # 初回のみ
pnpm test:e2e
```

部分実行:

```bash
pnpm test:e2e:editor
pnpm test:e2e:runtime
pnpm test:e2e:export
pnpm test:e2e:update   # スクショ意図更新
```

## ビルド

```bash
pnpm build   # ルートに定義がある場合
pnpm --filter @srpg/editor build
pnpm --filter @srpg/runtime build
```

モノレポは `pnpm --filter <パッケージ名>` で個別操作できます。

## CI

`.github/workflows/ci.yml` が PR ごとに typecheck / lint / test / golden / e2e を実行します。ローカルで上記をグリーンにしてから push してください。

## エディタ・IDE

- TypeScript strict
- ESLint 設定はリポジトリルート
- 決定論違反（`Math.random` 等）は lint と `.claude/hooks/` の編集後検査で検出

## よくある初回エラー

| エラー | 対処 |
|--------|------|
| Playwright browser missing | `npx playwright install chromium` |
| `pretest:e2e` 失敗 | `tsx scripts/export-e2e-fixture.mts` を単体実行してログ確認 |
| jq not found | OS に jq をインストール（フック用） |
| ポート競合 | 5173 / 5174 を使用中のプロセスを終了 |
| `pnpm` が見つからない (Windows) | `npm install -g pnpm` で再インストール |
