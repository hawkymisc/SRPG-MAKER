# E2E カバレッジ・運用レポート

計測日: 2026-06-17  
対象: E2E Phase 0〜4 完了時点（`pnpm test:e2e` **24 シナリオ**）

## サマリー

| レイヤー | プロジェクト | シナリオ数 | 主な検証 |
|---------|-------------|-----------|---------|
| ランタイム演出 | `chromium` | 9 | スクショ回帰 4 + BattleScene/BGM/拠点 5 |
| エディタ | `editor` | 9 | 全タブ smoke 7 + 一気通貫 1 + 書き出しループ 1 |
| 書き出し成果物 | `export` | 6 | 固定フィクスチャ 2 + 勝敗/セーブバリエーション 4 |
| 戦闘ロジック決定論 | `golden`（別コマンド） | 10 | `pnpm test:golden` |

CI（`.github/workflows/ci.yml`）では `pnpm test:e2e` を毎 PR で実行。失敗時は `playwright-report/` と `test-results/` を artifact 保存（7 日）。

---

## カバレッジマトリクス

| 機能領域 | カバー | 主な spec / 備考 |
|---------|--------|------------------|
| プロジェクト CRUD | ◎ | `editor-flow`, `editor-tabs`, `editor-export-loop` |
| DB / マップ / イベント | ◎ | `editor-tabs`, `editor-flow` |
| テストプレイ iframe | ◎ | `editor-flow` |
| 章・拠点・支援 | ◎ | `editor-tabs`, `runtime-phase2`（拠点メニュー） |
| プラグイン UI | ◎ | `editor-tabs` |
| 素材管理 (M8) | ◎ | `editor-tabs`（アップロード）, `editor-export-loop`（zip 同梱） |
| BattleScene (M7) | ◎ | `runtime-phase2` |
| BGM/SE (M7) | △ | `runtime-phase2`（呼び出し ID 記録） |
| HTML5 書き出しプレイ | ◎ | `export-play`, `editor-export-loop` |
| 勝利条件バリエーション | ◎ | `export-variants`（`defeat_boss` 埋め込み + `survive_turns` 勝利） |
| 敗北シナリオ | ◎ | `export-variants`（ターン制限敗北） |
| 戦闘セーブ/ロード | ◎ | `export-variants`（リロード + タイトル「続きから」） |
| Electron/Capacitor 書き出し | ❌ | 手動スモーク（デスクトップ/実機） |
| クラウド保存 | △ | `editor-tabs`（スタブ UI のみ） |
| スクショ回帰 | ◎ | 5 枚（`runtime-screenshots` 4 + `runtime-phase2` 1） |
| 戦闘ロジック決定論 | ◎ | `e2e/golden/`（E2E とは別コマンド） |

凡例: ◎ 自動 E2E / △ 部分 / ❌ 未自動化（意図的に手動へ分離）

---

## シナリオ一覧

### chromium（`packages/runtime` preview :5174）

| ファイル | シナリオ |
|---------|---------|
| `runtime-screenshots.spec.ts` | タイトル / 戦闘マップ / 行動メニュー / 戦闘予測 |
| `runtime-phase2.spec.ts` | 専用バトル画面 / battle-scene スクショ / BGM+SE ログ / 画面シェイク / 拠点メニュー |

### editor（`packages/editor` preview :5173）

| ファイル | シナリオ |
|---------|---------|
| `editor-flow.spec.ts` | 新規 → マップ編集 → 敵配置 → テストプレイ → 勝利 |
| `editor-tabs.spec.ts` | DB / イベント / 章 / プラグイン / 支援 / 素材 / ストレージ（7） |
| `editor-export-loop.spec.ts` | 素材追加 → HTML5 書き出し → zip 同梱確認 → 成果物プレイ勝利 |

### export（静的サーバ :5175）

| ファイル | シナリオ |
|---------|---------|
| `export-play.spec.ts` | 章開始メッセージ → オートプレイ勝利 / assets HTTP 配信 |
| `export-variants.spec.ts` | `defeat_boss` 条件埋め込み / `survive_turns` 勝利 / 敗北 / セーブ復帰 |

