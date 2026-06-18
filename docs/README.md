# ドキュメント一覧

SRPGツクールのドキュメントは、**作成者**（ゲームを作る人）と**開発者**（本リポジトリに貢献する人）に分かれています。

## 作成者向け（SRPG 制作）

| ドキュメント | 内容 |
|-------------|------|
| [user/README.md](user/README.md) | 作成者向けドキュメントの入口 |
| [はじめに](user/getting-started.md) | インストール・起動・最初の一章 |
| [制作の流れ](user/workflow.md) | 企画から書き出しまでの典型手順 |
| [エディタリファレンス](user/editor-reference.md) | タブ・ショートカット・各画面 |
| [プロジェクトデータ](user/project-format.md) | フォルダ形式・保存・バックアップ |
| [イベントと章](user/events-and-chapters.md) | イベント・章・拠点の考え方 |
| [素材](user/assets.md) | 画像・BGM・SE の追加 |
| [テストプレイ](user/test-play.md) | エディタ内プレイ・デバッグ |
| [書き出しと配布](user/export-and-publish.md) | HTML5 / Electron / モバイル |

参照: [イベントコマンド15種](event-commands.md)（凍結仕様）

## 開発者向け（コントリビュータ）

| ドキュメント | 内容 |
|-------------|------|
| [contributor/README.md](contributor/README.md) | 開発者向けドキュメントの入口 |
| [環境構築](contributor/setup.md) | Node / pnpm / 起動コマンド |
| [アーキテクチャ](contributor/architecture.md) | パッケージ責務・設計原則 |
| [テスト](contributor/testing.md) | 単体・ゴールデン・E2E |
| [規約と完了条件](contributor/conventions.md) | 決定論・スキーマ・DoD |
| [エージェント運用](contributor/agent-workflow.md) | サブエージェント・BOARD・フック |
| [障害対応](runbook.md) | CI 赤・GM 差分・フレーク |

参照: [仕様書](spec.md) · [ADR](adr/) · [タスクボード](tasks/BOARD.md) · [E2E レポート](reports/E2E-coverage.md)

## 受け入れレポート（マイルストーン）

`docs/reports/` に M4〜M8 などの受け入れ照合メモがあります。日常の操作手順には [user/](user/) / [contributor/](contributor/) を優先してください。
