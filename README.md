# SRPGツクール

ファイアーエムブレム／タクティクスオウガ系の**グリッド・ターン制シミュレーションRPG**を、GUI だけで制作・配布できるオーサリングツールです。

- **エディタ** — マップ・データベース・イベントを編集し、テストプレイで即確認
- **ランタイム** — 書き出した成果物を PC・ブラウザ・（将来）モバイルでプレイ

プログラミング不要で一通りの制作ができます。上級者向けにプラグイン API（フェーズ2）も用意しています。

## ドキュメント

| 読者 | 内容 |
|------|------|
| **[作成者向け](docs/user/README.md)** | エディタの使い方、プロジェクトの保存、書き出し、テストプレイ |
| **[開発者向け](docs/contributor/README.md)** | 環境構築、パッケージ構成、テスト、エージェント運用、障害対応 |
| **[仕様書](docs/spec.md)** | 要件・データ形式・アーキテクチャの正（v0.2） |

詳細な目次は [docs/README.md](docs/README.md) を参照してください。

## クイックスタート（作成者）

```bash
pnpm install
pnpm dev:editor          # ブラウザでエディタ（http://localhost:5173）
# または
pnpm dev:editor:electron # デスクトップ版（要別途 Vite 起動）
```

エディタで「新規（サンプル）」→ マップ編集 → **Ctrl+4** テストプレイ、の流れから始められます。手順の詳細は [はじめに](docs/user/getting-started.md) を参照してください。

## クイックスタート（開発者）

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm test:golden
pnpm exec playwright install chromium   # 初回のみ
pnpm test:e2e
```

規約・パッケージ境界は [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) を正とします。

## リポジトリ構成（概要）

```
packages/
  shared/    … スキーマ・戦闘ロジック（純粋関数）
  runtime/   … Phaser 3 ゲームエンジン
  editor/    … React エディタ
  editor-electron/ … デスクトップラッパー
docs/        … 作成者・開発者向けドキュメント
e2e/         … Playwright E2E・ゴールデンマスター
```

## ライセンス・素材

同梱サンプル素材の利用条件は `templates/sample/assets/` 内の README を参照してください。