バリアントフィクスチャは `scripts/export-e2e-fixture.mts` が `e2e/fixtures/export-variants/` に生成する。

---

## ローカル実行ガイド

初回のみ Playwright ブラウザをインストールする。

```bash
pnpm install
pnpm exec playwright install chromium
```

### 全件（CI と同等）

```bash
pnpm test:e2e
```

`pretest:e2e` により書き出しフィクスチャ（`e2e/fixtures/`）を事前再生成する。初回は editor / runtime のビルドも走るため **2〜3 分** かかることがある。

### プロジェクト別（推奨）

```bash
pnpm test:e2e:runtime   # chromium — スクショ + 演出（9）
pnpm test:e2e:editor    # editor — タブ smoke + 一気通貫 + 書き出しループ（9）
pnpm test:e2e:export    # export — 書き出し成果物（6、事前にフィクスチャ生成）
```

### 単一ファイル

```bash
npx playwright test e2e/editor-export-loop.spec.ts
npx playwright test --project=export e2e/export-variants.spec.ts
```

### 失敗時の調査

- ターミナルに HTML レポートのパスが出る（CI では artifact をダウンロード）
- `test-results/playwright/` に trace（`retain-on-failure`）とスクリーンショット
- ローカルで trace 表示: `npx playwright show-trace test-results/playwright/<folder>/trace.zip`

---

## スクショ更新手順

ゴールデンマスター（`e2e/golden/`）とは別系統。`.allow-golden-update` は **不要**。

意図的な UI 変更でスクショを更新するときのみ実行する。

```bash
# 全スクショ（chromium プロジェクト）
pnpm test:e2e:update

# またはプロジェクト限定
npx playwright test --project=chromium --update-snapshots
```

スナップショット配置:

```
e2e/runtime-screenshots.spec.ts-snapshots/*.png
e2e/runtime-phase2.spec.ts-snapshots/battle-scene-chromium-win32.png
```

**注意:** `maxDiffPixelRatio: 0.001`（`playwright.config.ts`）。フォントや OS 差で失敗する場合は **win32 以外の CI** では別名サフィックスが必要になる。現状 CI は `ubuntu-latest` のため、Linux 用スクショ追加が今後の課題になりうる。

PR には更新理由と代表スクショの差分説明を記載する。

---

## フレーク対応

| 項目 | 設定 |
|------|------|
| CI リトライ | `retries: 1`（`playwright.config.ts`, CI のみ） |
| 並列 | `workers: 1`（ポート競合回避） |
| 決定論 | 戦闘結果は `test:golden`、E2E はシード `42_001` 固定 |

**同一シナリオが CI で 3 回連続失敗**したら、通常チケットを止めて [E2E フレーク報告テンプレート](../.github/ISSUE_TEMPLATE/e2e-flake-report.md) から Issue を起票する。`docs/runbook.md` の flaky 節も参照。

典型原因: ポート `5173`/`5174`/`5175` の占有、Playwright 未インストール、export フィクスチャ未生成、タイムアウト（初回ビルド遅延）。

---

## 手動スモーク（自動化対象外）

- Electron エディタラッパー（`packages/editor-electron`）の起動
- Capacitor 実機（iOS/Android）
- 音声の再生品質
- 大規模プロジェクトのパフォーマンス
- クラウド保存の実体接続（スタブのため E2E 対象外）

---

## 関連ドキュメント

- 仕様（検証方針）: `docs/spec.md` 4.1
- ゴールデンマスター: `docs/golden-format.md`, `docs/runbook.md`
- ヘルパー: `e2e/helpers/`
- Playwright 設定: `playwright.config.ts`

## 結論

**E2E Phase 0〜4 のスコープは達成。** エディタ全タブ smoke、M7/M8 主要機能のタッチ、書き出しループ、勝利条件 2 種 + 敗北 + セーブ、スクショ回帰、CI artifact が揃っている。残課題は Linux CI 向けスクショ整備と Electron/Capacitor 手動チェックリストの定期実施。
