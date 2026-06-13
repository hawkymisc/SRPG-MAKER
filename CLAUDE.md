# SRPGツクール — プロジェクトメモリ

このリポジトリはシミュレーションRPG制作ツール(エディタ+ランタイム)である。
詳細仕様は `docs/spec.md`(仕様書v0.2)、設計判断は `docs/adr/` を参照すること。

## 絶対規約(全エージェント共通・違反コードはマージ不可)

1. **決定論の徹底**
   - `Math.random()` / `Date.now()` / `crypto.randomUUID()` の直接使用は禁止(lintで強制)。
   - 乱数は必ず `shared/src/rng.ts` のシード付きRNGを注入して使う。
   - 同一シード+同一入力列から、戦闘結果が完全に再現できなければならない。

2. **純粋関数境界**
   - `packages/shared` は DOM / Phaser / Node API / React への依存禁止(lintで強制)。
   - 戦闘解決・移動範囲計算・敵AI思考はすべて `(state, action, rng) => newState` 形式の純粋関数。
   - 描画・入出力・音声は `runtime` / `editor` にのみ置く。

3. **スキーマ駆動**
   - データ構造の変更は必ず Zodスキーマ(`shared/src/schemas/`)の変更から始める。
   - 順序:スキーマ変更 → 型生成確認 → マイグレーション関数追加 → 実装 → テスト。
   - `schemaVersion` を破壊的変更時に必ずインクリメントし、旧版からのマイグレーションを書く。

4. **テスト必須**
   - すべてのタスクは新規テストを伴う。テストのないPRは不完全とみなす。
   - 戦闘ロジックの変更時はゴールデンマスター(`e2e/golden/`)を全件パスさせること。
     意図的な仕様変更でスナップショットを更新する場合は、PR説明に理由を明記する。

5. **タスク完結性**
   - 1タスクは原則1パッケージ内で完結させる。パッケージ横断が必要な場合は
     スキーマ変更タスクを先行させ、別タスクに分ける。

## コマンド

```bash
pnpm install              # 依存解決
pnpm typecheck            # 全パッケージ型検査
pnpm lint                 # ESLint(決定論・純粋関数境界ルール含む)
pnpm test                 # Vitest 単体テスト
pnpm test:golden          # ゴールデンマスター(戦闘リプレイ照合)
pnpm test:e2e             # Playwright(エディタ一気通貫+スクショ回帰)
pnpm dev:editor           # エディタ起動
pnpm build                # 全パッケージビルド
```

**完了の定義(Definition of Done):** 上記 typecheck / lint / test / test:golden がすべてグリーンであること。UIに触れた場合は test:e2e も必須。

## パッケージ構成

| パッケージ | 責務 | 依存可能先 |
|---|---|---|
| `packages/shared` | Zodスキーマ・戦闘ロジック・AI思考・RNG(純粋関数のみ) | なし |
| `packages/runtime` | Phaser 3 ゲームエンジン、シーン管理、セーブ | shared |
| `packages/editor` | React エディタアプリ | shared, runtime |
| `packages/plugin-api` | 公開プラグインAPI(フェーズ2) | shared |

## 設計上の重要事実

- ゲームエンジンは **Phaser 3**、エディタは **React 18 + Zustand**、デスクトップは **Electron**。
- 戦闘計算式の既定値と勝敗条件の種類は `docs/spec.md` 5.2 を正とする。
- イベントシステムはJSONコマンド配列のインタプリタ(async generator)。MVPのコマンドは15種に固定。
- プロジェクトデータはGit管理可能なJSONフォルダ形式(`docs/spec.md` 7章)。

## エージェント運用

- 実装は役割別サブエージェント(`.claude/agents/`)に委任する。
- 設計判断が発生したら ADR(`docs/adr/NNNN-title.md`)を必ず残す。
- 仕様書と実装が矛盾した場合は、勝手に解釈せず人間にエスカレーションする。

## 機械的強制(フック)

規約の一部はプロンプトではなくフック(`.claude/settings.json` + `.claude/hooks/`)で強制されており、サブエージェントの操作にも適用される:
- `e2e/golden/` への書込は、人間が `.allow-golden-update` を作成しない限りブロックされる(作業後は削除。CIが混入を検査)
- `docs/spec.md` と `CLAUDE.md` はエージェント書換禁止(変更は提案として報告)
- 破壊的Bash(rm -rf / force push / reset --hard)はブロック
- TS編集直後に決定論違反・shared依存境界違反をGrepで即時警告

ブロックされたら回避策を探さず、メッセージの指示に従うこと。

## エスカレーション規約(独断禁止)

以下は必ず人間の判断を仰ぐ:仕様の矛盾・解釈割れ / ゴールデンマスター更新 / schemaVersion繰り上げ / 新規依存パッケージ追加 / 同一チケットで差し戻し3回。

## 参照ドキュメント

- 仕様書: `docs/spec.md`(正)
- イベントコマンド確定仕様(15種で凍結): `docs/event-commands.md`
- タスクボード(進捗の単一情報源): `docs/tasks/BOARD.md`
- 設計判断: `docs/adr/`
