# タスクボード

オーケストレーターはタスクの開始時・完了時に必ずこのファイルを更新する。
セッションを跨いだ再開時は、まずこのボードを読んで現在地を把握すること。

## 凡例
チケットID: `M<番号>-T<番号>`(例: M1-T2)。状態: BACKLOG / IN_PROGRESS / REVIEW / DONE / BLOCKED

## 現在のマイルストーン: M8 (完了)

### M8 (完了) — フェーズ3（クラウド保存・素材管理）

| ID | タスク | 担当エージェント | 状態 | 備考 |
|----|--------|------------------|------|------|
| M8-T1 | クラウド保存 方式選定 | オーケストレーター | DONE | ADR 0009 |
| M8-T2 | プロジェクトのインポート/エクスポート改善 | editor-dev | DONE | assets/ フォルダ読み書き |
| M8-T3 | 素材(画像/音声)管理UI | editor-dev | DONE | 素材タブ Ctrl+6 |
| M8-T4 | ストレージ実装（ローカル/クラウド抽象化） | editor-dev | DONE | ProjectStorageAdapter |
| M8-T5 | 書き出しへ assets 同梱 | editor-dev + runtime-dev | DONE | HTML5/Electron/Capacitor |

### M7 (完了) — フェーズ3（戦闘演出・モバイル・イベント音声）

| ID | タスク | 担当エージェント | 状態 | 備考 |
|----|--------|------------------|------|------|
| M7-T1 | フェーズ2最終受け入れ照合 | オーケストレーター | DONE | docs/reports/M6-phase2-final-acceptance.md |
| M7-T2 | マップ戦闘演出強化 | runtime-dev | DONE | 突進・ダメージ数字・クリティカル演出 |
| M7-T3 | 専用バトル画面 | runtime-dev | DONE | BattleScene overlay + ADR 0006 |
| M7-T4 | イベントBGM/SE再生 | runtime-dev | DONE | Howler.js GameAudio + assets/audio |
| M7-T5 | Capacitorモバイル書き出し | editor-dev | DONE | www/ + capacitor shell zip |

### M6 (完了)

| ID | タスク | 担当エージェント | 状態 | 備考 |
|----|--------|------------------|------|------|
| M6-T1 | フェーズ2受け入れ照合 | オーケストレーター | DONE | docs/reports/M5-phase2-acceptance.md |
| M6-T2 | プラグイン有効/無効UI | editor-dev | DONE | プロジェクトタブ |
| M6-T3 | 支援会話システム | battle-logic-dev + runtime-dev | DONE | 支援ポイント+拠点メニュー6 |
| M6-T4 | Electronエディタラッパー | editor-dev | DONE | packages/editor-electron + ネイティブFS |

### M5 (完了)

| ID | タスク | 担当エージェント | 状態 | 備考 |
|----|--------|------------------|------|------|
| M5-T1 | 章(シナリオ)スキーマ+管理UI | schema-architect + editor-dev | DONE | ChapterSchema + プロジェクトタブ |
| M5-T2 | 拠点画面 | runtime-dev + editor-dev | DONE | BaseScene + 編成/ショップ/会話/出撃 |
| M5-T3 | 成長率・クラスチェンジ | battle-logic-dev | DONE | roster永続化 + 拠点転職 |
| M5-T4 | ビジュアルイベントエディタ | editor-dev | DONE | 会話プレビュー + 顔付きメッセージ |
| M5-T5 | プラグインAPI | schema-architect | DONE | plugin-api + CombatHooks |
| M5-T6 | Electron書き出し | editor-dev | DONE | game/+Electron shell zip |

### M1 (完了)

| ID | タスク | 担当エージェント | 状態 | 備考 |
|----|--------|------------------|------|------|
| M1-T1 | コアスキーマ | schema-architect | DONE | Zodスキーマ + templates/sample |
| M1-T2 | 戦闘状態と解決関数 | battle-logic-dev | DONE | resolveAction + 境界値テスト30+ |
| M1-T3 | 移動範囲・攻撃範囲 | battle-logic-dev | DONE | ダイクストラ、100×100で50ms以内 |
| M1-T4 | 敵AI 4種 | battle-logic-dev | DONE | charge/ambush/guard/move_only |
| M1-T5 | 勝敗判定と経験値 | battle-logic-dev | DONE | 勝利4種・撃破EXP・レベルアップ |
| M1-T6 | ゴールデンマスター | test-engineer | DONE | 必須10本 + harness |

### M2 (完了)

| ID | タスク | 担当エージェント | 状態 | 備考 |
|----|--------|------------------|------|------|
| M2-T1 | シーン骨格とマップ描画 | runtime-dev | DONE | Boot/Title/BattleMap + Tilemap |
| M2-T2 | 移動・攻撃UIフロー | runtime-dev | DONE | 行動メニュー・戦闘予測・resolveAction |
| M2-T3 | 敵フェイズとターン進行 | runtime-dev | DONE | AI自動実行・勝敗画面 |
| M2-T4 | セーブ/ロード | runtime-dev | DONE | seed+rngConsumed+BattleState |
| M2-T5 | ヘッドレス自動プレイ | test-engineer | DONE | playthrough.spec.ts 7件 |
| M2-T6 | スクショ回帰 | test-engineer | DONE | Playwright 4画面・win32 baseline |
| M2-T7 | 初回バランス計測 | qa-playtester | DONE | docs/reports/M2-baseline.md |

