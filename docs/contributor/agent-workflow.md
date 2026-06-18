# エージェント運用

本リポジトリは AI エージェントによる実装を前提に設計されています（spec 3・4 章）。人間はオーケストレーション・受け入れ・エスカレーション判断を担います。

旧版の詳細キット説明はルートの `エージェントキット_運用ガイド.md` にもあります。日常運用は本ページと [tasks/BOARD.md](../tasks/BOARD.md) を優先してください。

## 構成

```
CLAUDE.md / AGENTS.md     # 共通メモリ・絶対規約
docs/spec.md              # 仕様正（書換禁止）
docs/tasks/BOARD.md       # 進捗の単一情報源
.claude/
  settings.json           # フック・権限
  hooks/                  # 保護パス・決定論検査
  agents/                 # サブエージェント定義
prompts/                  # オーケストレータ・マイルストーン委任文
```

## サブエージェント（役割）

| エージェント | 責務 |
|-------------|------|
| `schema-architect` | Zod・マイグレーション |
| `battle-logic-dev` | 戦闘ロジック TDD |
| `runtime-dev` | Phaser ランタイム |
| `editor-dev` | React エディタ |
| `test-engineer` | GM / E2E / lint / CI |
| `qa-playtester` | ヘッドレス自動プレイ・バランス |
| `code-reviewer` | 読取専用レビュー（門番） |

定義ファイル: `.claude/agents/*.md`

## 運用フロー

1. セッション開始 — `/kickoff` または `prompts/00_orchestrator.md`
2. [BOARD.md](../tasks/BOARD.md) で現在地確認
3. チケット委任 — 該当サブエージェント + 仕様節・関連ファイルを明示
4. `code-reviewer` で規約違反チェック
5. 品質ゲート（[conventions.md](conventions.md)）→ コミット
6. セッション終了 — `/wrap` で申し送り

スラッシュコマンドは Claude Code 向けの儀式化です。Cursor 等では同等の手順をプロンプトで行います。

## 人間が必ず行うこと

- **ゴールデンマスター更新承認** — `touch .allow-golden-update` → 更新 → 削除
- 仕様矛盾の裁定、`schemaVersion` 繰り上げ、新規依存の承認
- マイルストーン受け入れ（M2 以降は実際にプレイして手触り確認）

## 障害時

[runbook.md](../runbook.md):

- main の CI 赤 → 最優先復旧
- GM 予期しない差分 → 人間判断まで更新禁止
- flaky → 隔離せず原因特定
- エージェントが同じ失敗をループ → 2 回で止めてタスク分割

## フック（機械的強制）

- `docs/spec.md` 等の保護
- `e2e/golden/` 書込ガード
- 決定論・shared 境界の編集後検査
- 破壊的 Bash の deny

`jq` がフックで必要です（[setup.md](setup.md)）。

## トークン・コスト

サブエージェントは独立コンテキストのため消費は増えます。ロジック中心（M0–M1）は費用対効果が高く、エディタ UI（M3）はレビュー往復が増えやすい傾向があります。`qa-playtester` の大量シミュレーションはスクリプト実行が主で LLM コストは小さいです。

## 関連

- [architecture.md](architecture.md)
- [testing.md](testing.md)
- [reports/](../reports/) — マイルストーン受け入れメモ
