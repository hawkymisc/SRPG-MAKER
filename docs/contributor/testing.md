# テスト

## コマンド一覧

| コマンド | 内容 |
|----------|------|
| `pnpm test` | 全パッケージ Vitest |
| `pnpm test:golden` | 戦闘ゴールデンマスター（`e2e/golden/harness.mts`） |
| `pnpm test:e2e` | Playwright 全プロジェクト（`pretest:e2e` でフィクスチャ生成） |
| `pnpm test:e2e:editor` | エディタのみ |
| `pnpm test:e2e:runtime` | ランタイム（chromium）のみ |
| `pnpm test:e2e:export` | 書き出し成果物のみ |
| `pnpm test:e2e:update` | スクショスナップショット更新 |

初回: `npx playwright install chromium`

## ゴールデンマスター（戦闘）

- 形式: [golden-format.md](../golden-format.md)
- シード固定の初期配置 + 入力列 → 結果スナップショット照合
- **更新は人間承認必須**: `touch .allow-golden-update` → `pnpm test:golden --update` → マーカー削除（[runbook.md](../runbook.md)）

戦闘ロジック（`packages/shared` の battle）を変更したら必ず全件パスさせます。

## E2E（Playwright）

設定: ルート `playwright.config.ts`

| プロジェクト | ポート | 主な spec |
|-------------|--------|-----------|
| `chromium` | runtime :5174 | `runtime-screenshots`, `runtime-phase2` |
| `editor` | editor :5173 | `editor-flow`, `editor-tabs`, `editor-export-loop` |
| `export` | 静的成果物 | `export-play`, `export-variants` |

カバレッジ・運用手順の詳細: **[E2E-coverage.md](../reports/E2E-coverage.md)**

### ヘルパー

- `e2e/helpers/` — 定数、ランタイム操作、エディタ操作、書き出しループ
- `scripts/export-e2e-fixture.mts` — 書き出しバリアント生成（`pretest:e2e`）

### スクショ更新

意図した UI 変更時:

```bash
pnpm test:e2e:update
```

PR に差分理由を記載。Linux CI と win32 専用スクショの差異に注意（E2E レポート参照）。

### フレーク

非決定性は規約違反。skip で済ませず原因を特定。[runbook.md](../runbook.md) · `.github/ISSUE_TEMPLATE/e2e-flake-report.md`

## 単体テスト

各パッケージの `test/` または `*.spec.ts` に配置。戦闘・移動範囲・イベント条件は `shared` で厚くテストします。

## Definition of Done

UI 以外: `typecheck` · `lint` · `test` · `test:golden`  
UI 変更: 上記 + `test:e2e`

## CI

`.github/workflows/ci.yml` — 失敗時は `playwright-report/` artifact（7 日）。

## 新規テストの指針

- 戦闘式変更 → ゴールデン追加または既存シナリオでカバー
- エディタ新タブ / 書き出し経路 → Playwright smoke を検討
- 自明な getter だけのテストは避ける

実装タスクには原則 **新規テストを伴う**（[conventions.md](conventions.md)）。