### M3 (完了)

| ID | タスク | 担当エージェント | 状態 | 備考 |
|----|--------|------------------|------|------|
| M3-T1 | スキーマ駆動フォーム基盤 | editor-dev | DONE | schema-form/ + DBエディタ全タブ |
| M3-T2 | プロジェクト管理 | editor-dev | DONE | 新規/開く/保存/バックアップ5世代 |
| M3-T3 | マップエディタ | editor-dev | DONE | ペン/ユニット配置/Undo/勝敗条件(MVP) |
| M3-T4 | テストプレイ統合 | editor-dev | DONE | postMessage連携・デバッグパネル |
| M3-T5 | 一気通貫E2E | test-engineer | DONE | e2e/editor-flow.spec.ts |

### M4 (完了)

| ID | タスク | 担当エージェント | 状態 | 備考 |
|----|--------|------------------|------|------|
| M4-T1 | イベントコマンドスキーマ | schema-architect | DONE | 15コマンド+7トリガー凍結 |
| M4-T2 | イベントインタプリタ(shared) | battle-logic-dev | DONE | 条件・変数・スイッチ・純粋コマンド |
| M4-T3 | イベントインタプリタ(runtime) | runtime-dev | DONE | async generator+MessageWindow |
| M4-T4 | イベントエディタ | editor-dev | DONE | Ctrl+5 コマンドリストUI |
| M4-T5 | HTML5書き出し | editor-dev | DONE | game/配下zip・fflate |
| M4-T6 | 書き出しE2E | test-engineer | DONE | e2e/export-play.spec.ts |
| M4-T7 | MVP受け入れ照合 | オーケストレーター | DONE | docs/reports/M4-mvp-acceptance.md |

## BLOCKED詳細(エスカレーション待ち)
(なし)

## 完了ログ
- 2026-06-12 M0 完了: `pnpm typecheck && pnpm lint && pnpm test` 全グリーン(3パッケージ)。
- 2026-06-12 M1 完了: shared 行カバレッジ87.9%、ゴールデン10本グリーン。次は M2 (`prompts/M2_runtime.md`)。
- 2026-06-13 M2 完了: Phaserランタイム・playthrough・Playwrightスクショ4枚・ベースライン計測。起動: `pnpm dev:runtime` (http://localhost:5174)。次は M3 (`prompts/M3_editor.md`)。
- 2026-06-13 M3 完了: Reactエディタ・schema-form・マップ/DB編集・テストプレイ・一気通貫E2E。起動: `pnpm dev:editor` (http://localhost:5173)。
- 2026-06-13 M4 完了: イベント15種・HTML5書き出し・export E2E・MVPβ照合。詳細: `docs/reports/M4-mvp-acceptance.md`。
- 2026-06-15 M5-T1 完了: ChapterSchema・章管理UI・split/merge export・typecheck修正。
- 2026-06-15 M5-T2 完了: CampaignState・BaseScene(編成/ショップ/会話/出撃)・勝利→拠点ループ。
- 2026-06-15 M5-T3 完了: ロスター level/stats/classId 永続化・拠点クラスチェンジ(Lv.10+)。
- 2026-06-15 M5-T4 完了: 会話プレビューパネル・MessageWindow 顔/話者名演出。
- 2026-06-15 M5-T5 完了: plugin-api パッケージ・CombatHooks・宣言的プラグインルール。
- 2026-06-15 M5-T6 完了: Electron シェル付き zip 書き出し・electron-builder 配布手順。
- 2026-06-15 M5 完了: フェーズ2照合 docs/reports/M5-phase2-acceptance.md
- 2026-06-15 M6-T1 完了: フェーズ2受け入れレポート。
- 2026-06-15 M6-T3 完了: 支援会話（支援ポイント・拠点メニュー6・splitProject supports）。
- 2026-06-15 M6-T4 完了: Electron エディタラッパー（packages/editor-electron・ネイティブFS）。
- 2026-06-15 M6 完了: フェーズ2残タスクすべて DONE。
- 2026-06-16 M7 着手: フェーズ3へ移行。M7-T1 最終受け入れ、M7-T2 マップ戦闘演出強化。
- 2026-06-16 M7-T3 完了: BattleScene 専用バトル画面（並列オーバーレイ・マップCombatFxフォールバック）。
- 2026-06-16 M7-T5 完了: Capacitor モバイル書き出し zip（www/ + shell）。
- 2026-06-16 M7-T4 完了: Howler.js による PLAY_BGM/PLAY_SE 再生。
- 2026-06-16 M7 完了: フェーズ3スコープ（戦闘演出・モバイル書き出し・イベント音声）達成。
- 2026-06-16 M8 着手: フェーズ3の残項目（クラウド保存・素材ストア）に向けた方針策定。
- 2026-06-16 M8-T2/T5 完了: assets/ フォルダ読み書き + 書き出し zip 同梱。
- 2026-06-17 M8-T3 完了: 素材タブ（画像/BGM/SE 追加・一覧・削除）。
- 2026-06-17 M8-T4 完了: ProjectStorageAdapter（local/cloud UI 切替）。
- 2026-06-17 M8 完了: フェーズ3素材・ストレージ境界。docs/reports/M8-phase3-acceptance.md
