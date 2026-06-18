# 規約と完了条件

[AGENTS.md](../../AGENTS.md) / [CLAUDE.md](../../CLAUDE.md) の要約です。矛盾時はそちらを正とします。

## 絶対規約（マージ不可違反）

### 1. 決定論

- `Math.random()` / `Date.now()` / `crypto.randomUUID()` の直接使用禁止（lint）
- 乱数は `shared/src/rng.ts` のシード付き RNG を注入
- 同一シード + 同一入力 → 戦闘結果が完全再現

### 2. 純粋関数境界

- `packages/shared` は DOM / Phaser / Node API / React 非依存
- 戦闘・移動範囲・敵 AI は `(state, action, rng) => newState`

### 3. スキーマ駆動

変更順序:

1. Zod スキーマ（`shared/src/schemas/`）
2. 型確認
3. マイグレーション（破壊的変更時は `schemaVersion` インクリメント）
4. 実装
5. テスト

### 4. テスト必須

- 新規実装にはテストを伴う
- 戦闘ロジック変更時は `pnpm test:golden` 全件グリーン
- ゴールデン更新は PR 説明に理由を明記

### 5. タスク完結性

- 1 タスクは原則 1 パッケージ内
- 横断変更はスキーマタスクを先行

## Definition of Done

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:golden
```

UI 触った場合は `pnpm test:e2e` も必須。

## 書換禁止パス

- `docs/spec.md` — 変更は提案として人間へ
- `docs/CLAUDE.md` 相当のフック保護対象

## 機械的強制（フック）

`.claude/settings.json` + `.claude/hooks/`:

- `e2e/golden/` 書込は `.allow-golden-update` なしではブロック
- 破壊的 Bash のブロック
- TS 編集後の決定論・shared 境界の即時 Grep 警告

## エスカレーション（独断禁止）

人間の判断が必要:

- 仕様の矛盾・解釈割れ
- ゴールデンマスター更新の承認
- `schemaVersion` 繰り上げ
- 新規依存パッケージ追加
- 同一チケットでの 3 回差し戻し

## コミット・PR

- コミットメッセージは変更の「why」を簡潔に
- CI 赤のままマージしない（[runbook.md](../runbook.md)）
- 意図したスクショ / GM 更新は PR 本文に理由

## 参照

- [spec.md](../spec.md) 4 章 — エージェント開発要件
- [adr/0002-determinism.md](../adr/0002-determinism.md)
- [event-commands.md](../event-commands.md) — MVP 15 種凍結
