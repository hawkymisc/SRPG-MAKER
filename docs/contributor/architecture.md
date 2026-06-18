# アーキテクチャ

## 2 層構成

```
┌──────────── Editor (React + Zustand) ────────────┐
│ マップ / DB / イベント / 素材 / 書き出し           │
└──────────────────┬───────────────────────────────┘
                   │ プロジェクト JSON
┌──────────────────▼───────────────────────────────┐
│ Runtime (Phaser 3)                                │
│  SceneManager · BattleSystem · Save · Audio       │
│       ↑ shared/battle-logic（純粋関数）            │
└──────────────────────────────────────────────────┘
```

エディタは **制作と検証**、ランタイムは **プレイ体験** を担当します。戦闘の正しい結果は `shared` の純粋関数が決定し、ランタイムはそれを描画・入力に反映します。

## パッケージ責務

| パッケージ | 置いてよいもの | 置いてはいけないもの |
|-----------|----------------|---------------------|
| `shared` | Zod スキーマ、戦闘解決、AI、RNG | DOM、Phaser、React、Node API |
| `runtime` | Phaser シーン、描画、入力、音声、セーブ I/O | 戦闘式の独自実装（shared 経由） |
| `editor` | React UI、プロジェクト状態、書き出し | 戦闘ロジックの重複実装 |
| `editor-electron` | ネイティブ FS、デスクトップシェル | ゲームロジック |
| `plugin-api` | 拡張用の安定 API 面 | 内部実装の漏洩 |

## データフロー

1. エディタが Zod で検証した JSON をプロジェクト状態として保持
2. テストプレイ / 書き出し時にランタイムへ渡す
3. ランタイムがイベントインタプリタ（async generator）でコマンド実行
4. 戦闘は `(state, action, rng) => newState` で進行

## 決定論（ADR-0002）

同一シード + 同一入力列 → 戦闘結果が完全再現。これにより `e2e/golden/` のゴールデンマスターテストが可能です。

## イベントシステム

- コマンド定義: `shared/src/schemas/event.ts`
- 条件評価・変数: `shared` の純粋関数
- 表示・演出: `runtime` のインタプリタ

15 コマンドは [event-commands.md](../event-commands.md) で凍結。

## 書き出し

- `editor/src/lib/export/` — HTML5 / Electron / Capacitor zip 生成
- `splitProject` / `mergeSplitProject` — フォルダ形式との相互変換
- ランタイムは Vite ビルド成果物を `game/` に同梱

## テストの層

| 層 | 場所 | 目的 |
|----|------|------|
| 単体 | 各パッケージ `test/` | 関数・コンポーネント |
| ゴールデン | `e2e/golden/` | 戦闘リプレイ決定論 |
| E2E | `e2e/*.spec.ts` | エディタ一気通貫・ランタイム・書き出し |
| スクショ | Playwright snapshot | 描画回帰（エージェントの目視代替） |

詳細: [testing.md](testing.md)

## 設計判断

技術スタック・Electron 採用・決定論などは [docs/adr/](../adr/) に記録します。仕様との矛盾は [spec.md](../spec.md) を正とし、解釈割れは人間にエスカレーションします。

## ディレクトリ（開発者向け抜粋）

```
packages/shared/src/schemas/   # Zod（変更の起点）
packages/shared/src/battle/    # 戦闘純粋関数
packages/runtime/src/scenes/   # Phaser シーン
packages/editor/src/components/ # エディタタブ
e2e/                           # Playwright + golden harness
.claude/agents/                # サブエージェント定義
docs/adr/                      # ADR
```
