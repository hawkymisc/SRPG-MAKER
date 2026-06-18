# 開発者向けドキュメント

**開発者（Contributor）** = 本リポジトリのコード・テスト・CI に貢献する人（人間・AI エージェントを含む）。

作成者向けのエディタ操作説明は [user/README.md](../user/README.md) を参照してください。

## 最初に読むもの

1. [環境構築](setup.md)
2. [規約と完了条件](conventions.md) — **必読**（決定論・純粋関数境界・DoD）
3. [アーキテクチャ](architecture.md)
4. [テスト](testing.md)

## クイックコマンド

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm test:golden
npx playwright install chromium   # 初回のみ
pnpm test:e2e
```

## リポジトリの正

| 文書 | 用途 |
|------|------|
| [spec.md](../spec.md) | 要件・データ形式・アーキテクチャ（**エージェント書換禁止**） |
| [AGENTS.md](../../AGENTS.md) / [CLAUDE.md](../../CLAUDE.md) | 絶対規約・コマンド・パッケージ境界 |
| [event-commands.md](../event-commands.md) | イベント 15 種（凍結） |
| [adr/](../adr/) | 設計判断記録 |
| [tasks/BOARD.md](../tasks/BOARD.md) | タスク進捗の単一情報源 |

## 運用・障害時

- [エージェント運用](agent-workflow.md) — サブエージェント・BOARD・フック
- [障害対応 runbook](../runbook.md) — CI 赤・GM 差分・フレーク
- [E2E レポート](../reports/E2E-coverage.md) — カバレッジ・更新手順

## パッケージ

| パッケージ | 責務 |
|-----------|------|
| `packages/shared` | Zod・戦闘ロジック・RNG（純粋関数のみ） |
| `packages/runtime` | Phaser 3・シーン・セーブ |
| `packages/editor` | React エディタ |
| `packages/editor-electron` | デスクトップラッパー |
| `packages/plugin-api` | 公開プラグイン API（フェーズ2） |

## エスカレーション（人間判断必須）

仕様矛盾・ゴールデンマスター更新・`schemaVersion` 繰り上げ・新規依存パッケージ・同一チケット 3 回差し戻し — 詳細は [conventions.md](conventions.md) と [runbook.md](../runbook.md)。
