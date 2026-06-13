# タスクボード

オーケストレーターはタスクの開始時・完了時に必ずこのファイルを更新する。
セッションを跨いだ再開時は、まずこのボードを読んで現在地を把握すること。

## 凡例
チケットID: `M<番号>-T<番号>`(例: M1-T2)。状態: BACKLOG / IN_PROGRESS / REVIEW / DONE / BLOCKED

## 現在のマイルストーン: M1 (完了)

| ID | タスク | 担当エージェント | 状態 | 備考 |
|----|--------|------------------|------|------|
| M1-T1 | コアスキーマ | schema-architect | DONE | Zodスキーマ + templates/sample |
| M1-T2 | 戦闘状態と解決関数 | battle-logic-dev | DONE | resolveAction + 境界値テスト30+ |
| M1-T3 | 移動範囲・攻撃範囲 | battle-logic-dev | DONE | ダイクストラ、100×100で50ms以内 |
| M1-T4 | 敵AI 4種 | battle-logic-dev | DONE | charge/ambush/guard/move_only |
| M1-T5 | 勝敗判定と経験値 | battle-logic-dev | DONE | 勝利4種・撃破EXP・レベルアップ |
| M1-T6 | ゴールデンマスター | test-engineer | DONE | 必須10本 + harness |

## BLOCKED詳細(エスカレーション待ち)
(なし)

## 完了ログ
- 2026-06-12 M0 完了: `pnpm typecheck && pnpm lint && pnpm test` 全グリーン(3パッケージ)。
- 2026-06-12 M1 完了: shared 行カバレッジ87.9%、ゴールデン10本グリーン。次は M2 (`prompts/M2_runtime.md`)。
